//! Durable outgoing operations. SQLite commits precede HTTP acknowledgements and RPC writes.
use crate::{ApiResult, App, error, model::*, notify, store::Store};
use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};
use rusqlite::params;
use serde_json::{Value, json};
use std::path::Path as FsPath;

pub fn migrate(store: &Store) -> rusqlite::Result<()> {
    store.conn.execute_batch("BEGIN IMMEDIATE;
      CREATE TABLE IF NOT EXISTS deliveries(id TEXT PRIMARY KEY, key TEXT UNIQUE NOT NULL, draft_id TEXT UNIQUE NOT NULL, session_id TEXT, status TEXT NOT NULL, created INTEGER NOT NULL, data TEXT NOT NULL);
      CREATE INDEX IF NOT EXISTS delivery_queue ON deliveries(session_id,status,created);
      CREATE TABLE IF NOT EXISTS attempts(delivery_id TEXT NOT NULL, attempt INTEGER NOT NULL, data TEXT NOT NULL, PRIMARY KEY(delivery_id,attempt));
      CREATE TABLE IF NOT EXISTS history_baselines(session_id TEXT PRIMARY KEY, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS runtime_items(session_id TEXT NOT NULL, turn_id TEXT NOT NULL, item_id TEXT NOT NULL, data TEXT NOT NULL, PRIMARY KEY(session_id,turn_id,item_id));
      CREATE TABLE IF NOT EXISTS incoming(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, text TEXT NOT NULL, kind TEXT NOT NULL, created INTEGER NOT NULL);
      CREATE INDEX IF NOT EXISTS incoming_session ON incoming(session_id,created);
      CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY, session_id TEXT NOT NULL, process TEXT NOT NULL, state TEXT NOT NULL, data TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS recent_folders(path TEXT PRIMARY KEY, used INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS event_log(id INTEGER PRIMARY KEY AUTOINCREMENT, data TEXT NOT NULL);
      PRAGMA user_version=1;
      COMMIT;")
}
impl Store {
    pub fn delivery(&self, id: &str) -> Option<Delivery> {
        self.conn
            .query_row("SELECT data FROM deliveries WHERE id=?", [id], |r| {
                r.get::<_, String>(0)
            })
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
    }
    pub fn deliveries(&self) -> Vec<Delivery> {
        let mut st = self
            .conn
            .prepare("SELECT data FROM deliveries ORDER BY rowid")
            .unwrap();
        st.query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(|r| serde_json::from_str(&r.ok()?).ok())
            .collect()
    }
    pub fn write_delivery(&self, d: &Delivery) -> rusqlite::Result<()> {
        self.conn.execute(
            "UPDATE deliveries SET session_id=?,status=?,data=? WHERE id=?",
            params![
                d.draft.session_id,
                d.status,
                serde_json::to_string(d).unwrap(),
                d.id
            ],
        )?;
        self.conn.execute("INSERT INTO attempts(delivery_id,attempt,data) VALUES(?,?,?) ON CONFLICT(delivery_id,attempt) DO UPDATE SET data=excluded.data",params![d.id,d.attempt,serde_json::to_string(d).unwrap()])?;
        Ok(())
    }
    pub fn public_session(&self, s: &Session) -> Value {
        let mut v = s.public(self.annotations(&s.id));
        let managed:Option<Delivery> = self.conn.query_row("SELECT data FROM deliveries WHERE session_id=? ORDER BY CASE WHEN json_extract(data,'$.execution') IN ('running','waiting_approval','waiting_input') THEN 0 ELSE 1 END,created DESC,id DESC LIMIT 1",[&s.id],|r|r.get::<_,String>(0)).ok().and_then(|data|serde_json::from_str(&data).ok());
        v["capabilities"]["send"] =
            json!(s.tool == "Codex" && crate::discovery::installed("Codex"));
        v["capabilities"]["resume"] = v["capabilities"]["send"].clone();
        v["capabilities"]["terminal"] = json!(crate::discovery::installed(&s.tool));
        v["sendingMode"] = json!(if crate::terminal::owned(self, &s.id) {
            "terminal"
        } else {
            "automatic"
        });
        v["capabilities"]["reason"] = json!(if s.tool == "Codex" {
            "Continues this native history with a Relai-managed engine. External CLI activity is unknown."
        } else {
            "Sending is not supported for this agent yet."
        });
        if let Some(d) = managed {
            v["state"] = json!(d.execution);
            v["managed"] = json!(true);
        }
        v
    }
    pub fn receive(&self, id: &str, sid: &str, text: &str, kind: &str) -> rusqlite::Result<()> {
        let inserted=self.conn.execute("INSERT INTO incoming(id,session_id,text,kind,created) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET text=excluded.text",params![id,sid,text,kind,now()])?;
        if inserted > 0 {
            let mut ann = self.annotations(sid);
            ann["unread"] = json!(true);
            self.annotate(sid, &ann)?;
        }
        Ok(())
    }
}
fn fail(status: StatusCode, code: &str, message: &str) -> (StatusCode, Json<Value>) {
    (
        status,
        Json(
            json!({"error":message,"code":code,"diagnosticId":uuid::Uuid::new_v4().to_string(),"retryable":matches!(status,StatusCode::SERVICE_UNAVAILABLE|StatusCode::INTERNAL_SERVER_ERROR)}),
        ),
    )
}
fn disk() -> (StatusCode, Json<Value>) {
    fail(
        StatusCode::INTERNAL_SERVER_ERROR,
        "storage_unavailable",
        "The operation could not be saved. Your text is preserved.",
    )
}

pub fn valid_zone(zone: &str) -> bool {
    !zone.is_empty()
        && zone.len() <= 100
        && std::path::Path::new(zone)
            .components()
            .all(|p| matches!(p, std::path::Component::Normal(_)))
        && std::path::Path::new("/usr/share/zoneinfo")
            .join(zone)
            .is_file()
}

pub async fn submit(State(a): State<App>, Json(v): Json<Value>) -> ApiResult {
    let key = v["idempotencyKey"]
        .as_str()
        .filter(|s| !s.is_empty() && s.len() <= 200)
        .ok_or_else(|| {
            fail(
                StatusCode::BAD_REQUEST,
                "invalid_request",
                "An idempotency key is required.",
            )
        })?;
    let id = v["draftId"].as_str().unwrap_or("");
    let mut store = a.store.lock().unwrap();
    let existing: Option<String> = store
        .conn
        .query_row(
            "SELECT id FROM deliveries WHERE key=? OR draft_id=?",
            params![key, id],
            |r| r.get(0),
        )
        .ok();
    if let Some(existing) = existing {
        let existing = store.delivery(&existing).unwrap();
        if existing.draft.id != id
            || v["revision"].as_i64() != Some(existing.draft.revision)
            || existing.submitted_due_at != v["dueAt"].as_i64()
        {
            return Err(fail(
                StatusCode::CONFLICT,
                "submission_conflict",
                "This draft or idempotency key was already submitted with different content. Review the saved delivery.",
            ));
        }
        return Ok(Json(json!(existing)));
    }
    let mut draft = store
        .draft(id)
        .ok_or_else(|| fail(StatusCode::NOT_FOUND, "draft_missing", "Draft not found."))?;
    if v["revision"].as_i64() != Some(draft.revision) {
        return Err(fail(
            StatusCode::CONFLICT,
            "draft_conflict",
            "This draft changed in another tab. Save a copy before submitting.",
        ));
    }
    let (source, native) = if let Some(ref sid) = draft.session_id {
        let session = store.session(sid).ok_or_else(|| {
            fail(
                StatusCode::NOT_FOUND,
                "recipient_missing",
                "Recipient not found.",
            )
        })?;
        draft.tool = session.tool;
        draft.branch = session.branch;
        if draft.cwd.is_empty() {
            draft.cwd = session.cwd;
        }
        draft.title = session.title;
        (session.store, session.native_id)
    } else {
        let root = a
            .roots
            .lock()
            .unwrap()
            .iter()
            .find(|r| r.tool == draft.tool && (draft.source.is_empty() || r.path == draft.source))
            .map(|r| r.path.clone())
            .unwrap_or_default();
        (root, String::new())
    };
    if draft.tool != "Codex" || !crate::discovery::installed("Codex") {
        return Err(fail(
            StatusCode::UNPROCESSABLE_ENTITY,
            "agent_unavailable",
            "Sending requires an installed Codex CLI. Other agents are read-only.",
        ));
    }
    if source.is_empty() {
        return Err(fail(
            StatusCode::UNPROCESSABLE_ENTITY,
            "source_missing",
            "Configure the Codex home in Sources before sending.",
        ));
    }
    if draft.markdown.trim().is_empty()
        || draft.title.trim().is_empty()
        || !FsPath::new(&draft.cwd).is_absolute()
        || !FsPath::new(&draft.cwd).is_dir()
    {
        return Err(fail(
            StatusCode::BAD_REQUEST,
            "invalid_destination",
            "Choose an existing absolute working folder, a chat title and a message.",
        ));
    }
    draft.cwd = std::fs::canonicalize(&draft.cwd)
        .map_err(|_| {
            fail(
                StatusCode::BAD_REQUEST,
                "folder_unavailable",
                "The working folder is not accessible.",
            )
        })?
        .to_string_lossy()
        .into();
    let due = v["dueAt"].as_i64();
    if v.get("dueAt")
        .is_some_and(|value| !value.is_null() && !value.is_i64())
    {
        return Err(fail(
            StatusCode::BAD_REQUEST,
            "invalid_schedule",
            "The scheduled instant must be a UTC timestamp.",
        ));
    }
    let timezone = v["timezone"].as_str().unwrap_or("UTC").to_owned();
    if due.is_some_and(|t| t <= now()) || !valid_zone(&timezone) {
        return Err(fail(
            StatusCode::BAD_REQUEST,
            "invalid_schedule",
            "Choose a future date and a valid time zone.",
        ));
    }
    let d = Delivery {
        id: uuid::Uuid::new_v4().to_string(),
        draft,
        key: key.into(),
        source,
        status: if due.is_some() { "scheduled" } else { "queued" }.into(),
        execution: "unknown".into(),
        stage: "saved".into(),
        revision: 1,
        created: now(),
        modified: now(),
        due_at: due,
        submitted_due_at: due,
        queued_at: if due.is_none() { Some(now()) } else { None },
        timezone,
        native_thread_id: native,
        native_turn_id: String::new(),
        accepted_at: None,
        error: String::new(),
        attempt: 0,
        baseline: 0,
    };
    let tx = store.conn.transaction().map_err(|_| disk())?;
    tx.execute("INSERT INTO deliveries(id,key,draft_id,session_id,status,created,data) VALUES(?,?,?,?,?,?,?)",params![d.id,d.key,d.draft.id,d.draft.session_id,d.status,d.created,serde_json::to_string(&d).unwrap()]).map_err(|_|disk())?;
    tx.execute(
        "DELETE FROM drafts WHERE id=? AND revision=?",
        params![d.draft.id, d.draft.revision],
    )
    .map_err(|_| disk())?;
    tx.execute("INSERT INTO recent_folders(path,used) VALUES(?,?) ON CONFLICT(path) DO UPDATE SET used=excluded.used",params![d.draft.cwd,now()]).map_err(|_|disk())?;
    tx.commit().map_err(|_| disk())?;
    drop(store);
    notify(&a);
    Ok(Json(json!(d)))
}
pub async fn get(State(a): State<App>, Path(id): Path<String>) -> ApiResult {
    let s = a.store.lock().unwrap();
    let d = s
        .delivery(&id)
        .ok_or(error(StatusCode::NOT_FOUND, "Delivery not found."))?;
    let mut st = s
        .conn
        .prepare("SELECT data FROM attempts WHERE delivery_id=? ORDER BY attempt")
        .map_err(|_| disk())?;
    let attempts: Vec<Value> = st
        .query_map([&id], |r| r.get::<_, String>(0))
        .map_err(|_| disk())?
        .filter_map(|r| serde_json::from_str(&r.ok()?).ok())
        .collect();
    Ok(Json(json!({"delivery":d,"attempts":attempts})))
}
pub async fn modify(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> ApiResult {
    change(a, id, v, false)
}
pub async fn action(
    State(a): State<App>,
    Path(id): Path<String>,
    Json(v): Json<Value>,
) -> ApiResult {
    if v["action"] == "reconcile" {
        return crate::runtime::reconcile(a, id, v).await;
    }
    change(a, id, v, true)
}
fn change(a: App, id: String, v: Value, action: bool) -> ApiResult {
    let mut s = a.store.lock().unwrap();
    let mut d = s
        .delivery(&id)
        .ok_or(error(StatusCode::NOT_FOUND, "Delivery not found."))?;
    if v["revision"].as_i64() != Some(d.revision) {
        return Err(fail(
            StatusCode::CONFLICT,
            "delivery_conflict",
            "This delivery changed. Reload before trying again.",
        ));
    }
    if d.status == "cancelled" {
        return Err(fail(
            StatusCode::CONFLICT,
            "delivery_cancelled",
            "This delivery was cancelled. Use its restored draft for a new send.",
        ));
    }
    let active = matches!(
        d.execution.as_str(),
        "running" | "waiting_approval" | "waiting_input"
    ) || d.status == "dispatching";
    if active {
        return Err(fail(
            StatusCode::CONFLICT,
            "delivery_active",
            "This delivery is active. Use Stop in its conversation.",
        ));
    }
    let operation = if action {
        v["action"].as_str().unwrap_or("")
    } else {
        "edit"
    };
    if d.key.starts_with("terminal:") && operation != "skip" {
        return Err(error(
            StatusCode::CONFLICT,
            "This prompt contains native terminal input. Verify its history and resend from the native terminal to preserve skills and attachments.",
        ));
    }
    let editable = matches!(
        d.status.as_str(),
        "queued" | "scheduled" | "missed" | "failed"
    );
    match operation {
        "edit" if editable => {
            if let Some(cwd) = v["cwd"].as_str() {
                if !FsPath::new(cwd).is_absolute() || !FsPath::new(cwd).is_dir() {
                    return Err(error(
                        StatusCode::BAD_REQUEST,
                        "Choose an existing absolute folder.",
                    ));
                }
                d.draft.cwd = std::fs::canonicalize(cwd)
                    .map_err(|_| error(StatusCode::BAD_REQUEST, "Folder is unavailable."))?
                    .to_string_lossy()
                    .into();
            }
            if let Some(text) = v["markdown"].as_str() {
                if text.trim().is_empty() || text.len() > 512 * 1024 {
                    return Err(error(
                        StatusCode::BAD_REQUEST,
                        "A message is required (maximum 512 KiB).",
                    ));
                }
                d.draft.markdown = text.into();
            }
        }
        "cancel" | "skip"
            if editable
                || d.status == "uncertain"
                || d.execution == "interrupted"
                || d.execution == "failed" =>
        {
            d.status = "cancelled".into();
            if d.accepted_at.is_none() {
                d.execution = "unknown".into();
            }
        }
        "retry"
            if d.status == "failed" || d.execution == "failed" || d.execution == "interrupted" =>
        {
            d.status = "queued".into();
            d.queued_at.get_or_insert(now());
            d.execution = "unknown".into();
            d.stage = "saved".into();
            d.error.clear();
            d.native_turn_id.clear();
        }
        "resend" if d.status == "uncertain" && v["confirmDuplicateRisk"] == true => {
            d.status = "queued".into();
            d.queued_at = Some(now());
            d.execution = "unknown".into();
            d.stage = "saved".into();
            d.error.clear();
            d.native_turn_id.clear();
        }
        "send_now" if matches!(d.status.as_str(), "scheduled" | "missed") => {
            d.status = "queued".into();
            d.queued_at = Some(now());
            d.due_at = None;
        }
        "reschedule" if editable => {
            let due = v["dueAt"]
                .as_i64()
                .filter(|t| *t > now())
                .ok_or(error(StatusCode::BAD_REQUEST, "Choose a future date."))?;
            let zone = v["timezone"].as_str().unwrap_or("UTC");
            if !valid_zone(zone) {
                return Err(error(StatusCode::BAD_REQUEST, "Choose a valid time zone."));
            }
            d.due_at = Some(due);
            d.timezone = zone.into();
            d.status = "scheduled".into();
            d.execution = "unknown".into();
        }
        _ => {
            return Err(fail(
                StatusCode::CONFLICT,
                "invalid_transition",
                "This action is not available in the current state.",
            ));
        }
    }
    d.revision += 1;
    d.modified = now();
    let tx = s.conn.transaction().map_err(|_| disk())?;
    tx.execute(
        "UPDATE deliveries SET status=?,data=? WHERE id=?",
        params![d.status, serde_json::to_string(&d).unwrap(), d.id],
    )
    .map_err(|_| disk())?;
    let restored = if operation == "cancel" {
        let mut draft = d.draft.clone();
        draft.id = uuid::Uuid::new_v4().to_string();
        draft.revision = 1;
        draft.modified = now();
        tx.execute(
            "INSERT INTO drafts(id,revision,data) VALUES(?,?,?)",
            params![
                draft.id,
                draft.revision,
                serde_json::to_string(&draft).unwrap()
            ],
        )
        .map_err(|_| disk())?;
        Some(draft)
    } else {
        None
    };
    tx.commit().map_err(|_| disk())?;
    drop(s);
    notify(&a);
    Ok(Json(json!({"delivery":d,"draft":restored})))
}

/// Only unsent queued work is replayable. A native request without a durable ack is uncertain.
pub fn recover(s: &Store, at: i64) -> rusqlite::Result<()> {
    for mut d in s.deliveries() {
        if d.status == "scheduled" && d.due_at.is_some_and(|t| t <= at) {
            d.status = "missed".into();
            d.modified = at;
            d.revision += 1;
            s.write_delivery(&d)?;
        } else if d.status == "dispatching"
            || matches!(
                d.execution.as_str(),
                "running" | "waiting_approval" | "waiting_input"
            )
        {
            if matches!(d.stage.as_str(), "saved" | "preparing" | "thread_saved") {
                d.status = "queued".into();
                d.queued_at.get_or_insert(now());
            } else {
                d.status = "uncertain".into();
                d.execution = "unknown".into();
                d.error="The engine stopped before the final outcome was saved. Verify the native history before resending.".into();
            }
            d.modified = at;
            d.revision += 1;
            s.write_delivery(&d)?;
        }
    }
    s.conn.execute(
        "UPDATE requests SET state='expired' WHERE state IN ('pending','answering')",
        [],
    )?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn additive_migration_preserves_legacy_data_and_recovery_does_not_replay() {
        let mut s = Store::open(FsPath::new(":memory:")).unwrap();
        let mut draft = Draft::empty();
        draft.markdown = "Keep this text".into();
        s.save_draft(&mut draft).unwrap();
        s.label(&Label {
            id: "label".into(),
            name: "Keep label".into(),
            color: "teal".into(),
        })
        .unwrap();
        migrate(&s).unwrap();
        migrate(&s).unwrap();
        assert_eq!(s.draft(&draft.id).unwrap().markdown, "Keep this text");
        assert_eq!(s.labels().len(), 1);
        for (id, status, stage, due) in [
            ("safe", "queued", "saved", None),
            ("ambiguous", "dispatching", "starting_turn", None),
            ("late", "scheduled", "saved", Some(1)),
        ] {
            let mut value = json!({"id":id,"draft":draft,"key":id,"source":"/native","status":status,"execution":"unknown","stage":stage,"revision":1,"created":0,"modified":0,"dueAt":due,"timezone":"UTC","nativeThreadId":"thread","nativeTurnId":"","acceptedAt":null,"error":"","attempt":0,"baseline":0});
            value["draft"]["id"] = json!(id);
            let d: Delivery = serde_json::from_value(value).unwrap();
            s.conn
                .execute(
                    "INSERT INTO deliveries VALUES(?,?,?,NULL,?,?,?)",
                    params![
                        d.id,
                        d.key,
                        d.id,
                        d.status,
                        d.created,
                        serde_json::to_string(&d).unwrap()
                    ],
                )
                .unwrap();
        }
        recover(&s, 10).unwrap();
        assert_eq!(
            s.deliveries()
                .iter()
                .map(|d| d.id.as_str())
                .collect::<Vec<_>>(),
            vec!["safe", "ambiguous", "late"]
        );
        assert_eq!(s.delivery("safe").unwrap().status, "queued");
        assert_eq!(s.delivery("ambiguous").unwrap().status, "uncertain");
        assert_eq!(s.delivery("late").unwrap().status, "missed");
        assert!(valid_zone("UTC"));
        assert!(!valid_zone("../etc/passwd"));
    }
}
