//! Native PTYs with an exclusive input lease. Closing a browser never kills a CLI.
use crate::{ApiResult, App, error, model::*, notify, store::Store};
use axum::{
    Json,
    extract::{
        Path, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    http::StatusCode,
    response::Response,
};
use base64::{Engine as _, engine::general_purpose::STANDARD};
use futures_util::{SinkExt, StreamExt};
use portable_pty::{ChildKiller, CommandBuilder, MasterPty, PtySize};
use serde_json::{Value, json};
use std::os::unix::process::CommandExt;
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, AtomicU64, Ordering},
    },
    time::Duration,
};
use tokio::sync::{Mutex as AsyncMutex, broadcast, oneshot};

pub struct Manager {
    entries: AsyncMutex<HashMap<String, Arc<Native>>>,
    answers: AsyncMutex<HashMap<String, oneshot::Sender<Value>>>,
}
impl Manager {
    pub fn new() -> Self {
        Self {
            entries: AsyncMutex::new(HashMap::new()),
            answers: AsyncMutex::new(HashMap::new()),
        }
    }
}
struct Native {
    master: Mutex<Box<dyn MasterPty + Send>>,
    writer: Mutex<Box<dyn Write + Send>>,
    killer: Mutex<Box<dyn ChildKiller + Send + Sync>>,
    parser: Mutex<vt100::Parser>,
    output: broadcast::Sender<Value>,
    sequence: AtomicU64,
    exited: AtomicBool,
    busy: AtomicBool,
    controller: Mutex<Option<String>>,
    cancel: tokio::sync::watch::Sender<bool>,
    process: String,
    pid: Option<u32>,
}
pub fn migrate(s: &Store) -> rusqlite::Result<()> {
    s.conn.execute_batch("CREATE TABLE IF NOT EXISTS runtime_modes(session_id TEXT PRIMARY KEY, mode TEXT NOT NULL); CREATE TABLE IF NOT EXISTS terminal_turns(delivery_id TEXT PRIMARY KEY, params TEXT NOT NULL); CREATE TABLE IF NOT EXISTS terminal_requests(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, process TEXT NOT NULL, state TEXT NOT NULL, data TEXT NOT NULL); UPDATE terminal_requests SET state='expired' WHERE state IN ('pending','answering');")
}
pub fn owned(s: &Store, id: &str) -> bool {
    s.conn
        .query_row(
            "SELECT mode='terminal' FROM runtime_modes WHERE session_id=?",
            [id],
            |r| r.get(0),
        )
        .unwrap_or(false)
}
fn busy(a: &App, id: &str) -> bool {
    a.store.lock().unwrap().deliveries().iter().any(|d| {
        d.draft.session_id.as_deref() == Some(id)
            && (d.status == "dispatching"
                || matches!(
                    d.execution.as_str(),
                    "running" | "waiting_input" | "waiting_approval"
                ))
    })
}
pub async fn get(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    let entries = a.terminals.entries.lock().await;
    let mode = owned(&a.store.lock().unwrap(), &id);
    Ok(Json(
        json!({"mode":if mode {"terminal"}else{"automatic"}, "running":entries.get(&id).is_some_and(|n| !n.exited.load(Ordering::Acquire)), "control":entries.get(&id).and_then(|n|n.controller.lock().unwrap().clone()).is_some()}),
    ))
}
pub async fn action(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> ApiResult {
    if a.store.lock().unwrap().session(&id).is_none() {
        return Err(error(StatusCode::NOT_FOUND, "Session not found."));
    }
    match v["action"].as_str().unwrap_or("") {
        "open" => {
            open(&a, &id).await?;
        }
        "stop" | "release" => {
            let entries = a.terminals.entries.lock().await;
            if let Some(n) = entries.get(&id) {
                if v["action"] == "release" && (busy(&a, &id) || n.busy.load(Ordering::Acquire)) {
                    return Err(error(
                        StatusCode::CONFLICT,
                        "Stop the active turn in the native terminal before returning to automatic sending.",
                    ));
                }
                if !n.exited.load(Ordering::Acquire) {
                    *n.controller.lock().unwrap() = None;
                    terminate_group(n.pid).await;
                    n.killer.lock().unwrap().kill().map_err(|_| {
                        error(
                            StatusCode::SERVICE_UNAVAILABLE,
                            "Could not stop the native process.",
                        )
                    })?;
                }
                let _ = n.cancel.send(true);
                // Wait for the actual PTY child to exit before restoring dispatcher authority.
                for _ in 0..50 {
                    if n.exited.load(Ordering::Acquire) {
                        break;
                    }
                    tokio::time::sleep(Duration::from_millis(20)).await;
                }
                if !n.exited.load(Ordering::Acquire) {
                    return Err(error(
                        StatusCode::CONFLICT,
                        "The process is still stopping. Automatic sending remains paused.",
                    ));
                }
            }
            if v["action"] == "release" {
                a.store.lock().unwrap().conn.execute("INSERT INTO runtime_modes VALUES(?,'automatic') ON CONFLICT(session_id) DO UPDATE SET mode='automatic'", [&id]).map_err(|_|error(StatusCode::INTERNAL_SERVER_ERROR,"Could not save the sending mode."))?;
            }
            drop(entries);
            notify(&a);
        }
        _ => return Err(error(StatusCode::BAD_REQUEST, "Unknown terminal action.")),
    }
    get(State(a), Path(id)).await
}
async fn open(a: &App, id: &str) -> Result<(), (StatusCode, Json<Value>)> {
    let mut entries = a.terminals.entries.lock().await;
    if entries
        .get(id)
        .is_some_and(|n| !n.exited.load(Ordering::Acquire))
    {
        return Ok(());
    }
    let session = {
        let s = a.store.lock().unwrap();
        let session = s
            .session(id)
            .ok_or(error(StatusCode::NOT_FOUND, "Session not found."))?;
        if !crate::discovery::installed(&session.tool) {
            return Err(error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "This native CLI is not installed.",
            ));
        }
        if !std::path::Path::new(&session.cwd).is_dir() {
            return Err(error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "The recorded working folder is unavailable.",
            ));
        }
        if s.deliveries().iter().any(|d| {
            d.draft.session_id.as_deref() == Some(id)
                && (d.status == "dispatching"
                    || matches!(
                        d.execution.as_str(),
                        "running" | "waiting_approval" | "waiting_input"
                    ))
        }) {
            return Err(error(
                StatusCode::CONFLICT,
                "Wait for the current graphical turn to finish before opening the terminal.",
            ));
        }
        // Same mutex as dispatcher claims: no graphical send can race terminal ownership.
        s.conn.execute("INSERT INTO runtime_modes VALUES(?,'terminal') ON CONFLICT(session_id) DO UPDATE SET mode='terminal'", [id]).map_err(|_|error(StatusCode::INTERNAL_SERVER_ERROR,"Could not save terminal ownership."))?;
        session
    };
    let (cancel, _) = tokio::sync::watch::channel(false);
    let process = uuid::Uuid::new_v4().to_string();
    let mut command = if std::env::var("RELAI_DISCOVERY_ISOLATED").as_deref() == Ok("1")
        && std::env::var_os("RELAI_TERMINAL_TEST_COMMAND").is_some()
    {
        CommandBuilder::new(std::env::var_os("RELAI_TERMINAL_TEST_COMMAND").unwrap())
    } else {
        match session.tool.as_str() {
            "Codex" => {
                let c = crate::runtime::client(a, &session.store)
                    .await
                    .map_err(|e| error(StatusCode::SERVICE_UNAVAILABLE, &e.message))?;
                let path = codex_bridge(a.clone(), session.clone(), c, cancel.subscribe()).await?;
                let mut command = CommandBuilder::new(
                    std::env::var("RELAI_CODEX_BIN").unwrap_or_else(|_| "codex".into()),
                );
                command.args([
                    "resume",
                    "--remote",
                    &format!("unix://{}", path.display()),
                    &session.native_id,
                ]);
                command.env("CODEX_HOME", &session.store);
                command
            }
            "Claude Code" => {
                let (path, token) = hooks(
                    a.clone(),
                    session.clone(),
                    process.clone(),
                    cancel.subscribe(),
                )
                .await?;
                let exe = std::env::current_exe().map_err(|_| {
                    error(
                        StatusCode::SERVICE_UNAVAILABLE,
                        "Hook executable unavailable.",
                    )
                })?;
                let hook = format!(
                    "'{}' native-hook",
                    exe.display().to_string().replace('\'', "'\\''")
                );
                let mut h = serde_json::Map::new();
                for event in [
                    "PermissionRequest",
                    "UserPromptSubmit",
                    "Stop",
                    "StopFailure",
                ] {
                    h.insert(
                        event.into(),
                        json!([{"hooks":[{"type":"command","command":hook,"timeout":300}]}]),
                    );
                }
                let mut command = CommandBuilder::new("claude");
                command.args([
                    "--resume",
                    &session.native_id,
                    "--settings",
                    &json!({"hooks":h}).to_string(),
                ]);
                command.env("CLAUDE_CONFIG_DIR", &session.store);
                command.env("RELAI_HOOK_SOCKET", path);
                command.env("RELAI_HOOK_TOKEN", token);
                command
            }
            "OpenCode" => {
                let (url, password) = opencode(
                    a.clone(),
                    session.clone(),
                    process.clone(),
                    cancel.subscribe(),
                )
                .await?;
                let mut command = CommandBuilder::new("opencode");
                command.args([
                    "attach",
                    &url,
                    "--session",
                    &session.native_id,
                    "--dir",
                    &session.cwd,
                ]);
                command.env("OPENCODE_SERVER_PASSWORD", password);
                command
            }
            "Pi" => {
                let mut command = CommandBuilder::new("pi");
                command.args(["--session", &session.native_path]);
                command
            }
            _ => {
                return Err(error(
                    StatusCode::UNPROCESSABLE_ENTITY,
                    "This CLI has no terminal adapter.",
                ));
            }
        }
    };
    command.cwd(&session.cwd);
    command.env("TERM", "xterm-256color");
    command.env("COLORTERM", "truecolor");
    let pair = portable_pty::native_pty_system()
        .openpty(PtySize {
            rows: 30,
            cols: 100,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|_| error(StatusCode::SERVICE_UNAVAILABLE, "Could not allocate a PTY."))?;
    let mut child = pair.slave.spawn_command(command).map_err(|_| {
        error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Could not start the native CLI. Automatic sending remains paused.",
        )
    })?;
    drop(pair.slave);
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|_| error(StatusCode::SERVICE_UNAVAILABLE, "Could not read the PTY."))?;
    let writer = pair.master.take_writer().map_err(|_| {
        error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Could not write to the PTY.",
        )
    })?;
    let (output, _) = broadcast::channel(128);
    let native = Arc::new(Native {
        master: Mutex::new(pair.master),
        writer: Mutex::new(writer),
        killer: Mutex::new(child.clone_killer()),
        parser: Mutex::new(vt100::Parser::new(30, 100, 3000)),
        output,
        sequence: AtomicU64::new(0),
        exited: AtomicBool::new(false),
        busy: AtomicBool::new(false),
        controller: Mutex::new(None),
        cancel,
        process,
        pid: child.process_id(),
    });
    let n = native.clone();
    std::thread::spawn(move || {
        let mut bytes = [0u8; 16384];
        while let Ok(count) = reader.read(&mut bytes) {
            if count == 0 {
                break;
            }
            let mut parser = n.parser.lock().unwrap();
            parser.process(&bytes[..count]);
            let sequence = n.sequence.fetch_add(1, Ordering::AcqRel) + 1;
            let _=n.output.send(json!({"type":"output","sequence":sequence,"data":STANDARD.encode(&bytes[..count])}));
        }
    });
    let n = native.clone();
    let app = a.clone();
    let sid = id.to_owned();
    std::thread::spawn(move || {
        let _ = child.wait();
        n.exited.store(true, Ordering::Release);
        n.busy.store(false, Ordering::Release);
        let _ = n.cancel.send(true);
        let _ = n
            .output
            .send(json!({"type":"state","exited":true,"control":false}));
        let _=app.store.lock().unwrap().conn.execute("UPDATE terminal_requests SET state='expired' WHERE process=? AND state IN ('pending','answering')",[&n.process]);
        let _ = app
            .events
            .send(json!({"kind":"runtime","sessionId":sid}).to_string());
    });
    entries.insert(id.into(), native);
    drop(entries);
    notify(a);
    Ok(())
}
pub async fn stream(
    State(a): State<App>,
    Path(id): Path<String>,
    ws: WebSocketUpgrade,
) -> Result<Response, (StatusCode, Json<Value>)> {
    let n = a
        .terminals
        .entries
        .lock()
        .await
        .get(&id)
        .cloned()
        .ok_or(error(StatusCode::NOT_FOUND, "Open this terminal first."))?;
    Ok(ws
        .max_message_size(65536)
        .on_upgrade(move |socket| connection(socket, n)))
}
async fn connection(socket: WebSocket, n: Arc<Native>) {
    let client = uuid::Uuid::new_v4().to_string();
    {
        let mut control = n.controller.lock().unwrap();
        if control.is_none() && !n.exited.load(Ordering::Acquire) {
            *control = Some(client.clone());
        }
    }
    let (mut sink, mut source) = socket.split();
    let mut output = n.output.subscribe();
    let snapshot = {
        let parser = n.parser.lock().unwrap();
        json!({"type":"snapshot","sequence":n.sequence.load(Ordering::Acquire),"data":STANDARD.encode(parser.screen().state_formatted())})
    };
    if sink
        .send(Message::Text(snapshot.to_string().into()))
        .await
        .is_err()
    {
        release_lease(&n, &client);
        return;
    }
    let state = |n: &Native| json!({"type":"state","exited":n.exited.load(Ordering::Acquire),"control":n.controller.lock().unwrap().as_ref()==Some(&client)});
    let _ = sink.send(Message::Text(state(&n).to_string().into())).await;
    let mut ack = snapshot["sequence"].as_u64().unwrap_or(0);
    let mut last = ack;
    let mut tick = tokio::time::interval(Duration::from_secs(1));
    loop {
        tokio::select! {
            message=source.next()=>{let Some(Ok(Message::Text(text)))=message else{break};let Ok(v)=serde_json::from_str::<Value>(&text)else{continue};match v["type"].as_str(){
                Some("claim")=>{if !n.exited.load(Ordering::Acquire){*n.controller.lock().unwrap()=Some(client.clone());}let _=sink.send(Message::Text(state(&n).to_string().into())).await;},
                Some("ack")=>{ack=ack.max(v["sequence"].as_u64().unwrap_or(ack).min(last));},
                Some("input")=>{if n.controller.lock().unwrap().as_ref()==Some(&client)&&!n.exited.load(Ordering::Acquire){if let Some(data)=v["data"].as_str(){let _=n.writer.lock().unwrap().write_all(data.as_bytes());}}},
                Some("binary")=>{if n.controller.lock().unwrap().as_ref()==Some(&client)&&!n.exited.load(Ordering::Acquire){if let Some(data)=v["data"].as_str().and_then(|v|STANDARD.decode(v).ok()){let _=n.writer.lock().unwrap().write_all(&data);}}},
                Some("resize")=>{if n.controller.lock().unwrap().as_ref()==Some(&client){let rows=v["rows"].as_u64().unwrap_or(30).clamp(5,120)as u16;let cols=v["cols"].as_u64().unwrap_or(100).clamp(20,300)as u16;let _=n.master.lock().unwrap().resize(PtySize{rows,cols,pixel_width:0,pixel_height:0});n.parser.lock().unwrap().screen_mut().set_size(rows,cols);}},_=>{}
            }},
            message=output.recv(),if last.saturating_sub(ack)<64=>{let Ok(v)=message else{let _=sink.send(Message::Text(json!({"type":"error","message":"Output exceeded this connection's buffer. Reconnect to restore the current screen."}).to_string().into())).await;break};if let Some(seq)=v["sequence"].as_u64(){if seq<=last{continue;}last=seq;}let value=if v["type"]=="state"{state(&n)}else{v};if sink.send(Message::Text(value.to_string().into())).await.is_err(){break;}},
            _=tick.tick()=>{if sink.send(Message::Text(state(&n).to_string().into())).await.is_err(){break;}}
        }
    }
    release_lease(&n, &client);
}
fn release_lease(n: &Native, client: &str) {
    let mut control = n.controller.lock().unwrap();
    if control.as_deref() == Some(client) {
        *control = None;
    }
}

async fn private_socket()
-> Result<(std::path::PathBuf, tokio::net::UnixListener), (StatusCode, Json<Value>)> {
    use std::os::unix::fs::PermissionsExt;
    let dir = std::env::temp_dir().join(format!("relai-{}", uuid::Uuid::new_v4().simple()));
    std::fs::create_dir(&dir).map_err(|_| {
        error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Could not create private terminal transport.",
        )
    })?;
    std::fs::set_permissions(&dir, std::fs::Permissions::from_mode(0o700)).map_err(|_| {
        error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Could not secure terminal transport.",
        )
    })?;
    let path = dir.join("native.sock");
    let listener = tokio::net::UnixListener::bind(&path).map_err(|_| {
        error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Could not listen on native transport.",
        )
    })?;
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o600)).map_err(|_| {
        error(
            StatusCode::SERVICE_UNAVAILABLE,
            "Could not secure native socket.",
        )
    })?;
    Ok((path, listener))
}
async fn codex_bridge(
    a: App,
    s: Session,
    c: crate::runtime::Client,
    mut cancel: tokio::sync::watch::Receiver<bool>,
) -> Result<std::path::PathBuf, (StatusCode, Json<Value>)> {
    let (path, listener) = private_socket().await?;
    let cleanup = path.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {
                _=cancel.changed()=>break,
                stream=listener.accept()=>{let Ok((stream,_))=stream else{break};let app=a.clone();let session=s.clone();let client=c.clone();let done=cancel.clone();tokio::spawn(async move{proxy(stream,app,session,client,done).await;});}
            }
        }
        let _ = std::fs::remove_file(&cleanup);
        if let Some(dir) = cleanup.parent() {
            let _ = std::fs::remove_dir(dir);
        }
    });
    Ok(path)
}
async fn proxy(
    stream: tokio::net::UnixStream,
    a: App,
    s: Session,
    c: crate::runtime::Client,
    mut cancel: tokio::sync::watch::Receiver<bool>,
) {
    let Ok(ws) = tokio_tungstenite::accept_async(stream).await else {
        return;
    };
    let (mut sink, mut source) = ws.split();
    let mut events = c.events.subscribe();
    let (reply_tx, mut replies) = tokio::sync::mpsc::channel::<Value>(64);
    loop {
        tokio::select! {
            _=cancel.changed()=>break,
            event=events.recv()=>{let Ok(v)=event else{break};let thread=v["params"]["threadId"].as_str().or_else(||v["params"]["thread"]["id"].as_str());if thread.is_some_and(|id|id!=s.native_id){continue;}if sink.send(tokio_tungstenite::tungstenite::Message::Text(v.to_string().into())).await.is_err(){break;}},
            reply=replies.recv()=>{let Some(v)=reply else{break};if sink.send(tokio_tungstenite::tungstenite::Message::Text(v.to_string().into())).await.is_err(){break;}},
            message=source.next()=>{let Some(Ok(tokio_tungstenite::tungstenite::Message::Text(text)))=message else{break};let Ok(v)=serde_json::from_str::<Value>(&text)else{continue};
                let Some(method)=v["method"].as_str()else{if v.get("result").is_some(){let won={let store=a.store.lock().unwrap();store.conn.execute("UPDATE requests SET state='answering' WHERE process=? AND CAST(json_extract(data,'$.nativeId') AS TEXT)=? AND state='pending'",rusqlite::params![c.process,v["id"].to_string().trim_matches('"')]).unwrap_or(0)>0};if won{let _=c.respond(v["id"].clone(),v["result"].clone()).await;}}continue;};
                if method=="initialized"{continue;}
                let id=v["id"].clone();let params=v["params"].clone();let client=c.clone();let app=a.clone();let session=s.clone();let tx=reply_tx.clone();let method=method.to_owned();
                tokio::spawn(async move{let result=if method=="initialize"{Ok(client.initialize.clone())}else if method=="thread/start"||method=="thread/fork"||params["threadId"].as_str().is_some_and(|id|id!=session.native_id){Err(crate::runtime::RpcError{message:"This terminal is bound to its original chat. Open another chat in Relai to change sessions.".into(),definite:true})}else if method=="turn/start"{native_turn(&app,&session,&client,params).await}else{client.rpc(&method,params).await};let response=match result{Ok(result)=>json!({"id":id,"result":result}),Err(e)=>json!({"id":id,"error":{"code":-32000,"message":e.message}})};let _=tx.send(response).await;});
            }
        }
    }
}
async fn native_turn(
    a: &App,
    s: &Session,
    c: &crate::runtime::Client,
    params: Value,
) -> Result<Value, crate::runtime::RpcError> {
    let failure = |message: &str| crate::runtime::RpcError {
        message: message.into(),
        definite: true,
    };
    if params["threadId"].as_str() != Some(&s.native_id) {
        return Err(failure("Native chat identity mismatch."));
    }
    let mut draft = Draft::empty();
    draft.session_id = Some(s.id.clone());
    draft.tool = s.tool.clone();
    draft.source = s.store.clone();
    draft.cwd = s.cwd.clone();
    draft.title = s.title.clone();
    draft.markdown = params["input"]
        .as_array()
        .map(|items| {
            items
                .iter()
                .filter_map(|v| v["text"].as_str())
                .collect::<Vec<_>>()
                .join("\n")
        })
        .unwrap_or_default();
    let d = Delivery {
        id: uuid::Uuid::new_v4().to_string(),
        draft,
        key: format!("terminal:{}", uuid::Uuid::new_v4()),
        source: s.store.clone(),
        status: "dispatching".into(),
        execution: "unknown".into(),
        stage: "starting_turn".into(),
        revision: 1,
        created: now(),
        modified: now(),
        due_at: None,
        submitted_due_at: None,
        queued_at: None,
        timezone: "UTC".into(),
        native_thread_id: s.native_id.clone(),
        native_turn_id: String::new(),
        accepted_at: None,
        error: String::new(),
        attempt: 1,
        baseline: 0,
    };
    crate::runtime::save_history(a, &d, &Value::Null)?;
    {
        let store = a.store.lock().unwrap();
        if !owned(&store, &s.id)
            || store.deliveries().iter().any(|old| {
                old.draft.session_id.as_deref() == Some(&s.id)
                    && (old.status == "dispatching"
                        || matches!(
                            old.execution.as_str(),
                            "running" | "waiting_input" | "waiting_approval"
                        ))
            })
        {
            return Err(failure(
                "This chat is busy or automatic sending has resumed.",
            ));
        }
        let transaction = store
            .conn
            .unchecked_transaction()
            .map_err(|_| failure("Could not begin the native send transaction."))?;
        transaction.execute("INSERT INTO deliveries(id,key,draft_id,session_id,status,created,data) VALUES(?,?,?,?,?,?,?)",rusqlite::params![d.id,d.key,d.draft.id,s.id,d.status,d.created,serde_json::to_string(&d).unwrap()]).map_err(|_|failure("Could not persist the native send intent."))?;
        transaction
            .execute(
                "INSERT INTO terminal_turns VALUES(?,?)",
                rusqlite::params![d.id, params.to_string()],
            )
            .map_err(|_| failure("Could not preserve the native input."))?;
        transaction
            .commit()
            .map_err(|_| failure("Could not commit the native send intent."))?;
    }
    let result = c.rpc("turn/start", params).await;
    {
        let store = a.store.lock().unwrap();
        if let Some(mut current) = store.delivery(&d.id) {
            match &result {
                Ok(v) => {
                    current.native_turn_id = v["turn"]["id"].as_str().unwrap_or("").into();
                    current.status = "accepted".into();
                    current.stage = "accepted".into();
                    current.accepted_at.get_or_insert(now());
                    if current.execution == "unknown" {
                        current.execution = "running".into();
                    }
                }
                Err(e) => {
                    if current.accepted_at.is_none() {
                        current.status = if e.definite { "failed" } else { "uncertain" }.into();
                        current.error = e.message.clone();
                    }
                }
            }
            current.modified = now();
            current.revision += 1;
            let _ = store.write_delivery(&current);
        }
    }
    notify(a);
    result
}

async fn hooks(
    a: App,
    s: Session,
    process: String,
    mut cancel: tokio::sync::watch::Receiver<bool>,
) -> Result<(std::path::PathBuf, String), (StatusCode, Json<Value>)> {
    let (path, listener) = private_socket().await?;
    let token = uuid::Uuid::new_v4().to_string();
    let secret = token.clone();
    let cleanup = path.clone();
    tokio::spawn(async move {
        loop {
            tokio::select! {_=cancel.changed()=>break,stream=listener.accept()=>{let Ok((stream,_))=stream else{break};let app=a.clone();let session=s.clone();let generation=process.clone();let token=secret.clone();tokio::spawn(async move{hook_event(stream,app,session,generation,token).await;});}}
        }
        let _ = std::fs::remove_file(&cleanup);
        if let Some(dir) = cleanup.parent() {
            let _ = std::fs::remove_dir(dir);
        }
    });
    Ok((path, token))
}
async fn hook_event(
    mut stream: tokio::net::UnixStream,
    a: App,
    s: Session,
    process: String,
    token: String,
) {
    use tokio::io::{AsyncBufReadExt, AsyncReadExt, AsyncWriteExt, BufReader};
    let mut line = String::new();
    let mut read = BufReader::new((&mut stream).take(1024 * 1024)); // Hooks contain native metadata, never terminal ANSI.
    if tokio::time::timeout(Duration::from_secs(5), read.read_line(&mut line))
        .await
        .ok()
        .and_then(Result::ok)
        .is_none()
    {
        return;
    }
    let Ok(v) = serde_json::from_str::<Value>(&line) else {
        return;
    };
    if v["token"].as_str() != Some(&token) {
        return;
    }
    let p = &v["payload"];
    if p["session_id"].as_str() != Some(&s.native_id) {
        return;
    }
    let event = p["hook_event_name"].as_str().unwrap_or("");
    let n = a.terminals.entries.lock().await.get(&s.id).cloned();
    let Some(n) = n.filter(|n| n.process == process && !n.exited.load(Ordering::Acquire)) else {
        let _ = stream.write_all(b"{}\n").await;
        return;
    };
    let mut response = json!({});
    if event == "PermissionRequest" {
        let id = uuid::Uuid::new_v4().to_string();
        let data = json!({"id":id,"method":"native/permission","params":{"agent":s.tool,"tool":p["tool_name"],"input":p["tool_input"]}});
        let saved = {
            let store = a.store.lock().unwrap();
            store
                .conn
                .execute(
                    "INSERT INTO terminal_requests VALUES(?,?,?,'pending',?)",
                    rusqlite::params![id, s.id, process, data.to_string()],
                )
                .is_ok()
        };
        if saved {
            let (tx, rx) = oneshot::channel();
            a.terminals.answers.lock().await.insert(id.clone(), tx);
            let _ = a.store.lock().unwrap().receive(
                &format!("native-request:{id}"),
                &s.id,
                "Claude Code needs approval.",
                "request",
            );
            notify(&a);
            let mut cancelled = n.cancel.subscribe();
            let answer = tokio::select! {answer=tokio::time::timeout(Duration::from_secs(280),rx)=>answer.ok().and_then(Result::ok),_=cancelled.changed()=>None};
            if let Some(answer) = answer {
                response = json!({"hookSpecificOutput":{"hookEventName":"PermissionRequest","decision":{"behavior":if answer["decision"]=="accept"{"allow"}else{"deny"}}}});
            }
            a.terminals.answers.lock().await.remove(&id);
            let _=a.store.lock().unwrap().conn.execute("UPDATE terminal_requests SET state=CASE WHEN state='answering' THEN 'resolved' ELSE 'expired' END WHERE id=?",[&id]);
            notify(&a);
        }
    } else if event == "UserPromptSubmit" {
        n.busy.store(true, Ordering::Release);
    } else if event == "Stop" || event == "StopFailure" {
        n.busy.store(false, Ordering::Release);
        let text = p["last_assistant_message"]
            .as_str()
            .unwrap_or(if event == "StopFailure" {
                "The native agent stopped with an error."
            } else {
                "The native agent has replied."
            });
        let native_message = crate::discovery::messages(&s).ok().and_then(|rows| {
            rows.into_iter()
                .rev()
                .find(|m| m.role == "assistant" && !m.activity)
        });
        let identity = native_message
            .map(|m| m.id)
            .unwrap_or_else(|| format!("{process}:{event}:{text}"));
        let key = uuid::Uuid::new_v5(
            &uuid::Uuid::NAMESPACE_URL,
            format!("{}:{}:{}", s.id, event, identity).as_bytes(),
        )
        .to_string();
        let _ = a.store.lock().unwrap().receive(
            &format!("native:{key}"),
            &s.id,
            text,
            if event == "Stop" { "reply" } else { "error" },
        );
        notify(&a);
    }
    let _ = stream.write_all(format!("{response}\n").as_bytes()).await;
}
pub fn hook_command() {
    // stdout is a native protocol response. Errors fall back to the CLI's own prompt.
    let result = (|| -> std::io::Result<()> {
        let path = std::env::var("RELAI_HOOK_SOCKET").map_err(std::io::Error::other)?;
        let token = std::env::var("RELAI_HOOK_TOKEN").map_err(std::io::Error::other)?;
        let mut input = String::new();
        std::io::stdin()
            .take(1024 * 1024)
            .read_to_string(&mut input)?;
        let payload: Value = serde_json::from_str(&input).map_err(std::io::Error::other)?;
        let mut socket = std::os::unix::net::UnixStream::connect(path)?;
        socket.set_read_timeout(Some(Duration::from_secs(290)))?;
        writeln!(socket, "{}", json!({"token":token,"payload":payload}))?;
        let mut output = String::new();
        std::io::BufRead::read_line(&mut std::io::BufReader::new(socket), &mut output)?;
        print!("{output}");
        Ok(())
    })();
    if result.is_err() {
        println!("{{}}");
    }
}
pub async fn respond(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> ApiResult {
    if !["accept", "decline"].contains(&v["decision"].as_str().unwrap_or("")) {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "Choose Allow once or Decline.",
        ));
    }
    let mut answers = a.terminals.answers.lock().await;
    if !answers.contains_key(&id) {
        return Err(error(
            StatusCode::CONFLICT,
            "This native permission has expired.",
        ));
    }
    let changed = a
        .store
        .lock()
        .unwrap()
        .conn
        .execute(
            "UPDATE terminal_requests SET state='answering' WHERE id=? AND state='pending'",
            [&id],
        )
        .map_err(|_| {
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "Could not save the answer.",
            )
        })?;
    if changed != 1 {
        return Err(error(
            StatusCode::CONFLICT,
            "This permission was already answered.",
        ));
    }
    let tx = answers.remove(&id).unwrap();
    tx.send(v)
        .map_err(|_| error(StatusCode::CONFLICT, "The native prompt has expired."))?;
    drop(answers);
    notify(&a);
    Ok(Json(json!({"answered":true})))
}
async fn opencode(
    a: App,
    s: Session,
    process: String,
    mut cancel: tokio::sync::watch::Receiver<bool>,
) -> Result<(String, String), (StatusCode, Json<Value>)> {
    use std::process::Stdio;
    // XDG roots must resolve to exactly the discovered store. Never silently resume elsewhere.
    let store = std::path::Path::new(&s.store);
    if store.file_name().and_then(|v| v.to_str()) != Some("opencode") || !store.is_dir() {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "This OpenCode store cannot be resumed with the installed CLI. Use its native configuration.",
        ));
    }
    let port = std::net::TcpListener::bind("127.0.0.1:0")
        .map_err(|_| {
            error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Could not allocate a private OpenCode port.",
            )
        })?
        .local_addr()
        .unwrap()
        .port();
    let url = format!("http://127.0.0.1:{port}");
    let password = uuid::Uuid::new_v4().to_string();
    let mut command = tokio::process::Command::new("opencode");
    command
        .args([
            "serve",
            "--hostname",
            "127.0.0.1",
            "--port",
            &port.to_string(),
        ])
        .current_dir(&s.cwd)
        .env("XDG_DATA_HOME", store.parent().unwrap())
        .env("OPENCODE_SERVER_PASSWORD", &password)
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true);
    command.as_std_mut().process_group(0);
    let mut child = command
        .spawn()
        .map_err(|_| error(StatusCode::SERVICE_UNAVAILABLE, "Could not start OpenCode."))?;
    let http = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .connect_timeout(Duration::from_secs(3))
        .build()
        .unwrap();
    let mut healthy = false;
    for _ in 0..120 {
        if child.try_wait().ok().flatten().is_some() {
            break;
        }
        if let Ok(response) = http
            .get(format!("{url}/global/health"))
            .basic_auth("opencode", Some(&password))
            .timeout(Duration::from_secs(1))
            .send()
            .await
        {
            if response.status().is_success() {
                healthy = true;
                break;
            }
        }
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    if !healthy {
        return Err(error(
            StatusCode::SERVICE_UNAVAILABLE,
            "OpenCode did not become ready.",
        ));
    }
    let session: Value = http
        .get(format!("{url}/session/{}", s.native_id))
        .query(&[("directory", &s.cwd)])
        .basic_auth("opencode", Some(&password))
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .map_err(|_| {
            error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Could not verify OpenCode session.",
            )
        })?
        .json()
        .await
        .map_err(|_| {
            error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Invalid OpenCode session response.",
            )
        })?;
    if session["id"].as_str() != Some(&s.native_id) {
        return Err(error(
            StatusCode::CONFLICT,
            "OpenCode could not resume this exact native session.",
        ));
    }
    let schema: Value = http
        .get(format!("{url}/doc"))
        .basic_auth("opencode", Some(&password))
        .timeout(Duration::from_secs(5))
        .send()
        .await
        .map_err(|_| {
            error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Could not inspect OpenCode API.",
            )
        })?
        .json()
        .await
        .map_err(|_| {
            error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Invalid OpenCode API schema.",
            )
        })?;
    if schema["paths"]
        .get("/permission/{requestID}/reply")
        .is_none()
    {
        return Err(error(
            StatusCode::UNPROCESSABLE_ENTITY,
            "This OpenCode API version is not supported by the permission adapter.",
        ));
    }
    let response = http
        .get(format!("{url}/event"))
        .query(&[("directory", &s.cwd)])
        .basic_auth("opencode", Some(&password))
        .send()
        .await
        .map_err(|_| {
            error(
                StatusCode::SERVICE_UNAVAILABLE,
                "Could not subscribe to OpenCode events.",
            )
        })?;
    let base = url.clone();
    let secret = password.clone();
    tokio::spawn(async move {
        let mut bytes = response.bytes_stream();
        let mut buffer = String::new();
        loop {
            tokio::select! {
                _=cancel.changed()=>break,
                part=bytes.next()=>{let Some(Ok(part))=part else{break};buffer.push_str(&String::from_utf8_lossy(&part));if buffer.len()>4*1024*1024{break;}while let Some(end)=buffer.find("\n\n"){let frame=buffer[..end].to_owned();buffer.drain(..end+2);let data=frame.lines().filter_map(|line|line.strip_prefix("data:").map(str::trim_start)).collect::<Vec<_>>().join("\n");if let Ok(event)=serde_json::from_str::<Value>(&data){opencode_event(&a,&s,&process,&http,&base,&secret,&event).await;}}}
            }
        }
        terminate_group(child.id()).await;
        let _ = child.start_kill();
        let _ = child.wait().await;
        let _=a.store.lock().unwrap().conn.execute("UPDATE terminal_requests SET state='expired' WHERE process=? AND state IN ('pending','answering')",[&process]);
        notify(&a);
    });
    Ok((url, password))
}
async fn opencode_event(
    a: &App,
    s: &Session,
    process: &str,
    http: &reqwest::Client,
    url: &str,
    password: &str,
    v: &Value,
) {
    let p = &v["properties"];
    if p["sessionID"]
        .as_str()
        .or_else(|| p["info"]["sessionID"].as_str())
        != Some(&s.native_id)
    {
        return;
    }
    let event = v["type"].as_str().unwrap_or("");
    if event == "permission.asked" {
        let native = p["id"].as_str().unwrap_or("");
        if native.is_empty() {
            return;
        }
        let id = format!("{process}:{native}");
        let data = json!({"id":id,"nativeId":native,"method":"native/permission","params":{"agent":"OpenCode","tool":p["permission"],"input":{"patterns":p["patterns"],"metadata":p["metadata"]}}});
        let (tx, rx) = oneshot::channel();
        a.terminals.answers.lock().await.insert(id.clone(), tx);
        {
            let store = a.store.lock().unwrap();
            let _ = store.conn.execute(
                "INSERT OR IGNORE INTO terminal_requests VALUES(?,?,?,'pending',?)",
                rusqlite::params![id, s.id, process, data.to_string()],
            );
            let _ = store.receive(
                &format!("native-request:{id}"),
                &s.id,
                "OpenCode needs approval.",
                "request",
            );
        }
        notify(a);
        let app = a.clone();
        let session = s.clone();
        let client = http.clone();
        let url = url.to_owned();
        let secret = password.to_owned();
        let request = native.to_owned();
        tokio::spawn(async move {
            if let Ok(Ok(answer)) = tokio::time::timeout(Duration::from_secs(300), rx).await {
                // Recheck the live prompt. A TUI answer may already have resolved it.
                let pending: Value = match client
                    .get(format!("{url}/permission"))
                    .query(&[("directory", &session.cwd)])
                    .basic_auth("opencode", Some(&secret))
                    .timeout(Duration::from_secs(5))
                    .send()
                    .await
                {
                    Ok(r) => r.json().await.unwrap_or(Value::Null),
                    Err(_) => Value::Null,
                };
                if pending.as_array().is_some_and(|rows| {
                    rows.iter().any(|r| {
                        r["id"].as_str() == Some(&request)
                            && r["sessionID"].as_str() == Some(&session.native_id)
                    })
                }) {
                    let response = client
                        .post(format!("{url}/permission/{request}/reply"))
                        .query(&[("directory", &session.cwd)])
                        .basic_auth("opencode", Some(&secret))
                        .json(
                            &json!({"reply":if answer["decision"]=="accept"{"once"}else{"reject"}}),
                        )
                        .timeout(Duration::from_secs(10))
                        .send()
                        .await;
                    let state = if response.is_ok_and(|r| r.status().is_success()) {
                        "resolved"
                    } else {
                        "expired"
                    };
                    let _ = app.store.lock().unwrap().conn.execute(
                        "UPDATE terminal_requests SET state=? WHERE id=? AND state='answering'",
                        [state, &id],
                    );
                }
            }
            app.terminals.answers.lock().await.remove(&id);
            let _=app.store.lock().unwrap().conn.execute("UPDATE terminal_requests SET state='expired' WHERE id=? AND state IN ('pending','answering')",[&id]);
            notify(&app);
        });
    } else if event == "permission.replied" {
        let id = format!("{process}:{}", p["requestID"].as_str().unwrap_or(""));
        a.terminals.answers.lock().await.remove(&id);
        let _ = a.store.lock().unwrap().conn.execute(
            "UPDATE terminal_requests SET state='resolved' WHERE id=?",
            [&id],
        );
        notify(a);
    } else if event == "session.status" || event == "session.idle" {
        if let Some(n) = a.terminals.entries.lock().await.get(&s.id) {
            n.busy.store(
                event != "session.idle" && p["status"]["type"] != "idle",
                Ordering::Release,
            );
        }
    } else if event == "message.updated"
        && p["info"]["role"] == "assistant"
        && p["info"]["time"]["completed"].is_number()
    {
        if let Some(message) = p["info"]["id"].as_str() {
            if let Ok(response) = http
                .get(format!("{url}/session/{}/message/{message}", s.native_id))
                .query(&[("directory", &s.cwd)])
                .basic_auth("opencode", Some(password))
                .timeout(Duration::from_secs(5))
                .send()
                .await
            {
                if let Ok(message_data) = response.json::<Value>().await {
                    let text = message_data["parts"]
                        .as_array()
                        .map(|rows| {
                            rows.iter()
                                .filter(|p| {
                                    p["type"] == "text"
                                        && !p["synthetic"].as_bool().unwrap_or(false)
                                })
                                .filter_map(|p| p["text"].as_str())
                                .collect::<Vec<_>>()
                                .join("\n")
                        })
                        .unwrap_or_default();
                    if !text.is_empty() {
                        let _ = a.store.lock().unwrap().receive(
                            &format!("opencode:{}:{message}", s.native_id),
                            &s.id,
                            &text,
                            "reply",
                        );
                        notify(a);
                    }
                }
            }
        }
    } else if event == "session.error" {
        let _ = a.store.lock().unwrap().receive(
            &format!("native-error:{}", uuid::Uuid::new_v4()),
            &s.id,
            p["error"]["data"]["message"]
                .as_str()
                .unwrap_or("OpenCode stopped with an error."),
            "error",
        );
        notify(a);
    }
}
pub async fn shutdown(a: &App) {
    for n in a.terminals.entries.lock().await.values() {
        if !n.exited.load(Ordering::Acquire) {
            terminate_group(n.pid).await;
        }
        let _ = n.killer.lock().unwrap().kill();
        let _ = n.cancel.send(true);
    }
}
async fn terminate_group(pid: Option<u32>) {
    if let Some(pid) = pid {
        let _ = tokio::process::Command::new("/bin/kill")
            .args(["-TERM", "--", &format!("-{pid}")])
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::null())
            .stderr(std::process::Stdio::null())
            .status()
            .await;
    }
}
