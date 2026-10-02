mod delivery;
mod discovery;
mod folders;
mod model;
mod runtime;
mod search;
mod store;
mod terminal;
use axum::{
    Json, Router,
    extract::{Path, Query, Request, State},
    http::{HeaderValue, StatusCode},
    middleware::{self, Next},
    response::{
        IntoResponse, Response,
        sse::{Event, Sse},
    },
    routing::get,
};
use model::*;
use rust_embed::RustEmbed;
use serde_json::{Value, json};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{
        Arc, Mutex,
        atomic::{AtomicBool, Ordering},
    },
    time::Duration,
};
use store::Store;
use tokio::sync::broadcast;
use tokio_stream::{StreamExt, wrappers::BroadcastStream};
#[derive(RustEmbed)]
#[folder = "../../apps/web/dist/"]
struct Assets;
#[derive(Clone)]
struct App {
    store: Arc<Mutex<Store>>,
    coverage: Arc<Mutex<Vec<Coverage>>>,
    scanning: Arc<AtomicBool>,
    events: broadcast::Sender<String>,
    token: String,
    port: u16,
    roots: Arc<Mutex<Vec<discovery::Root>>>,
    indexing: Arc<AtomicBool>,
    index_errors: Arc<Mutex<usize>>,
    engine: Arc<runtime::Engine>,
    terminals: Arc<terminal::Manager>,
}
type ApiResult = Result<Json<Value>, (StatusCode, Json<Value>)>;
fn error(code: StatusCode, message: &str) -> (StatusCode, Json<Value>) {
    (
        code,
        Json(
            json!({"error":message,"code":match code {StatusCode::CONFLICT=>"revision_conflict",StatusCode::BAD_REQUEST=>"invalid_request",StatusCode::NOT_FOUND=>"not_found",StatusCode::UNPROCESSABLE_ENTITY=>"unavailable",_=>"service_error"},"diagnosticId":uuid::Uuid::new_v4().to_string(),"retryable":code.is_server_error()}),
        ),
    )
}
fn notify(a: &App) {
    let mut data = json!({"kind":"changed"});
    if let Ok(store) = a.store.try_lock() {
        if store
            .conn
            .execute("INSERT INTO event_log(data) VALUES(?)", [data.to_string()])
            .is_ok()
        {
            data["id"] = json!(store.conn.last_insert_rowid());
            let _ = store.conn.execute(
                "DELETE FROM event_log WHERE id < ?",
                [store.conn.last_insert_rowid() - 10000],
            );
        }
    }
    let _ = a.events.send(data.to_string());
}
async fn guard(State(a): State<App>, req: Request, next: Next) -> Response {
    let host = req
        .headers()
        .get("host")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("");
    let allowed = |host: &str| {
        [
            format!("127.0.0.1:{}", a.port),
            format!("localhost:{}", a.port),
            "127.0.0.1:4178".into(),
            "localhost:4178".into(),
        ]
        .contains(&host.to_string())
    };
    if !allowed(host) {
        return StatusCode::FORBIDDEN.into_response();
    }
    if let Some(origin) = req.headers().get("origin").and_then(|h| h.to_str().ok()) {
        if !origin.strip_prefix("http://").is_some_and(allowed) {
            return StatusCode::FORBIDDEN.into_response();
        }
    }
    if req
        .headers()
        .get("sec-fetch-site")
        .is_some_and(|v| v == "cross-site")
    {
        return StatusCode::FORBIDDEN.into_response();
    }
    let api = req.uri().path().starts_with("/api/");
    let bootstrap = req.uri().path() == "/api/v1/bootstrap";
    let cookie = req
        .headers()
        .get("cookie")
        .and_then(|v| v.to_str().ok())
        .unwrap_or("");
    if api
        && !bootstrap
        && !cookie
            .split(';')
            .any(|c| c.trim() == format!("relai={}", a.token))
    {
        return StatusCode::UNAUTHORIZED.into_response();
    }
    let mut response = next.run(req).await;
    if bootstrap || !api {
        response.headers_mut().insert(
            "set-cookie",
            HeaderValue::from_str(&format!(
                "relai={}; HttpOnly; SameSite=Strict; Path=/",
                a.token
            ))
            .unwrap(),
        );
    }
    response.headers_mut().insert(
        "x-content-type-options",
        HeaderValue::from_static("nosniff"),
    );
    response
        .headers_mut()
        .insert("referrer-policy", HeaderValue::from_static("no-referrer"));
    response
        .headers_mut()
        .insert("cache-control", HeaderValue::from_static("no-store"));
    response.headers_mut().insert("content-security-policy",HeaderValue::from_static("default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'"));
    response
}
async fn bootstrap() -> Json<Value> {
    Json(
        json!({"version":env!("CARGO_PKG_VERSION"),"environment":"Linux / WSL","capabilities":{"send":discovery::installed("Codex"),"terminal":true,"queue":true,"schedule":true}}),
    )
}
async fn coverage(State(a): State<App>) -> Json<Value> {
    Json(
        json!({"scanning":a.scanning.load(Ordering::Relaxed),"sources":a.coverage.lock().unwrap().clone(),"indexing":a.indexing.load(Ordering::Relaxed),"indexErrors":*a.index_errors.lock().unwrap()}),
    )
}
fn start_scan(a: App) {
    if a.scanning.swap(true, Ordering::SeqCst) {
        return;
    }
    tokio::spawn(async move {
        let roots = a.roots.lock().unwrap().clone();
        *a.coverage.lock().unwrap() = roots
            .iter()
            .map(|r| Coverage {
                tool: r.tool.clone(),
                root: r.path.clone(),
                installed: discovery::installed(&r.tool),
                status: "pending".into(),
                count: 0,
                errors: 0,
                detail: "Discovering…".into(),
                updated: now(),
            })
            .collect();
        notify(&a);
        let mut tasks = vec![];
        for root in roots {
            let app = a.clone();
            tasks.push(tokio::task::spawn_blocking(move || {
                let mut count = 0;
                let cov = discovery::scan(&root, |s| {
                    if let Err(e) = app.store.lock().unwrap().upsert(&s) {
                        eprintln!("catalogue: {e}");
                    }
                    count += 1;
                    if count % 100 == 0 {
                        notify(&app)
                    }
                });
                if let Some(entry) = app
                    .coverage
                    .lock()
                    .unwrap()
                    .iter_mut()
                    .find(|c| c.tool == root.tool && c.root == root.path)
                {
                    *entry = cov
                }
                notify(&app);
            }));
        }
        for task in tasks {
            if task.await.is_err() {
                eprintln!("Source reading was interrupted.");
            }
        }
        a.scanning.store(false, Ordering::SeqCst);
        notify(&a);
        // Index after metadata becomes available. Each native source remains read-only.
        if a.indexing.swap(true, Ordering::SeqCst) {
            return;
        }
        *a.index_errors.lock().unwrap() = 0;
        let app = a.clone();
        let _ = tokio::task::spawn_blocking(move || {
            let sessions = app.store.lock().unwrap().sessions();
            for (position, s) in sessions.into_iter().enumerate() {
                let fingerprint = discovery::fingerprint(&s);
                if app.store.lock().unwrap().indexed(&s.id, &fingerprint) {
                    continue;
                }
                let managed = runtime::managed_messages(&app.store.lock().unwrap(), &s.id);
                if let Ok(messages) = managed.map(Ok).unwrap_or_else(|| discovery::messages(&s)) {
                    if let Err(e) = app.store.lock().unwrap().index(&s, &messages, &fingerprint) {
                        eprintln!("index: {e}");
                    }
                } else {
                    *app.index_errors.lock().unwrap() += 1
                }
                if position % 100 == 0 {
                    notify(&app)
                }
            }
            app.indexing.store(false, Ordering::SeqCst);
            notify(&app);
        })
        .await;
    });
}
async fn roots_get(State(a): State<App>) -> Json<Value> {
    Json(json!(a.roots.lock().unwrap().clone()))
}
async fn roots_save(State(a): State<App>, Json(roots): Json<Vec<discovery::Root>>) -> ApiResult {
    if roots.len() > 16
        || roots.iter().any(|r| {
            !["Codex", "Claude Code", "OpenCode", "Pi"].contains(&r.tool.as_str())
                || !std::path::Path::new(&r.path).is_absolute()
                || r.path == "/"
                || r.path == std::env::var("HOME").unwrap_or_default()
        })
    {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "Indiquez les dossiers de stockage natifs des agents, avec des chemins absolus.",
        ));
    }
    let data = serde_json::to_string(&roots).unwrap();
    a.store.lock().unwrap().conn.execute("INSERT INTO roots(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",[data]).map_err(|_|error(StatusCode::INTERNAL_SERVER_ERROR,"The data could not be saved."))?;
    *a.roots.lock().unwrap() = roots;
    start_scan(a.clone());
    notify(&a);
    Ok(Json(json!({"saved":true})))
}
async fn refresh(State(a): State<App>) -> Json<Value> {
    start_scan(a);
    Json(json!({"accepted":true}))
}
async fn sessions(State(a): State<App>, Query(q): Query<HashMap<String, String>>) -> ApiResult {
    let store = a.store.lock().unwrap();
    let query = q
        .get("q")
        .map(|s| s.trim().to_lowercase())
        .unwrap_or_default();
    let view = q.get("view").map(String::as_str).unwrap_or("sessions");
    let offset = q
        .get("offset")
        .and_then(|s| s.parse::<usize>().ok())
        .unwrap_or(0);
    let (total, items) = store
        .page(
            &query,
            q.get("tool").map(String::as_str).unwrap_or(""),
            q.get("label").map(String::as_str).unwrap_or(""),
            view,
            offset,
        )
        .map_err(|_| error(StatusCode::INTERNAL_SERVER_ERROR, "Search is unavailable."))?;
    Ok(Json(
        json!({"items":items,"total":total,"offset":offset,"limit":100}),
    ))
}
async fn session_get(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    let store = a.store.lock().unwrap();
    let s = store
        .session(&id)
        .ok_or(error(StatusCode::NOT_FOUND, "Conversation not found."))?;
    Ok(Json(store.public_session(&s)))
}
async fn annotate(State(a): State<App>, Path(id): Path<String>, Json(v): Json<Value>) -> ApiResult {
    let store = a.store.lock().unwrap();
    if store.session(&id).is_none() {
        return Err(error(StatusCode::NOT_FOUND, "Conversation not found."));
    }
    let mut ann = store.annotations(&id);
    for key in ["starred", "archived", "unread"] {
        if v[key].is_boolean() {
            ann[key] = v[key].clone()
        }
    }
    if let Some(ticket) = v["ticket"].as_str() {
        ann["ticket"] = ticket.chars().take(200).collect::<String>().into()
    }
    if let Some(ls) = v["labels"].as_array() {
        let known = store.labels();
        ann["labels"] = json!(
            ls.iter()
                .filter(|l| known.iter().any(|k| l.as_str() == Some(&k.id)))
                .collect::<Vec<_>>()
        );
    }
    store.annotate(&id, &ann).map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The data could not be saved.",
        )
    })?;
    notify(&a);
    Ok(Json(ann))
}
async fn messages(
    State(a): State<App>,
    Path(id): Path<String>,
    Query(q): Query<HashMap<String, String>>,
) -> ApiResult {
    let s = a
        .store
        .lock()
        .unwrap()
        .session(&id)
        .ok_or(error(StatusCode::NOT_FOUND, "Conversation not found."))?;
    let managed = runtime::managed_messages(&a.store.lock().unwrap(), &id);
    let rows = if let Some(rows) = managed {
        rows
    } else {
        tokio::task::spawn_blocking(move || discovery::messages(&s))
            .await
            .map_err(|_| {
                error(
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Reading was interrupted.",
                )
            })?
            .map_err(|e| error(StatusCode::UNPROCESSABLE_ENTITY, &e))?
    };
    let end = q
        .get("before")
        .and_then(|n| n.parse::<usize>().ok())
        .unwrap_or(rows.len())
        .min(rows.len());
    let start = end.saturating_sub(50);
    Ok(Json(
        json!({"items":rows[start..end],"before":start,"total":rows.len()}),
    ))
}
async fn labels(State(a): State<App>) -> Json<Value> {
    Json(json!(a.store.lock().unwrap().labels()))
}
async fn label_save(State(a): State<App>, Json(mut label): Json<Label>) -> ApiResult {
    if label.name.trim().is_empty()
        || label.name.len() > 100
        || !["teal", "lavender", "peach", "gray"].contains(&label.color.as_str())
    {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "Invalid label name or color.",
        ));
    }
    if label.id.is_empty() {
        label.id = uuid::Uuid::new_v4().to_string()
    }
    a.store.lock().unwrap().label(&label).map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The data could not be saved.",
        )
    })?;
    notify(&a);
    Ok(Json(json!(label)))
}
async fn label_delete(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    a.store.lock().unwrap().remove_label(&id).map_err(|_| {
        error(
            StatusCode::INTERNAL_SERVER_ERROR,
            "The data could not be saved.",
        )
    })?;
    notify(&a);
    Ok(Json(json!({"deleted":true})))
}
async fn drafts(State(a): State<App>) -> Json<Value> {
    Json(json!(a.store.lock().unwrap().drafts()))
}
async fn draft_new(State(a): State<App>) -> ApiResult {
    let mut d = Draft::empty();
    a.store
        .lock()
        .unwrap()
        .save_draft(&mut d)
        .map_err(|e| error(StatusCode::INTERNAL_SERVER_ERROR, &e))?;
    notify(&a);
    Ok(Json(json!(d)))
}
async fn draft_get(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    let d = a
        .store
        .lock()
        .unwrap()
        .draft(&id)
        .ok_or(error(StatusCode::NOT_FOUND, "Draft not found."))?;
    Ok(Json(json!(d)))
}
async fn draft_save(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(mut d): Json<Draft>,
) -> ApiResult {
    if d.id != id || d.markdown.len() > 512 * 1024 {
        return Err(error(
            StatusCode::BAD_REQUEST,
            "Invalid draft or content exceeding 512 KiB.",
        ));
    }
    if let Some(ref target) = d.session_id {
        if a.store.lock().unwrap().session(target).is_none() {
            return Err(error(StatusCode::BAD_REQUEST, "Recipient not found."));
        }
    }
    a.store.lock().unwrap().save_draft(&mut d).map_err(|e| {
        error(
            if e == "conflict" {
                StatusCode::CONFLICT
            } else {
                StatusCode::INTERNAL_SERVER_ERROR
            },
            if e == "conflict" {
                "This draft changed in another tab. Save a copy before reloading."
            } else {
                &e
            },
        )
    })?;
    notify(&a);
    Ok(Json(json!(d)))
}
async fn draft_delete(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    a.store
        .lock()
        .unwrap()
        .conn
        .execute("DELETE FROM drafts WHERE id=?", [id])
        .map_err(|_| {
            error(
                StatusCode::INTERNAL_SERVER_ERROR,
                "The data could not be saved.",
            )
        })?;
    notify(&a);
    Ok(Json(json!({"deleted":true})))
}
async fn prefs(State(a): State<App>) -> Json<Value> {
    let v = a
        .store
        .lock()
        .unwrap()
        .conn
        .query_row("SELECT data FROM preferences WHERE id=1", [], |r| {
            r.get::<_, String>(0)
        })
        .ok()
        .and_then(|s| serde_json::from_str::<Value>(&s).ok())
        .unwrap_or(json!({"theme":"dark","compact":false}));
    Json(v)
}
async fn prefs_save(State(a): State<App>, Json(v): Json<Value>) -> ApiResult {
    let v =
        json!({"theme":if v["theme"]=="light"{"light"}else{"dark"},"compact":v["compact"]==true});
    a.store.lock().unwrap().conn.execute("INSERT INTO preferences(id,data) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",[v.to_string()]).map_err(|_|error(StatusCode::INTERNAL_SERVER_ERROR,"The data could not be saved."))?;
    Ok(Json(v))
}
async fn event_stream(State(a): State<App>, headers: axum::http::HeaderMap) -> impl IntoResponse {
    let live = a.events.subscribe();
    let cursor = headers
        .get("last-event-id")
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.parse::<i64>().ok());
    let mut replay = vec![];
    if let Some(cursor) = cursor {
        let store = a.store.lock().unwrap();
        let min: i64 = store
            .conn
            .query_row("SELECT COALESCE(MIN(id),0) FROM event_log", [], |r| {
                r.get(0)
            })
            .unwrap_or(0);
        if cursor < min {
            replay.push(Event::default().event("resync").data("{}"));
        } else {
            let mut st = store
                .conn
                .prepare("SELECT id,data FROM event_log WHERE id>? ORDER BY id")
                .unwrap();
            for (id, data) in st
                .query_map([cursor], |r| {
                    Ok((r.get::<_, i64>(0)?, r.get::<_, String>(1)?))
                })
                .unwrap()
                .filter_map(Result::ok)
            {
                replay.push(Event::default().id(id.to_string()).data(data));
            }
        }
    } else {
        replay.push(Event::default().event("resync").data("{}"));
    }
    let backlog = tokio_stream::iter(replay.into_iter().map(Ok::<_, std::convert::Infallible>));
    let stream = BroadcastStream::new(live).map(|result| {
        Ok::<_, std::convert::Infallible>(match result {
            Ok(data) => {
                let value =
                    serde_json::from_str::<Value>(&data).unwrap_or(json!({"kind":"changed"}));
                let mut event = Event::default().data(value.to_string());
                if let Some(id) = value["id"].as_i64() {
                    event = event.id(id.to_string());
                }
                event
            }
            Err(_) => Event::default().event("resync").data("{}"),
        })
    });
    Sse::new(backlog.chain(stream)).keep_alive(axum::response::sse::KeepAlive::default())
}
async fn asset(uri: axum::http::Uri) -> Response {
    let path = uri.path().trim_start_matches('/');
    let key = if path.is_empty() { "index.html" } else { path };
    let Some(file) = Assets::get(key).or_else(|| {
        if !key.contains('.') && !key.starts_with("api/") {
            Assets::get("index.html")
        } else {
            None
        }
    }) else {
        return StatusCode::NOT_FOUND.into_response();
    };
    (
        [(
            axum::http::header::CONTENT_TYPE,
            mime_guess::from_path(key)
                .first_or_octet_stream()
                .to_string(),
        )],
        file.data.into_owned(),
    )
        .into_response()
}
fn main() {
    if std::env::args().nth(1).as_deref() == Some("native-hook") {
        terminal::hook_command();
        return;
    }
    tokio::runtime::Builder::new_multi_thread()
        .enable_all()
        .build()
        .expect("Create Relai runtime")
        .block_on(run());
}
async fn run() {
    let port = std::env::var("RELAI_PORT")
        .ok()
        .and_then(|p| p.parse().ok())
        .unwrap_or(4179);
    let dir = PathBuf::from(std::env::var("RELAI_DATA_DIR").unwrap_or_else(|_| {
        if cfg!(debug_assertions) {
            ".relai-data".into()
        } else {
            format!(
                "{}/relai",
                std::env::var("XDG_DATA_HOME").unwrap_or_else(|_| format!(
                    "{}/.local/share",
                    std::env::var("HOME").unwrap_or_default()
                ))
            )
        }
    }));
    std::fs::create_dir_all(&dir).expect("Create Relai data directory");
    let lock = std::fs::OpenOptions::new()
        .create(true)
        .truncate(false)
        .write(true)
        .open(dir.join("engine.lock"))
        .expect("Open engine lock");
    lock.try_lock()
        .expect("Another Relai engine already owns this data directory");
    let store = Store::open(&dir.join("relai.sqlite")).expect("Open Relai storage");
    delivery::migrate(&store).expect("Migrate Relai storage");
    terminal::migrate(&store).expect("Migrate terminal storage");
    delivery::recover(&store, now()).expect("Recover durable operations");
    store.conn.execute_batch("CREATE TABLE IF NOT EXISTS roots(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL)").unwrap();
    let roots = if std::env::var("RELAI_SESSION_ROOTS").is_ok() {
        discovery::roots()
    } else {
        store
            .conn
            .query_row("SELECT data FROM roots WHERE id=1", [], |r| {
                r.get::<_, String>(0)
            })
            .ok()
            .and_then(|v| serde_json::from_str(&v).ok())
            .unwrap_or_else(discovery::roots)
    };
    let (events, _) = broadcast::channel(64);
    let a = App {
        store: Arc::new(Mutex::new(store)),
        coverage: Arc::new(Mutex::new(vec![])),
        scanning: Arc::new(AtomicBool::new(false)),
        events,
        token: uuid::Uuid::new_v4().to_string(),
        port,
        roots: Arc::new(Mutex::new(roots)),
        indexing: Arc::new(AtomicBool::new(false)),
        index_errors: Arc::new(Mutex::new(0)),
        engine: Arc::new(runtime::Engine::new()),
        terminals: Arc::new(terminal::Manager::new()),
    };
    let api = Router::new()
        .route("/api/v1/bootstrap", get(bootstrap))
        .route("/api/v1/discovery", get(coverage).post(refresh))
        .route("/api/v1/roots", get(roots_get).put(roots_save))
        .route("/api/v1/sessions", get(sessions))
        .route("/api/v1/sessions/{id}", get(session_get).patch(annotate))
        .route("/api/v1/sessions/{id}/messages", get(messages))
        .route("/api/v1/labels", get(labels).post(label_save))
        .route("/api/v1/labels/{id}", axum::routing::delete(label_delete))
        .route("/api/v1/drafts", get(drafts).post(draft_new))
        .route(
            "/api/v1/drafts/{id}",
            get(draft_get).put(draft_save).delete(draft_delete),
        )
        .route("/api/v1/preferences", get(prefs).put(prefs_save))
        .route("/api/v1/mailbox", get(search::mailbox))
        .route("/api/v1/deliveries", axum::routing::post(delivery::submit))
        .route(
            "/api/v1/deliveries/{id}",
            get(delivery::get).patch(delivery::modify),
        )
        .route(
            "/api/v1/deliveries/{id}/actions",
            axum::routing::post(delivery::action),
        )
        .route("/api/v1/sessions/{id}/activity", get(runtime::activity))
        .route(
            "/api/v1/sessions/{id}/interrupt",
            axum::routing::post(runtime::interrupt),
        )
        .route(
            "/api/v1/requests/{id}/respond",
            axum::routing::post(runtime::respond),
        )
        .route(
            "/api/v1/sessions/{id}/terminal",
            get(terminal::get).post(terminal::action),
        )
        .route(
            "/api/v1/sessions/{id}/terminal/stream",
            get(terminal::stream),
        )
        .route(
            "/api/v1/terminal-requests/{id}/respond",
            axum::routing::post(terminal::respond),
        )
        .route("/api/v1/folders", get(folders::folders))
        .route("/api/v1/events", get(event_stream))
        .fallback(asset)
        .layer(axum::extract::DefaultBodyLimit::max(1024 * 1024))
        .layer(middleware::from_fn_with_state(a.clone(), guard))
        .with_state(a.clone());
    start_scan(a.clone());
    runtime::start(a.clone());
    let background = a.clone();
    tokio::spawn(async move {
        let (tx, mut rx) = tokio::sync::mpsc::channel(1);
        use notify::Watcher;
        let mut watcher =
            notify::recommended_watcher(move |event: Result<notify::Event, notify::Error>| {
                if event.is_ok_and(|e| {
                    matches!(
                        e.kind,
                        notify::EventKind::Create(_)
                            | notify::EventKind::Modify(_)
                            | notify::EventKind::Remove(_)
                    )
                }) {
                    let _ = tx.try_send(());
                }
            })
            .ok();
        let mut watched = std::collections::HashSet::new();
        loop {
            if let Some(ref mut w) = watcher {
                for r in background.roots.lock().unwrap().iter() {
                    let path = PathBuf::from(&r.path);
                    if path.exists() && watched.insert(path.clone()) {
                        let _ = w.watch(&path, notify::RecursiveMode::Recursive);
                    }
                }
            }
            if watcher.is_some() {
                tokio::select! {_=tokio::time::sleep(Duration::from_secs(30))=>{},_=rx.recv()=>{tokio::time::sleep(Duration::from_millis(250)).await;while rx.try_recv().is_ok(){}}}
            } else {
                tokio::time::sleep(Duration::from_secs(30)).await
            }
            start_scan(background.clone());
        }
    });
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", port))
        .await
        .expect("Port Relai disponible");
    println!("Relai : http://127.0.0.1:{port}");
    let shutdown = a.clone();
    axum::serve(listener, api)
        .with_graceful_shutdown(async move {
            let mut term =
                tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
                    .expect("SIGTERM handler");
            tokio::select! {_=tokio::signal::ctrl_c()=>{},_=term.recv()=>{}}
            terminal::shutdown(&shutdown).await;
            runtime::shutdown(shutdown).await;
        })
        .await
        .unwrap();
    drop(lock);
}
