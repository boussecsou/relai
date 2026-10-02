use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use std::time::{SystemTime, UNIX_EPOCH};
pub fn now() -> i64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as i64
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Session {
    pub id: String,
    pub native_id: String,
    pub tool: String,
    pub title: String,
    pub cwd: String,
    pub branch: String,
    pub modified: i64,
    pub archived_native: bool,
    pub source_kind: String,
    pub store: String,
    pub native_path: String,
    #[serde(default)]
    pub parent_id: String,
}
impl Session {
    pub fn public(&self, annotations: Value) -> Value {
        json!({"id":self.id,"nativeId":self.native_id,"tool":self.tool,"title":self.title,
            "cwd":self.cwd,"branch":self.branch,"branchSource":if self.branch.is_empty(){"unavailable"}else{"recorded"},
            "modified":self.modified,"archivedNative":self.archived_native,"sourceKind":self.source_kind,
            "sourceAvailable":std::path::Path::new(&self.native_path).is_file(),"parentId":self.parent_id,"state":"unknown","capabilities":{"read":true,"send":false,"terminal":false},"annotations":annotations})
    }
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Message {
    pub id: String,
    pub role: String,
    pub text: String,
    pub time: i64,
    pub activity: bool,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Coverage {
    pub tool: String,
    pub root: String,
    pub installed: bool,
    pub status: String,
    pub count: usize,
    pub errors: usize,
    pub detail: String,
    pub updated: i64,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Label {
    pub id: String,
    pub name: String,
    pub color: String,
}
#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Draft {
    pub id: String,
    pub session_id: Option<String>,
    pub tool: String,
    #[serde(default)]
    pub source: String,
    #[serde(default)]
    pub branch: String,
    pub cwd: String,
    pub title: String,
    pub markdown: String,
    pub labels: Vec<String>,
    pub ticket: String,
    pub revision: i64,
    pub modified: i64,
}
impl Draft {
    pub fn empty() -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            session_id: None,
            tool: String::new(),
            source: String::new(),
            branch: String::new(),
            cwd: String::new(),
            title: String::new(),
            markdown: String::new(),
            labels: vec![],
            ticket: String::new(),
            revision: 0,
            modified: now(),
        }
    }
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Delivery {
    pub id: String,
    pub draft: Draft,
    pub key: String,
    pub source: String,
    pub status: String,
    pub execution: String,
    pub stage: String,
    pub revision: i64,
    pub created: i64,
    pub modified: i64,
    pub due_at: Option<i64>,
    #[serde(default)]
    pub submitted_due_at: Option<i64>,
    #[serde(default)]
    pub queued_at: Option<i64>,
    pub timezone: String,
    pub native_thread_id: String,
    pub native_turn_id: String,
    pub accepted_at: Option<i64>,
    pub error: String,
    pub attempt: i64,
    pub baseline: usize,
}
