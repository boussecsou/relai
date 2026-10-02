//! Version-bound Codex transport and per-session FIFO dispatch. Browsing never starts this engine.
use crate::{ApiResult, App, discovery, error, model::*, notify};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use serde_json::{Value, json};
use std::os::unix::process::CommandExt;
use std::{
    collections::HashMap,
    process::Stdio,
    sync::atomic::{AtomicBool, Ordering},
    time::Duration,
};
use tokio::{
    io::{AsyncBufReadExt, AsyncWriteExt, BufReader},
    process::Command,
    sync::{Mutex, mpsc, oneshot},
};
#[derive(Clone, Debug)]
pub struct RpcError {
    pub message: String,
    pub definite: bool,
}
impl RpcError {
    fn disconnected() -> Self {
        Self {
            message: "The Codex connection was lost. Delivery must be verified before resending."
                .into(),
            definite: false,
        }
    }
}
enum CommandMessage {
    Notify(String, Value, oneshot::Sender<Result<(), RpcError>>),
    Rpc(String, Value, oneshot::Sender<Result<Value, RpcError>>),
    Response(Value, Value, oneshot::Sender<Result<(), RpcError>>),
    Shutdown,
}
#[derive(Clone)]
pub struct Client {
    tx: mpsc::Sender<CommandMessage>,
    pub process: String,
    pub events: tokio::sync::broadcast::Sender<Value>,
    pub initialize: Value,
}
impl Client {
    pub async fn rpc(&self, method: &str, params: Value) -> Result<Value, RpcError> {
        let (tx, rx) = oneshot::channel();
        self.tx
            .send(CommandMessage::Rpc(method.into(), params, tx))
            .await
            .map_err(|_| RpcError::disconnected())?;
        tokio::time::timeout(Duration::from_secs(45), rx)
            .await
            .map_err(|_| RpcError::disconnected())?
            .map_err(|_| RpcError::disconnected())?
    }
    pub async fn respond(&self, id: Value, result: Value) -> Result<(), RpcError> {
        let (tx, rx) = oneshot::channel();
        self.tx
            .send(CommandMessage::Response(id, result, tx))
            .await
            .map_err(|_| RpcError::disconnected())?;
        rx.await.map_err(|_| RpcError::disconnected())?
    }
}
pub struct Engine {
    pub clients: Mutex<HashMap<String, Client>>,
    pub stopping: AtomicBool,
}
impl Engine {
    pub fn new() -> Self {
        Self {
            clients: Mutex::new(HashMap::new()),
            stopping: AtomicBool::new(false),
        }
    }
}
pub(crate) async fn client(a: &App, source: &str) -> Result<Client, RpcError> {
    let mut clients = a.engine.clients.lock().await;
    if let Some(c) = clients.get(source)
        && !c.tx.is_closed()
    {
        return Ok(c.clone());
    }
    let executable = std::env::var("RELAI_CODEX_BIN").unwrap_or_else(|_| "codex".into());
    let version = tokio::time::timeout(
        Duration::from_secs(5),
        Command::new(&executable).arg("--version").output(),
    )
    .await
    .ok()
    .and_then(Result::ok)
    .ok_or(RpcError {
        message: "Codex is unavailable. Check the executable and PATH.".into(),
        definite: true,
    })?;
    let version = String::from_utf8_lossy(&version.stdout);
    if !version.trim().starts_with("codex-cli 0.159.") {
        return Err(RpcError {
            message: format!(
                "Unsupported Codex version: {}. This adapter is verified for 0.159.x.",
                version.trim().chars().take(80).collect::<String>()
            ),
            definite: true,
        });
    }
    let mut command = Command::new(executable);
    command
        .args(["app-server", "--listen", "stdio://"])
        .env("CODEX_HOME", source)
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .kill_on_drop(true);
    command.as_std_mut().process_group(0);
    let mut child = command.spawn().map_err(|_| RpcError {
        message: "Codex app-server could not be started.".into(),
        definite: true,
    })?;
    let mut stdin = child.stdin.take().unwrap();
    let stdout = child.stdout.take().unwrap();
    let stderr = child.stderr.take().unwrap();
    // Drain diagnostics without putting private native output in server logs.
    tokio::spawn(async move {
        let mut lines = BufReader::new(stderr).lines();
        while lines.next_line().await.ok().flatten().is_some() {}
    });
    let (tx, mut commands) = mpsc::channel::<CommandMessage>(128);
    let process = uuid::Uuid::new_v4().to_string();
    let (native_events, _) = tokio::sync::broadcast::channel(512);
    let mut c = Client {
        tx,
        process: process.clone(),
        events: native_events.clone(),
        initialize: Value::Null,
    };
    let app = a.clone();
    let actor_source = source.to_owned();
    let pid = child.id();
    tokio::spawn(async move {
        let mut lines = BufReader::new(stdout).lines();
        let mut next = 1_i64;
        let mut pending = HashMap::new();
        loop {
            tokio::select! {
                command=commands.recv()=>{match command {
                    Some(CommandMessage::Notify(method,params,reply))=>{let mut bytes=json!({"method":method,"params":params}).to_string().into_bytes();bytes.push(b'\n');let result=stdin.write_all(&bytes).await.map_err(|_|RpcError::disconnected());let broken=result.is_err();let _=reply.send(result);if broken{break;}},
                    Some(CommandMessage::Rpc(method,params,reply))=>{let id=next;next+=1;let value=json!({"id":id,"method":method,"params":params});let mut bytes=value.to_string().into_bytes();bytes.push(b'\n');if stdin.write_all(&bytes).await.is_err(){let _=reply.send(Err(RpcError::disconnected()));break;}pending.insert(id,reply);},
                    Some(CommandMessage::Response(id,result,reply))=>{let mut bytes=json!({"id":id,"result":result}).to_string().into_bytes();bytes.push(b'\n');let result=stdin.write_all(&bytes).await.map_err(|_|RpcError::disconnected());let broken=result.is_err();let _=reply.send(result);if broken{break;}},
                    _=>break,
                }},
                line=lines.next_line()=>{let Ok(Some(line))=line else{break};if line.len()>8*1024*1024{break;}let Ok(v)=serde_json::from_str::<Value>(&line)else{continue};
                    if v.get("method").is_some(){if v.get("id").is_some(){
                        let supported=["item/commandExecution/requestApproval","item/fileChange/requestApproval","item/permissions/requestApproval","item/tool/requestUserInput","mcpServer/elicitation/request"].contains(&v["method"].as_str().unwrap_or(""));
                        if !supported {let mut bytes=json!({"id":v["id"],"error":{"code":-32601,"message":"This native tool or authentication callback is unavailable in Relai. Use the native configuration to reconnect it."}}).to_string().into_bytes();bytes.push(b'\n');if stdin.write_all(&bytes).await.is_err(){break;}continue;}
                        if let Err(e)=request(&app,&process,&actor_source,&v){eprintln!("Could not persist a native request: {e}");break;}}else if let Err(e)=event(&app,&process,&actor_source,&v){eprintln!("Could not persist a native event: {e}");break;}let _ = native_events.send(v.clone());}
                    else if let Some(id)=v["id"].as_i64()&& let Some(reply)=pending.remove(&id){let result=if v.get("error").is_some(){Err(RpcError{message:v["error"]["message"].as_str().unwrap_or("Codex rejected the operation.").chars().take(2000).collect(),definite:true})}else{Ok(v["result"].clone())};let _=reply.send(result);}
                }
            }
        }
        if let Some(pid) = pid {
            let _ = Command::new("/bin/kill")
                .args(["-TERM", "--", &format!("-{pid}")])
                .status()
                .await;
        }
        let _ = child.start_kill();
        let _ = child.wait().await;
        for (_, reply) in pending {
            let _ = reply.send(Err(RpcError::disconnected()));
        }
        {
            let s = app.store.lock().unwrap();
            let _=s.conn.execute("UPDATE requests SET state='expired' WHERE process=? AND state IN ('pending','answering')",[&process]);
        }
        {
            let s = app.store.lock().unwrap();
            for mut d in s.deliveries() {
                if d.source == actor_source
                    && (matches!(
                        d.execution.as_str(),
                        "running" | "waiting_input" | "waiting_approval"
                    ) || d.status == "dispatching")
                {
                    d.status = "uncertain".into();
                    d.execution = "unknown".into();
                    d.error="The original Codex process ended. Verify the native outcome before resending.".into();
                    d.revision += 1;
                    d.modified = now();
                    let _ = s.write_delivery(&d);
                }
            }
        }
        notify(&app);
    });
    c.initialize = c.rpc("initialize",json!({"clientInfo":{"name":"relai","title":"Relai","version":env!("CARGO_PKG_VERSION")},"capabilities":{"experimentalApi":true}})).await?;
    let (tx, rx) = oneshot::channel();
    c.tx.send(CommandMessage::Notify("initialized".into(), json!({}), tx))
        .await
        .map_err(|_| RpcError::disconnected())?;
    rx.await.map_err(|_| RpcError::disconnected())??;
    clients.insert(source.into(), c.clone());
    Ok(c)
}
fn selected(s: &crate::store::Store, thread: &str, source: &str) -> Option<Delivery> {
    s.conn.query_row("SELECT data FROM deliveries WHERE json_extract(data,'$.nativeThreadId')=? AND json_extract(data,'$.source')=? AND (status='dispatching' OR json_extract(data,'$.execution') IN ('running','waiting_approval','waiting_input')) ORDER BY created DESC LIMIT 1",[thread,source],|r|r.get::<_,String>(0)).ok().and_then(|v|serde_json::from_str(&v).ok())
}
fn request(a: &App, process: &str, source: &str, v: &Value) -> rusqlite::Result<()> {
    let s = a.store.lock().unwrap();
    let thread = v["params"]["threadId"].as_str().unwrap_or("");
    let Some(mut d) = selected(&s, thread, source) else {
        return Ok(());
    };
    let Some(sid) = d.draft.session_id.clone() else {
        return Ok(());
    };
    let id = uuid::Uuid::new_v4().to_string();
    let method = v["method"].as_str().unwrap_or("");
    d.execution =
        if method == "item/tool/requestUserInput" || method == "mcpServer/elicitation/request" {
            "waiting_input"
        } else {
            "waiting_approval"
        }
        .into();
    d.modified = now();
    d.revision += 1;
    s.write_delivery(&d)?;
    let data = json!({"id":id,"nativeId":v["id"],"method":method,"params":v["params"],"deliveryId":d.id,"process":process});
    s.conn.execute(
        "INSERT INTO requests(id,session_id,process,state,data) VALUES(?,?,?,'pending',?)",
        rusqlite::params![id, sid, process, data.to_string()],
    )?;
    s.receive(
        &format!("request:{id}"),
        &sid,
        if d.execution == "waiting_input" {
            "Codex needs your input."
        } else {
            "Codex needs approval."
        },
        "request",
    )?;
    drop(s);
    notify(a);
    Ok(())
}
fn event(a: &App, process: &str, source: &str, v: &Value) -> rusqlite::Result<()> {
    let method = v["method"].as_str().unwrap_or("");
    let p = &v["params"];
    let s = a.store.lock().unwrap();
    if method == "serverRequest/resolved" {
        s.conn.execute("UPDATE requests SET state='resolved' WHERE process=? AND CAST(json_extract(data,'$.nativeId') AS TEXT)=?",rusqlite::params![process,p["requestId"].to_string().trim_matches('"')])?;
    }
    let thread = p["threadId"].as_str().unwrap_or("");
    let Some(mut d) = selected(&s, thread, source) else {
        drop(s);
        notify(a);
        return Ok(());
    };
    let Some(sid) = d.draft.session_id.clone() else {
        return Ok(());
    };
    let turn = p["turnId"]
        .as_str()
        .or_else(|| p["turn"]["id"].as_str())
        .unwrap_or(&d.native_turn_id)
        .to_owned();
    if method == "turn/started" {
        d.native_turn_id = turn.clone();
        d.execution = "running".into();
        d.accepted_at.get_or_insert(now());
        d.status = "accepted".into();
    }
    if method == "turn/completed" {
        d.execution = match p["turn"]["status"].as_str() {
            Some("completed") => "completed",
            Some("interrupted") => "interrupted",
            _ => "failed",
        }
        .into();
        d.accepted_at.get_or_insert(now());
        d.status = "accepted".into();
        d.native_turn_id = turn.clone();
        d.error = p["turn"]["error"]["message"].as_str().unwrap_or("").into();
        if d.execution != "completed" {
            s.receive(
                &format!("turn:{turn}:outcome"),
                &sid,
                if d.error.is_empty() {
                    "Codex was interrupted. Its queue is paused."
                } else {
                    &d.error
                },
                "error",
            )?;
        }
        s.conn.execute("UPDATE requests SET state='expired' WHERE session_id=? AND state IN ('pending','answering')",[&sid])?;
    }
    if method == "serverRequest/resolved" {
        let pending: i64 = s.conn.query_row(
            "SELECT COUNT(*) FROM requests WHERE session_id=? AND state IN ('pending','answering')",
            [&sid],
            |r| r.get(0),
        )?;
        if pending == 0 {
            d.execution = "running".into();
        }
    }
    if method.starts_with("item/") || method == "turn/diff/updated" || method == "turn/plan/updated"
    {
        let item_id = p["item"]["id"]
            .as_str()
            .or_else(|| p["itemId"].as_str())
            .unwrap_or(method)
            .to_owned();
        let existing: Option<String> = s
            .conn
            .query_row(
                "SELECT data FROM runtime_items WHERE session_id=? AND turn_id=? AND item_id=?",
                rusqlite::params![sid, turn, item_id],
                |r| r.get(0),
            )
            .ok();
        let mut item: Value = existing
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(json!({"id":item_id,"type":"agentMessage","text":"","phase":"commentary"}));
        if p.get("item").is_some() {
            item = p["item"].clone();
        }
        if let Some(delta) = p["delta"].as_str() {
            let key = if method == "item/commandExecution/outputDelta" {
                "aggregatedOutput"
            } else {
                "text"
            };
            let text = item[key].as_str().unwrap_or("");
            let mut next = text.to_owned();
            if next.len() < 2 * 1024 * 1024 {
                next.push_str(delta);
            }
            item[key] = json!(next);
        }
        if method == "turn/diff/updated" {
            item = json!({"id":item_id,"type":"diff","diff":p["diff"]});
        }
        if method == "turn/plan/updated" {
            item =
                json!({"id":item_id,"type":"plan","plan":p["plan"],"explanation":p["explanation"]});
        }
        item["time"] = json!(now());
        item["complete"] = json!(method == "item/completed");
        s.conn.execute("INSERT INTO runtime_items(session_id,turn_id,item_id,data) VALUES(?,?,?,?) ON CONFLICT(session_id,turn_id,item_id) DO UPDATE SET data=excluded.data",rusqlite::params![sid,turn,item_id,item.to_string()])?;
        if method == "item/completed"
            && item["type"] == "agentMessage"
            && item["phase"] != "commentary"
        {
            s.receive(
                &format!("{thread}:{turn}:{item_id}"),
                &sid,
                item["text"].as_str().unwrap_or(""),
                "reply",
            )?;
        }
    }
    d.modified = now();
    d.revision += 1;
    s.write_delivery(&d)?;
    drop(s);
    // Native deltas are updates, not mailbox-wide reloads. The UI fetches Activity in bounded batches.
    let _ = a
        .events
        .send(json!({"kind":"runtime","sessionId":sid}).to_string());
    if method == "turn/completed" {
        let app = a.clone();
        let id = sid.clone();
        tokio::task::spawn_blocking(move || {
            let mut store = app.store.lock().unwrap();
            if let Some(session) = store.session(&id)
                && let Some(rows) = managed_messages(&store, &id)
            {
                let _ = store.index(&session, &rows, &discovery::fingerprint(&session));
            }
        });
    }
    if method == "turn/completed"
        || method == "item/completed"
        || method == "serverRequest/resolved"
    {
        notify(a);
    }
    Ok(())
}
pub fn start(a: App) {
    tokio::spawn(async move {
        loop {
            if a.engine.stopping.load(Ordering::Relaxed) {
                break;
            }
            let work = {
                let s = a.store.lock().unwrap();
                let mut all = s.deliveries();
                let time = now();
                for d in &mut all {
                    if d.status == "scheduled" && d.due_at.is_some_and(|t| t <= time) {
                        d.status = "queued".into();
                        d.queued_at = Some(time);
                        d.revision += 1;
                        d.modified = time;
                        if s.write_delivery(d).is_ok() {
                            notify_unlocked(&a);
                        }
                    }
                }
                all.sort_by(|a, b| {
                    a.queued_at
                        .unwrap_or(a.created)
                        .cmp(&b.queued_at.unwrap_or(b.created))
                });
                let mut claimed = std::collections::HashSet::new();
                let mut work = vec![];
                for d in &all {
                    if d.status != "queued" {
                        continue;
                    }
                    let key = d.draft.session_id.clone().unwrap_or_else(|| d.id.clone());
                    let blocked = all.iter().any(|other| {
                        other.id != d.id
                            && other.draft.session_id.is_some()
                            && other.draft.session_id == d.draft.session_id
                            && (other.status == "dispatching"
                                || other.status == "uncertain"
                                || other.status == "failed"
                                || matches!(
                                    other.execution.as_str(),
                                    "running"
                                        | "waiting_approval"
                                        | "waiting_input"
                                        | "failed"
                                        | "interrupted"
                                ))
                            && other.status != "cancelled"
                    });
                    let terminal_owned = d
                        .draft
                        .session_id
                        .as_ref()
                        .is_some_and(|id| crate::terminal::owned(&s, id));
                    if terminal_owned || blocked || !claimed.insert(key) {
                        continue;
                    }
                    let mut d = d.clone();
                    d.status = "dispatching".into();
                    d.stage = "preparing".into();
                    d.attempt += 1;
                    d.revision += 1;
                    d.modified = time;
                    if s.write_delivery(&d).is_ok() {
                        work.push(d);
                    }
                }
                work
            };
            for d in work {
                let app = a.clone();
                tokio::spawn(async move {
                    dispatch(app, d).await;
                });
            }
            tokio::time::sleep(Duration::from_millis(500)).await;
        }
    });
}
fn notify_unlocked(a: &App) {
    let _ = a.events.send("changed".into());
}
async fn dispatch(a: App, mut d: Delivery) {
    let result=async {
        if !std::path::Path::new(&d.draft.cwd).is_dir(){return Err(RpcError{message:"The working folder no longer exists. Restore it or cancel this delivery and choose another folder.".into(),definite:true});}
        let c=client(&a,&d.source).await?;
        if d.native_thread_id.is_empty(){
            d.stage="creating_thread".into();a.store.lock().unwrap().write_delivery(&d).map_err(|_|RpcError{message:"Cannot persist the operation.".into(),definite:true})?;
            let result=c.rpc("thread/start",json!({"cwd":d.draft.cwd,"ephemeral":false})).await?;
            d.native_thread_id=result["thread"]["id"].as_str().ok_or(RpcError::disconnected())?.into();
            let root=discovery::Root{tool:"Codex".into(),path:d.source.clone()};
            let session=discovery::session(&root,d.native_thread_id.clone(),d.draft.cwd.clone(),d.draft.title.clone(),result["thread"]["gitInfo"]["branch"].as_str().unwrap_or("").into(),now(),std::path::Path::new(result["thread"]["path"].as_str().unwrap_or("")));
            d.draft.branch=session.branch.clone();
            d.draft.session_id=Some(session.id.clone());d.stage="thread_saved".into();
            {let s=a.store.lock().unwrap();s.upsert(&session).map_err(|_|RpcError::disconnected())?;s.annotate(&session.id,&json!({"labels":d.draft.labels,"ticket":d.draft.ticket,"starred":false,"archived":false,"unread":false})).map_err(|_|RpcError::disconnected())?;s.write_delivery(&d).map_err(|_|RpcError::disconnected())?;}
            c.rpc("thread/name/set",json!({"threadId":d.native_thread_id,"name":d.draft.title})).await?;
        }else{
            let result=c.rpc("thread/resume",json!({"threadId":d.native_thread_id,"excludeTurns":false})).await?;
            if result["thread"]["id"].as_str()!=Some(&d.native_thread_id){return Err(RpcError{message:"Codex returned a different thread identity. Sending was stopped.".into(),definite:true});}
            // Capture authoritative history once, then display native item IDs rather than merging by text.
            save_history(&a,&d,&result["thread"]["turns"])?;
        }
        d.stage="starting_turn".into();d.modified=now();a.store.lock().unwrap().write_delivery(&d).map_err(|_|RpcError{message:"Cannot persist the send intent.".into(),definite:true})?;
        let result=c.rpc("turn/start",json!({"threadId":d.native_thread_id,"cwd":d.draft.cwd,"input":[{"type":"text","text":d.draft.markdown,"text_elements":[]}]})).await?;
        let s=a.store.lock().unwrap();let mut current=s.delivery(&d.id).ok_or(RpcError::disconnected())?;
        current.native_turn_id=result["turn"]["id"].as_str().ok_or(RpcError::disconnected())?.into();current.accepted_at.get_or_insert(now());current.status="accepted".into();current.stage="accepted".into();current.modified=now();current.revision+=1;
        if current.execution=="unknown" {current.execution="running".into();}
        s.write_delivery(&current).map_err(|_|RpcError::disconnected())?;drop(s);notify(&a);Ok::<(),RpcError>(())
    }.await;
    if let Err(e) = result {
        let s = a.store.lock().unwrap();
        if let Some(mut current) = s.delivery(&d.id) {
            if matches!(
                current.execution.as_str(),
                "completed" | "failed" | "interrupted"
            ) && current.accepted_at.is_some()
            {
                return;
            }
            let safe = e.definite || matches!(current.stage.as_str(), "preparing" | "thread_saved");
            current.status = if safe { "failed" } else { "uncertain" }.into();
            current.execution = "unknown".into();
            current.error = e.message;
            current.modified = now();
            current.revision += 1;
            let _ = s.write_delivery(&current);
            if let Some(ref sid) = current.draft.session_id {
                let _ = s.receive(
                    &format!("delivery:{}:{}", current.id, current.attempt),
                    sid,
                    &current.error,
                    "error",
                );
            }
        }
        drop(s);
        notify(&a);
    }
}
pub(crate) fn save_history(a: &App, d: &Delivery, _turns: &Value) -> Result<(), RpcError> {
    let sid = d
        .draft
        .session_id
        .as_deref()
        .ok_or(RpcError::disconnected())?;
    let s = a.store.lock().unwrap();
    let exists: bool = s
        .conn
        .query_row(
            "SELECT EXISTS(SELECT 1 FROM history_baselines WHERE session_id=?)",
            [sid],
            |r| r.get(0),
        )
        .unwrap_or(false);
    if exists {
        return Ok(());
    }
    let session = s.session(sid).ok_or(RpcError::disconnected())?;
    drop(s);
    let baseline = discovery::messages(&session).map_err(|message| RpcError {
        message,
        definite: true,
    })?;
    a.store
        .lock()
        .unwrap()
        .conn
        .execute(
            "INSERT OR IGNORE INTO history_baselines(session_id,data) VALUES(?,?)",
            rusqlite::params![sid, serde_json::to_string(&baseline).unwrap()],
        )
        .map_err(|_| RpcError::disconnected())?;
    Ok(())
}
pub fn managed_messages(s: &crate::store::Store, id: &str) -> Option<Vec<Message>> {
    let baseline = s
        .conn
        .query_row(
            "SELECT data FROM history_baselines WHERE session_id=?",
            [id],
            |r| r.get::<_, String>(0),
        )
        .ok();
    let mut rows: Vec<Message> = baseline
        .and_then(|s| serde_json::from_str(&s).ok())
        .unwrap_or_default();
    let mut st = s
        .conn
        .prepare("SELECT turn_id,item_id,data FROM runtime_items WHERE session_id=? ORDER BY rowid")
        .ok()?;
    let items = st
        .query_map([id], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1)?,
                r.get::<_, String>(2)?,
            ))
        })
        .ok()?;
    let mut managed = false;
    for result in items {
        let Ok((turn, item, data)) = result else {
            continue;
        };
        let Ok(v) = serde_json::from_str::<Value>(&data) else {
            continue;
        };
        let kind = v["type"].as_str().unwrap_or("");
        if kind == "agentMessage" || kind == "userMessage" {
            managed = true;
            let text = if kind == "userMessage" {
                v["content"]
                    .as_array()
                    .map(|a| {
                        a.iter()
                            .filter_map(|c| c["text"].as_str())
                            .collect::<Vec<_>>()
                            .join("\n")
                    })
                    .unwrap_or_default()
            } else {
                v["text"].as_str().unwrap_or("").into()
            };
            rows.push(Message {
                id: format!("native:{turn}:{item}"),
                role: if kind == "userMessage" {
                    "user"
                } else {
                    "assistant"
                }
                .into(),
                text,
                time: v["time"].as_i64().unwrap_or(0),
                activity: kind == "agentMessage" && v["phase"] == "commentary",
            });
        }
    }
    if managed || !rows.is_empty() {
        Some(rows)
    } else {
        None
    }
}
pub async fn activity(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    let s = a.store.lock().unwrap();
    let mut st = s
        .conn
        .prepare("SELECT data FROM runtime_items WHERE session_id=? ORDER BY rowid DESC LIMIT 300")
        .unwrap();
    let mut items: Vec<Value> = st
        .query_map([&id], |r| r.get::<_, String>(0))
        .unwrap()
        .filter_map(|r| serde_json::from_str(&r.ok()?).ok())
        .collect();
    items.reverse();
    let mut st = s
        .conn
        .prepare("SELECT data,state FROM requests WHERE session_id=? ORDER BY rowid DESC LIMIT 50")
        .unwrap();
    let mut requests: Vec<Value> = st
        .query_map([&id], |r| {
            Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
        })
        .unwrap()
        .filter_map(|r| {
            let (data, state) = r.ok()?;
            let mut v: Value = serde_json::from_str(&data).ok()?;
            v["state"] = json!(state);
            Some(v)
        })
        .collect();
    let mut native = s.conn.prepare("SELECT data,state FROM terminal_requests WHERE session_id=? ORDER BY rowid DESC LIMIT 50").unwrap();
    requests.extend(
        native
            .query_map([&id], |r| {
                Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?))
            })
            .unwrap()
            .filter_map(|r| {
                let (data, state) = r.ok()?;
                let mut v: Value = serde_json::from_str(&data).ok()?;
                v["state"] = json!(state);
                Some(v)
            }),
    );
    let deliveries: Vec<Delivery> = s
        .deliveries()
        .into_iter()
        .filter(|d| d.draft.session_id.as_deref() == Some(&id))
        .collect();
    let history_version: i64 = s
        .conn
        .query_row(
            "SELECT COALESCE(MAX(created),0) FROM incoming WHERE session_id=?",
            [&id],
            |r| r.get(0),
        )
        .unwrap_or(0);
    Ok(Json(
        json!({"items":items,"requests":requests,"deliveries":deliveries,"historyVersion":history_version,"truncated":items.len()==300}),
    ))
}
pub async fn interrupt(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    let d = a
        .store
        .lock()
        .unwrap()
        .deliveries()
        .into_iter()
        .rev()
        .find(|d| {
            d.draft.session_id.as_deref() == Some(&id)
                && matches!(
                    d.execution.as_str(),
                    "running" | "waiting_input" | "waiting_approval"
                )
        })
        .ok_or(error(
            StatusCode::CONFLICT,
            "No active turn is managed by Relai.",
        ))?;
    let c = a
        .engine
        .clients
        .lock()
        .await
        .get(&d.source)
        .cloned()
        .ok_or(error(
            StatusCode::CONFLICT,
            "The Codex process is unavailable.",
        ))?;
    c.rpc(
        "turn/interrupt",
        json!({"threadId":d.native_thread_id,"turnId":d.native_turn_id}),
    )
    .await
    .map_err(|e| error(StatusCode::SERVICE_UNAVAILABLE, &e.message))?;
    Ok(Json(json!({"requested":true})))
}
pub async fn respond(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> ApiResult {
    let (request, process) = {
        let s = a.store.lock().unwrap();
        let (data, state, process): (String, String, String) = s
            .conn
            .query_row(
                "SELECT data,state,process FROM requests WHERE id=?",
                [&id],
                |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
            )
            .map_err(|_| error(StatusCode::NOT_FOUND, "Request not found."))?;
        if state != "pending" {
            return Err(error(
                StatusCode::CONFLICT,
                "This request was answered or has expired.",
            ));
        }
        (serde_json::from_str::<Value>(&data).unwrap(), process)
    };
    let method = request["method"].as_str().unwrap_or("");
    let params = &request["params"];
    let result = match method {
        "item/commandExecution/requestApproval" | "item/fileChange/requestApproval" => {
            let decision = v["decision"].as_str().unwrap_or("");
            if !["accept", "acceptForSession", "decline", "cancel"].contains(&decision)
                || params["availableDecisions"]
                    .as_array()
                    .is_some_and(|options| {
                        !options
                            .iter()
                            .any(|option| option.as_str() == Some(decision))
                    })
            {
                return Err(error(
                    StatusCode::BAD_REQUEST,
                    "Choose an available approval decision.",
                ));
            }
            json!({"decision":decision})
        }
        "item/tool/requestUserInput" => {
            let mut answers = serde_json::Map::new();
            for q in params["questions"].as_array().unwrap_or(&vec![]) {
                let id = q["id"].as_str().unwrap_or("");
                let answer = v["answers"][id]
                    .as_str()
                    .filter(|s| !s.trim().is_empty())
                    .ok_or(error(StatusCode::BAD_REQUEST, "Answer each question."))?;
                answers.insert(id.into(), json!({"answers":[answer]}));
            }
            json!({"answers":answers})
        }
        "item/permissions/requestApproval" => {
            if !["accept", "decline"].contains(&v["decision"].as_str().unwrap_or("")) {
                return Err(error(
                    StatusCode::BAD_REQUEST,
                    "Choose Allow once or Decline.",
                ));
            }
            json!({"permissions":if v["decision"]=="accept"{params["permissions"].clone()}else{json!({})},"scope":"turn"})
        }
        "mcpServer/elicitation/request" => {
            let action = v["action"].as_str().unwrap_or("cancel");
            if !["accept", "decline", "cancel"].contains(&action) {
                return Err(error(StatusCode::BAD_REQUEST, "Invalid response."));
            }
            if action == "accept" && params["mode"] != "url" {
                let content = v["content"].as_object().ok_or(error(
                    StatusCode::BAD_REQUEST,
                    "Complete the requested form.",
                ))?;
                let schema = &params["requestedSchema"];
                if schema["required"].as_array().is_some_and(|required| {
                    required
                        .iter()
                        .any(|key| key.as_str().is_some_and(|key| !content.contains_key(key)))
                }) {
                    return Err(error(
                        StatusCode::BAD_REQUEST,
                        "Complete every required field.",
                    ));
                }
                for (key, value) in content {
                    let field = &schema["properties"][key];
                    let valid = match field["type"].as_str() {
                        Some("string") => value.is_string(),
                        Some("boolean") => value.is_boolean(),
                        Some("number") => value.is_number(),
                        Some("integer") => value.is_i64() || value.is_u64(),
                        _ => false,
                    };
                    if !valid
                        || field["enum"]
                            .as_array()
                            .is_some_and(|options| !options.contains(value))
                    {
                        return Err(error(
                            StatusCode::BAD_REQUEST,
                            "Choose a valid value for each requested field.",
                        ));
                    }
                }
            }
            json!({"action":action,"content":if action=="accept"{v["content"].clone()}else{Value::Null}})
        }
        _ => {
            return Err(error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "This native request is not supported. Stop the turn and review the native configuration.",
            ));
        }
    };
    let clients = a.engine.clients.lock().await;
    let c = clients
        .values()
        .find(|c| c.process == process)
        .cloned()
        .ok_or(error(
            StatusCode::CONFLICT,
            "The original process is unavailable. This request has expired.",
        ))?;
    drop(clients);
    {
        let s = a.store.lock().unwrap();
        if s.conn
            .execute(
                "UPDATE requests SET state='answering' WHERE id=? AND state='pending'",
                [&id],
            )
            .map_err(|_| {
                error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Cannot save the decision.",
                )
            })?
            != 1
        {
            return Err(error(
                StatusCode::CONFLICT,
                "This request changed in another tab.",
            ));
        }
    }
    c.respond(request["nativeId"].clone(), result)
        .await
        .map_err(|e| error(StatusCode::SERVICE_UNAVAILABLE, &e.message))?;
    notify(&a);
    Ok(Json(json!({"submitted":true})))
}
pub async fn reconcile(a: App, id: String, v: Value) -> ApiResult {
    let d = a
        .store
        .lock()
        .unwrap()
        .delivery(&id)
        .ok_or(error(StatusCode::NOT_FOUND, "Delivery not found."))?;
    if d.revision != v["revision"].as_i64().unwrap_or(-1) || d.status != "uncertain" {
        return Err(error(
            StatusCode::CONFLICT,
            "This delivery changed. Reload before verifying it.",
        ));
    }
    if d.native_thread_id.is_empty() || d.native_turn_id.is_empty() {
        return Err(error(
            StatusCode::CONFLICT,
            "No native acknowledgement was saved. Inspect the native history manually; this operation cannot be reconciled with certainty.",
        ));
    }
    let c = client(&a, &d.source)
        .await
        .map_err(|e| error(StatusCode::SERVICE_UNAVAILABLE, &e.message))?;
    let history = c
        .rpc(
            "thread/read",
            json!({"threadId":d.native_thread_id,"includeTurns":true}),
        )
        .await
        .map_err(|e| error(StatusCode::SERVICE_UNAVAILABLE, &e.message))?;
    let turn = history["thread"]["turns"]
        .as_array()
        .and_then(|turns| turns.iter().find(|t| t["id"] == d.native_turn_id))
        .ok_or(error(
            StatusCode::CONFLICT,
            "The saved turn was not found. Delivery remains uncertain.",
        ))?;
    let status = turn["status"].as_str().unwrap_or("");
    if !["completed", "interrupted", "failed"].contains(&status) {
        return Err(error(
            StatusCode::CONFLICT,
            "No final native outcome is available. Delivery remains uncertain.",
        ));
    }
    let s = a.store.lock().unwrap();
    let mut current = s.delivery(&id).unwrap();
    if current.revision != d.revision {
        return Err(error(
            StatusCode::CONFLICT,
            "This delivery changed while being verified.",
        ));
    }
    current.status = "accepted".into();
    current.execution = status.into();
    current.accepted_at.get_or_insert(now());
    current.stage = "reconciled".into();
    current.error = turn["error"]["message"].as_str().unwrap_or("").into();
    current.revision += 1;
    current.modified = now();
    s.write_delivery(&current).map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "Could not save the native outcome.",
        )
    })?;
    if let Some(sid) = current.draft.session_id.as_deref()
        && let Some(items) = turn["items"].as_array()
    {
        for item in items {
            let iid = item["id"].as_str().unwrap_or("");
            s.conn.execute("INSERT INTO runtime_items(session_id,turn_id,item_id,data) VALUES(?,?,?,?) ON CONFLICT(session_id,turn_id,item_id) DO UPDATE SET data=excluded.data",rusqlite::params![sid,current.native_turn_id,iid,item.to_string()]).map_err(|_|error(StatusCode::INTERNAL_SERVER_ERROR,"Could not save the native history."))?;
            if item["type"] == "agentMessage" && item["phase"] != "commentary" {
                s.receive(
                    &format!(
                        "{}:{}:{iid}",
                        current.native_thread_id, current.native_turn_id
                    ),
                    sid,
                    item["text"].as_str().unwrap_or(""),
                    "reply",
                )
                .map_err(|_| {
                    error(
                        StatusCode::INTERNAL_SERVER_ERROR,
                        "Could not save the return.",
                    )
                })?;
            }
        }
    }
    drop(s);
    notify(&a);
    Ok(Json(json!({"delivery":current})))
}
pub async fn shutdown(a: App) {
    a.engine.stopping.store(true, Ordering::SeqCst);
    let clients = a.engine.clients.lock().await.clone();
    let active = a
        .store
        .lock()
        .unwrap()
        .deliveries()
        .into_iter()
        .filter(|d| {
            matches!(
                d.execution.as_str(),
                "running" | "waiting_input" | "waiting_approval"
            )
        })
        .collect::<Vec<_>>();
    for d in active {
        if let Some(c) = clients.get(&d.source) {
            let _ = tokio::time::timeout(
                Duration::from_secs(3),
                c.rpc(
                    "turn/interrupt",
                    json!({"threadId":d.native_thread_id,"turnId":d.native_turn_id}),
                ),
            )
            .await;
        }
    }
    for c in clients.values() {
        let _ = c.tx.send(CommandMessage::Shutdown).await;
    }
    let s = a.store.lock().unwrap();
    let _ = crate::delivery::recover(&s, now());
}
