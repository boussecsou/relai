//! Version-bounded native readers. No harness command, migration, resume or prompt.
use crate::model::*;
use rusqlite::{Connection, OpenFlags, params};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::{HashMap, HashSet},
    fs::{self, File},
    io::{BufRead, BufReader, Read, Seek, SeekFrom},
    path::{Path, PathBuf},
    time::Duration,
};
use walkdir::WalkDir;
const METADATA_WINDOW: usize = 64 * 1024;
const MAX_LINE: usize = 1024 * 1024;
const MAX_HISTORY: u64 = 64 * 1024 * 1024;

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Root {
    pub tool: String,
    pub path: String,
}
pub fn roots() -> Vec<Root> {
    let home = std::env::var("HOME").unwrap_or_default();
    let xdg = std::env::var("XDG_DATA_HOME").unwrap_or_else(|_| format!("{home}/.local/share"));
    let mut r = vec![
        Root {
            tool: "Codex".into(),
            path: std::env::var("CODEX_HOME").unwrap_or_else(|_| format!("{home}/.codex")),
        },
        Root {
            tool: "Claude Code".into(),
            path: std::env::var("CLAUDE_CONFIG_DIR").unwrap_or_else(|_| format!("{home}/.claude")),
        },
        Root {
            tool: "OpenCode".into(),
            path: std::env::var("OPENCODE_DB").unwrap_or_else(|_| format!("{xdg}/opencode")),
        },
        Root {
            tool: "Pi".into(),
            path: std::env::var("PI_CODING_AGENT_SESSION_DIR")
                .unwrap_or_else(|_| format!("{home}/.pi/agent/sessions")),
        },
    ];
    if let Ok(custom) = std::env::var("RELAI_SESSION_ROOTS") {
        if let Ok(extra) = serde_json::from_str::<Vec<Root>>(&custom) {
            if std::env::var("RELAI_DISCOVERY_ISOLATED").as_deref() == Ok("1") {
                r = extra
            } else {
                r.extend(extra)
            }
        }
    }
    let mut seen = HashSet::new();
    r.retain(|root| seen.insert((root.tool.clone(), canonical(Path::new(&root.path)))));
    r
}
pub fn installed(tool: &str) -> bool {
    if tool == "Codex" {
        if let Ok(path) = std::env::var("RELAI_CODEX_BIN") {
            use std::os::unix::fs::PermissionsExt;
            return fs::metadata(path)
                .is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0);
        }
    }
    let exe = match tool {
        "Codex" => "codex",
        "Claude Code" => "claude",
        "OpenCode" => "opencode",
        "Pi" => "pi",
        _ => return false,
    };
    std::env::split_paths(&std::env::var_os("PATH").unwrap_or_default()).any(|p| {
        use std::os::unix::fs::PermissionsExt;
        fs::metadata(p.join(exe)).is_ok_and(|m| m.is_file() && m.permissions().mode() & 0o111 != 0)
    })
}
fn canonical(path: &Path) -> String {
    fs::canonicalize(path)
        .unwrap_or_else(|_| path.to_owned())
        .to_string_lossy()
        .into()
}
fn str_at(v: &Value, key: &str) -> String {
    v.get(key)
        .and_then(Value::as_str)
        .unwrap_or_default()
        .to_owned()
}
fn timestamp(v: &Value) -> i64 {
    if let Some(n) = v.as_i64() {
        return if n < 100_000_000_000 { n * 1000 } else { n };
    }
    v.as_str()
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|t| t.timestamp_millis())
        .unwrap_or(0)
}
fn mtime(path: &Path) -> i64 {
    fs::metadata(path)
        .ok()
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as i64)
        .unwrap_or(0)
}
pub fn fingerprint(s: &Session) -> String {
    let path = Path::new(&s.native_path);
    format!(
        "{}:{}:{}:{}",
        s.modified,
        mtime(path),
        fs::metadata(path).map(|m| m.len()).unwrap_or(0),
        mtime(&PathBuf::from(format!("{}-wal", s.native_path)))
    )
}
pub(crate) fn session(
    root: &Root,
    id: String,
    cwd: String,
    title: String,
    branch: String,
    modified: i64,
    path: &Path,
) -> Session {
    let store = canonical(Path::new(&root.path));
    let identity = format!("wsl:{}:{store}:{id}", root.tool);
    Session {
        id: uuid::Uuid::new_v5(&uuid::Uuid::NAMESPACE_URL, identity.as_bytes()).to_string(),
        native_id: id,
        tool: root.tool.clone(),
        title: if title.trim().is_empty() {
            "Untitled conversation".into()
        } else {
            title.chars().take(200).collect()
        },
        cwd,
        branch,
        modified,
        archived_native: false,
        source_kind: "history".into(),
        store,
        native_path: canonical(path),
        parent_id: String::new(),
    }
}
fn open_native(path: &Path) -> Result<Connection, String> {
    let c = Connection::open_with_flags(
        path,
        OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_NO_MUTEX,
    )
    .map_err(|_| "Native database is temporarily inaccessible.".to_string())?;
    c.busy_timeout(Duration::from_millis(250))
        .map_err(|_| "Native database is busy.".to_string())?;
    c.execute_batch("PRAGMA query_only=ON;")
        .map_err(|_| "Lecture seule indisponible.".to_string())?;
    Ok(c)
}
fn columns(c: &Connection, table: &str) -> HashSet<String> {
    c.prepare(&format!("PRAGMA table_info({table})"))
        .ok()
        .and_then(|mut st| {
            st.query_map([], |r| r.get::<_, String>(1))
                .ok()
                .map(|rows| rows.filter_map(Result::ok).collect())
        })
        .unwrap_or_default()
}
fn expression(cols: &HashSet<String>, names: &[&str], fallback: &str) -> String {
    names
        .iter()
        .find(|s| cols.contains(**s))
        .map(|s| format!("\"{s}\""))
        .unwrap_or(fallback.into())
}
fn sql_sessions(root: &Root, path: &Path) -> Result<Vec<Session>, String> {
    let c = open_native(path)?;
    let table = if root.tool == "Codex" {
        "threads"
    } else {
        "session"
    };
    let cols = columns(&c, table);
    if !cols.contains("id") {
        return Err("Unsupported native database schema.".into());
    }
    let codex = root.tool == "Codex";
    let title = if codex {
        format!(
            "COALESCE(NULLIF({},''),NULLIF({},''),{})",
            expression(&cols, &["name"], "NULL"),
            expression(&cols, &["title"], "NULL"),
            expression(&cols, &["first_user_message", "preview"], "''")
        )
    } else {
        expression(&cols, &["title"], "''")
    };
    let sql = format!(
        "SELECT id,{},{},{},{},{},{},{} FROM {table}",
        expression(&cols, &[if codex { "cwd" } else { "directory" }], "''"),
        title,
        expression(&cols, &["git_branch"], "''"),
        expression(
            &cols,
            if codex {
                &["updated_at_ms", "updated_at"]
            } else {
                &["time_updated"]
            },
            "0"
        ),
        expression(&cols, &["rollout_path"], "''"),
        expression(
            &cols,
            if codex {
                &["archived"]
            } else {
                &["time_archived"]
            },
            "0"
        ),
        expression(&cols, &["parent_id"], "''")
    );
    let mut st = c
        .prepare(&sql)
        .map_err(|_| "Incompatible native metadata.".to_string())?;
    let rows = st
        .query_map([], |r| {
            Ok((
                r.get::<_, String>(0)?,
                r.get::<_, String>(1).unwrap_or_default(),
                r.get::<_, String>(2).unwrap_or_default(),
                r.get::<_, String>(3).unwrap_or_default(),
                r.get::<_, i64>(4).unwrap_or(0),
                r.get::<_, String>(5).unwrap_or_default(),
                r.get::<_, i64>(6).unwrap_or(0),
                r.get::<_, String>(7).unwrap_or_default(),
            ))
        })
        .map_err(|_| "Metadata reading was interrupted.".to_string())?;
    let mut result = vec![];
    for row in rows {
        let (id, cwd, title, branch, time, rollout, archived, parent) =
            row.map_err(|_| "A native record cannot be read.".to_string())?;
        let target = if codex && !rollout.is_empty() {
            PathBuf::from(rollout)
        } else {
            path.to_owned()
        };
        let mut s = session(
            root,
            id,
            cwd,
            title,
            branch,
            if time < 100_000_000_000 {
                time * 1000
            } else {
                time
            },
            &target,
        );
        s.archived_native = archived > 0;
        s.parent_id = parent;
        if !codex {
            s.source_kind = "sqlite".into()
        };
        result.push(s);
    }
    Ok(result)
}
fn sample(path: &Path) -> Result<Vec<Value>, String> {
    let mut f = File::open(path).map_err(|_| "Historique inaccessible.".to_string())?;
    let len = f
        .metadata()
        .map_err(|_| "File metadata is unavailable.".to_string())?
        .len();
    let mut bytes = vec![0; METADATA_WINDOW.min(len as usize)];
    f.read_exact(&mut bytes)
        .map_err(|_| "History changed while being read.".to_string())?;
    let mut out = bytes
        .split(|b| *b == b'\n')
        .filter_map(|line| serde_json::from_slice(line).ok())
        .collect::<Vec<Value>>();
    if len > METADATA_WINDOW as u64 {
        f.seek(SeekFrom::End(-(METADATA_WINDOW as i64)))
            .map_err(|_| "Lecture de fin impossible.".to_string())?;
        let mut tail = vec![];
        f.read_to_end(&mut tail)
            .map_err(|_| "Lecture de fin impossible.".to_string())?;
        out.extend(
            tail.split(|b| *b == b'\n')
                .skip(1)
                .filter_map(|line| serde_json::from_slice(line).ok()),
        );
    }
    Ok(out)
}
fn file_session(root: &Root, path: &Path) -> Result<Session, String> {
    use std::sync::{Mutex, OnceLock};
    type Cache = HashMap<String, (String, Session)>;
    static CACHE: OnceLock<Mutex<Cache>> = OnceLock::new();
    let cache = CACHE.get_or_init(|| Mutex::new(HashMap::new()));
    let meta = fs::metadata(path).map_err(|_| "Historique inaccessible.")?;
    let signature = format!("{:?}:{}", meta.modified(), meta.len());
    let key = format!("{}:{}", root.tool, canonical(path));
    if let Some((old, s)) = cache.lock().unwrap().get(&key) {
        if *old == signature {
            return Ok(s.clone());
        }
    }
    let s = read_file_session(root, path)?;
    let mut cache = cache.lock().unwrap();
    if cache.len() > 100_000 {
        cache.clear();
    }
    cache.insert(key, (signature, s.clone()));
    Ok(s)
}
fn read_file_session(root: &Root, path: &Path) -> Result<Session, String> {
    let records = sample(path)?;
    let mut id = String::new();
    let mut cwd = String::new();
    let mut title = String::new();
    let mut branch = String::new();
    let mut parent = String::new();
    let mut explicit = String::new();
    for v in &records {
        match root.tool.as_str() {
            "Codex" => {
                let p = &v["payload"];
                if v["type"] == "session_meta" {
                    id = str_at(p, "id");
                    cwd = str_at(p, "cwd");
                    branch = str_at(&p["git"], "branch");
                }
            }
            "Claude Code" => {
                let next = str_at(v, "sessionId");
                if !next.is_empty() {
                    id = next
                }
                let next = str_at(v, "cwd");
                if !next.is_empty() {
                    cwd = next
                }
                let next = str_at(v, "gitBranch");
                if !next.is_empty() {
                    branch = next
                }
                for key in ["summary", "aiTitle"] {
                    let next = str_at(v, key);
                    if !next.is_empty() {
                        title = next
                    }
                }
                let name = str_at(v, "customTitle");
                if !name.is_empty() {
                    explicit = name
                }
                if v["isSidechain"] == true {
                    parent = "subagent".into()
                }
            }
            "Pi" => {
                if v["type"] == "session" {
                    id = str_at(v, "id");
                    cwd = str_at(v, "cwd")
                }
                if v["type"] == "session_info" {
                    title = str_at(v, "name")
                }
            }
            _ => {}
        }
    }
    if !explicit.is_empty() {
        title = explicit
    }
    if id.is_empty() {
        return Err("Native identity was not found in the metadata.".into());
    }
    if title.is_empty() {
        for v in &records {
            let p = if root.tool == "Codex" {
                &v["payload"]
            } else if v.get("message").is_some() {
                &v["message"]
            } else {
                v
            };
            if p["role"] == "user" {
                let text = text_content(&p["content"]);
                if !text.is_empty() {
                    title = text
                        .lines()
                        .find(|l| !l.trim().is_empty())
                        .unwrap_or_default()
                        .chars()
                        .take(120)
                        .collect();
                    break;
                }
            }
        }
    }
    let mut s = session(root, id, cwd, title, branch, mtime(path), path);
    s.parent_id = parent;
    s.archived_native = path
        .components()
        .any(|p| p.as_os_str() == "archived_sessions");
    Ok(s)
}
pub fn scan(root: &Root, mut emit: impl FnMut(Session)) -> Coverage {
    let mut cov = Coverage {
        tool: root.tool.clone(),
        root: root.path.clone(),
        installed: installed(&root.tool),
        status: "complete".into(),
        count: 0,
        errors: 0,
        detail: String::new(),
        updated: now(),
    };
    let base = Path::new(&root.path);
    if !base.exists() {
        cov.status = "absent".into();
        cov.detail = "No histories in this source.".into();
        return cov;
    }
    let mut names = HashMap::new();
    if root.tool == "Codex" {
        if let Ok(file) = File::open(base.join("session_index.jsonl")) {
            for line in BufReader::new(file).lines().map_while(Result::ok) {
                if let Ok(v) = serde_json::from_str::<Value>(&line) {
                    let id = str_at(&v, "id");
                    let name = str_at(&v, "thread_name");
                    if !id.is_empty() && !name.is_empty() {
                        names.insert(id, name);
                    }
                }
            }
        }
    }
    let mut seen = HashSet::new();
    let mut sql_ids = HashSet::new();
    if ["Codex", "OpenCode"].contains(&root.tool.as_str()) {
        let dbs = if base.is_file() {
            vec![base.to_owned()]
        } else {
            fs::read_dir(base)
                .into_iter()
                .flatten()
                .filter_map(Result::ok)
                .map(|e| e.path())
                .filter(|p| {
                    let name = p.file_name().unwrap_or_default().to_string_lossy();
                    if root.tool == "Codex" {
                        name.starts_with("state_") && name.ends_with(".sqlite")
                    } else {
                        name.starts_with("opencode") && name.ends_with(".db")
                    }
                })
                .collect()
        };
        for db in dbs {
            match sql_sessions(root, &db) {
                Ok(rows) => {
                    for mut s in rows {
                        if let Some(name) = names.get(&s.native_id) {
                            s.title = name.clone()
                        }
                        if seen.insert(s.id.clone()) {
                            sql_ids.insert(s.native_id.clone());
                            cov.count += 1;
                            emit(s)
                        }
                    }
                }
                Err(e) => {
                    cov.errors += 1;
                    cov.detail = e
                }
            }
        }
    }
    let directories = match root.tool.as_str() {
        "Codex" => vec![base.join("sessions"), base.join("archived_sessions")],
        "Claude Code" => vec![if base.file_name().is_some_and(|n| n == "projects") {
            base.to_owned()
        } else {
            base.join("projects")
        }],
        "Pi" => vec![base.to_owned()],
        _ => vec![],
    };
    for directory in directories {
        if !directory.exists() {
            continue;
        }
        for entry in WalkDir::new(directory).follow_links(false) {
            let entry = match entry {
                Ok(e) => e,
                Err(_) => {
                    cov.errors += 1;
                    continue;
                }
            };
            if !entry.file_type().is_file() || entry.path().extension().is_none_or(|e| e != "jsonl")
            {
                continue;
            }
            match file_session(root, entry.path()) {
                Ok(mut s) => {
                    if let Some(name) = names.get(&s.native_id) {
                        s.title = name.clone()
                    }
                    if !sql_ids.contains(&s.native_id) && seen.insert(s.id.clone()) {
                        cov.count += 1;
                        emit(s)
                    }
                }
                Err(e) => {
                    cov.errors += 1;
                    cov.detail = e
                }
            }
        }
    }
    if cov.errors > 0 {
        cov.status = "partial".into()
    };
    cov
}
pub fn text_content(v: &Value) -> String {
    if let Some(s) = v.as_str() {
        return s.to_owned();
    }
    if let Some(a) = v.as_array() {
        return a
            .iter()
            .filter_map(|part| part.get("text").and_then(Value::as_str))
            .collect::<Vec<_>>()
            .join("\n\n");
    }
    str_at(v, "text")
}
fn read_jsonl(path: &Path) -> Result<Vec<Value>, String> {
    let file = File::open(path)
        .map_err(|_| "History is unavailable. Its folder may have moved.".to_string())?;
    if file
        .metadata()
        .map_err(|_| "Historique inaccessible.")?
        .len()
        > MAX_HISTORY
    {
        return Err(
            "History exceeds 64 MiB. Partial reading is unavailable in this version.".into(),
        );
    }
    let mut reader = BufReader::new(file);
    let mut records = vec![];
    loop {
        let mut bytes = vec![];
        let n = Read::by_ref(&mut reader)
            .take(MAX_LINE as u64 + 1)
            .read_until(b'\n', &mut bytes)
            .map_err(|_| "Reading was interrupted.")?;
        if n == 0 {
            break;
        }
        if n > MAX_LINE {
            return Err("A history record exceeds the reading limit.".into());
        }
        if bytes.last() != Some(&b'\n') {
            break;
        }
        if bytes.iter().all(u8::is_ascii_whitespace) {
            continue;
        }
        match serde_json::from_slice(&bytes) {
            Ok(v) => records.push(v),
            Err(_) => {
                return Err(
                    "A complete history record is corrupt. The native source remains untouched."
                        .into(),
                );
            }
        }
    }
    Ok(records)
}
pub fn messages(s: &Session) -> Result<Vec<Message>, String> {
    if s.source_kind == "sqlite" {
        return sqlite_messages(s);
    }
    let records = read_jsonl(Path::new(&s.native_path))?;
    let mut out = vec![];
    let mut links = HashMap::new();
    let mut ordered = vec![];
    let mut ancestry = HashMap::new();
    for (index, v) in records.into_iter().enumerate() {
        let node = str_at(
            &v,
            if s.tool == "Claude Code" {
                "uuid"
            } else {
                "id"
            },
        );
        if !node.is_empty() {
            ancestry.insert(
                node,
                str_at(
                    &v,
                    if s.tool == "Claude Code" {
                        "parentUuid"
                    } else {
                        "parentId"
                    },
                ),
            );
        }
        let kind = str_at(&v, "type");
        let p = if s.tool == "Codex" {
            if kind != "response_item" {
                continue;
            }
            &v["payload"]
        } else {
            if !["user", "assistant", "message"].contains(&kind.as_str()) {
                continue;
            }
            &v["message"]
        };
        if s.tool == "Codex"
            && [
                "function_call",
                "function_call_output",
                "custom_tool_call",
                "custom_tool_call_output",
            ]
            .contains(&p["type"].as_str().unwrap_or(""))
        {
            let text = if p["type"].as_str().unwrap_or("").ends_with("output") {
                format!("Tool result\n{}", text_content(&p["output"]))
            } else {
                format!("Outil : {}\n{}", str_at(p, "name"), str_at(p, "arguments"))
            };
            out.push(Message {
                id: format!("{}:{index}", s.native_id),
                role: "assistant".into(),
                text,
                time: timestamp(&v["timestamp"]),
                activity: true,
            });
            continue;
        }
        let role = str_at(p, "role");
        if !["user", "assistant", "toolResult"].contains(&role.as_str()) {
            continue;
        }
        let content = &p["content"];
        let text = text_content(content);
        let activity = role == "toolResult" || text.trim().is_empty();
        let text = if activity {
            if let Some(a) = content.as_array() {
                a.iter()
                    .map(|b| match b["type"].as_str() {
                        Some("tool_use") => format!("Outil : {}", str_at(b, "name")),
                        Some("tool_result") => {
                            format!("Tool result\n{}", text_content(&b["content"]))
                        }
                        _ => String::new(),
                    })
                    .filter(|t| !t.is_empty())
                    .collect::<Vec<_>>()
                    .join("\n\n")
            } else {
                String::new()
            }
        } else {
            text
        };
        if text.is_empty() {
            continue;
        }
        let id = if s.tool == "Claude Code" {
            str_at(&v, "uuid")
        } else {
            str_at(&v, "id")
        };
        let id = if id.is_empty() {
            format!("{}:{index}", s.native_id)
        } else {
            id
        };
        let parent = str_at(
            &v,
            if s.tool == "Claude Code" {
                "parentUuid"
            } else {
                "parentId"
            },
        );
        let message = Message {
            id: id.clone(),
            role: if role == "toolResult" {
                "assistant".into()
            } else {
                role
            },
            text,
            time: timestamp(&v["timestamp"]),
            activity,
        };
        if s.tool == "Codex" {
            out.push(message)
        } else {
            if !links.contains_key(&id) {
                ordered.push(id.clone())
            }
            links.insert(id, (parent, message));
        }
    }
    if s.tool != "Codex" {
        if let Some(last) = ordered.last() {
            let mut id = last.clone();
            let mut visited = HashSet::new();
            while visited.insert(id.clone()) {
                if let Some((parent, m)) = links.get(&id) {
                    out.push(m.clone());
                    id = parent.clone();
                } else if let Some(parent) = ancestry.get(&id) {
                    id = parent.clone()
                } else {
                    break;
                }
            }
            out.reverse();
            // Some old transcripts have no parent links: preserve chronological records.
            if out.len() == 1 && ordered.len() > 1 && links.values().all(|(p, _)| p.is_empty()) {
                out = ordered
                    .iter()
                    .filter_map(|id| links.get(id).map(|(_, m)| m.clone()))
                    .collect()
            }
        }
    }
    Ok(out)
}
fn sqlite_messages(s: &Session) -> Result<Vec<Message>, String> {
    let c = open_native(Path::new(&s.native_path))?;
    let mut out = vec![];
    let has_new = columns(&c, "session_message").contains("data");
    if has_new {
        let mut st=c.prepare("SELECT id,type,data,time_created FROM session_message WHERE session_id=? ORDER BY seq").map_err(|_|"Messages natifs incompatibles.")?;
        let rows = st
            .query_map([&s.native_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, String>(2)?,
                    r.get::<_, i64>(3)?,
                ))
            })
            .map_err(|_| "Messages indisponibles.")?;
        for row in rows.filter_map(Result::ok) {
            let (id, kind, data, time) = row;
            let Ok(v) = serde_json::from_str::<Value>(&data) else {
                continue;
            };
            let role = if kind.contains("user") {
                "user"
            } else if kind.contains("assistant") {
                "assistant"
            } else {
                continue;
            };
            let p = if v.get("message").is_some() {
                &v["message"]
            } else {
                &v
            };
            let mut text = text_content(&p["content"]);
            if text.is_empty() {
                text = str_at(p, "text")
            }
            if text.is_empty() {
                text = text_content(&p["parts"])
            }
            if !text.is_empty() {
                out.push(Message {
                    id,
                    role: role.into(),
                    text,
                    time,
                    activity: false,
                })
            }
        }
    }
    if out.is_empty() {
        let mut st=c.prepare("SELECT id,data,time_created FROM message WHERE session_id=? ORDER BY time_created,id").map_err(|_|"Messages natifs incompatibles.")?;
        let rows = st
            .query_map([&s.native_id], |r| {
                Ok((
                    r.get::<_, String>(0)?,
                    r.get::<_, String>(1)?,
                    r.get::<_, i64>(2)?,
                ))
            })
            .map_err(|_| "Messages indisponibles.")?;
        for row in rows.filter_map(Result::ok) {
            let (id, data, time) = row;
            let v: Value = serde_json::from_str(&data).unwrap_or(Value::Null);
            let role = str_at(&v, "role");
            if !["user", "assistant"].contains(&role.as_str()) {
                continue;
            }
            let mut parts = c
                .prepare("SELECT data FROM part WHERE message_id=? ORDER BY time_created,id")
                .map_err(|_| "Contenu natif incompatible.")?;
            let mut texts = vec![];
            for data in parts
                .query_map(params![id], |r| r.get::<_, String>(0))
                .map_err(|_| "Contenu indisponible.")?
                .filter_map(Result::ok)
            {
                if let Ok(v) = serde_json::from_str::<Value>(&data) {
                    if v["type"] == "text" {
                        texts.push(str_at(&v, "text"))
                    }
                }
            }
            if !texts.is_empty() {
                out.push(Message {
                    id,
                    role,
                    text: texts.join("\n\n"),
                    time,
                    activity: false,
                })
            }
        }
    }
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    fn lines(path: &Path, rows: &[Value]) {
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        fs::write(
            path,
            rows.iter().map(|v| format!("{v}\n")).collect::<String>(),
        )
        .unwrap()
    }
    fn root(tool: &str, path: &Path) -> Root {
        Root {
            tool: tool.into(),
            path: path.to_string_lossy().into(),
        }
    }
    #[test]
    fn codex_index_names_archives_and_partial_append() {
        let dir = tempfile::tempdir().unwrap();
        let r = root("Codex", dir.path());
        let file = dir.path().join("archived_sessions/old.jsonl");
        lines(
            &file,
            &[
                json!({"type":"session_meta","payload":{"id":"c","cwd":"/repo","git":{"branch":"main"}}}),
                json!({"type":"response_item","payload":{"role":"user","content":[{"type":"input_text","text":"Bonjour"}]}}),
                json!({"type":"response_item","payload":{"role":"assistant","content":[{"type":"output_text","text":"Réponse"}]}}),
            ],
        );
        lines(
            &dir.path().join("session_index.jsonl"),
            &[
                json!({"id":"c","thread_name":"Ancien nom"}),
                json!({"id":"c","thread_name":"Nom choisi"}),
            ],
        );
        let mut found = vec![];
        let cov = scan(&r, |s| found.push(s));
        assert_eq!(cov.count, 1);
        assert_eq!(found[0].title, "Nom choisi");
        assert!(found[0].archived_native);
        use std::io::Write;
        let mut f = fs::OpenOptions::new().append(true).open(&file).unwrap();
        write!(f, "{{\"type\":").unwrap();
        assert_eq!(messages(&found[0]).unwrap().len(), 2);
        let second = root("Codex", &dir.path().join("."));
        let mut again = vec![];
        scan(&second, |s| again.push(s));
        assert_eq!(again[0].id, found[0].id);
    }
    #[test]
    fn codex_database_deduplicates_rollouts_and_keeps_recorded_branch() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("sessions/rollout.jsonl");
        lines(
            &file,
            &[
                json!({"type":"session_meta","payload":{"id":"db-session","cwd":"/repo"}}),
                json!({"type":"response_item","payload":{"type":"function_call","name":"shell","arguments":"{}"}}),
                json!({"type":"response_item","payload":{"type":"function_call_output","output":"Terminé"}}),
            ],
        );
        let c = Connection::open(dir.path().join("state_5.sqlite")).unwrap();
        c.execute_batch("CREATE TABLE threads(id TEXT,cwd TEXT,title TEXT,name TEXT,updated_at INTEGER,rollout_path TEXT,git_branch TEXT,archived INTEGER);").unwrap();
        c.execute("INSERT INTO threads VALUES('db-session','/repo','Premier prompt','Nom choisi',1700000000,?,'main',0)",[file.to_string_lossy().to_string()]).unwrap();
        let mut found = vec![];
        assert_eq!(scan(&root("Codex", dir.path()), |s| found.push(s)).count, 1);
        assert_eq!(found[0].title, "Nom choisi");
        assert_eq!(found[0].modified, 1700000000000);
        assert_eq!(found[0].branch, "main");
        assert_eq!(
            messages(&found[0])
                .unwrap()
                .iter()
                .filter(|m| m.activity)
                .count(),
            2
        );
        use std::io::Write;
        writeln!(
            fs::OpenOptions::new().append(true).open(&file).unwrap(),
            "corrompu"
        )
        .unwrap();
        assert!(messages(&found[0]).unwrap_err().contains("corrupt"));
    }
    #[test]
    fn claude_ancestry_skips_progress_and_old_branches() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("projects/p/a.jsonl");
        lines(
            &file,
            &[
                json!({"type":"user","sessionId":"cl","uuid":"u","cwd":"/repo","message":{"role":"user","content":"Demande"}}),
                json!({"type":"assistant","sessionId":"cl","uuid":"old","parentUuid":"u","message":{"role":"assistant","content":"Ancienne branche"}}),
                json!({"type":"progress","uuid":"p","parentUuid":"u"}),
                json!({"type":"assistant","uuid":"a","parentUuid":"p","message":{"role":"assistant","content":[{"type":"text","text":"Réponse retenue"}]}}),
                json!({"type":"custom-title","sessionId":"cl","customTitle":"Mon titre"}),
                json!({"type":"summary","sessionId":"cl","summary":"Résumé machine"}),
            ],
        );
        let mut found = vec![];
        scan(&root("Claude Code", dir.path()), |s| found.push(s));
        assert_eq!(found[0].title, "Mon titre");
        let ms = messages(&found[0]).unwrap();
        assert_eq!(ms.len(), 2);
        assert_eq!(ms[1].text, "Réponse retenue");
    }
    #[test]
    fn pi_header_name_and_compaction_ancestry() {
        let dir = tempfile::tempdir().unwrap();
        let file = dir.path().join("p.jsonl");
        lines(
            &file,
            &[
                json!({"type":"session","version":3,"id":"pi","cwd":"/repo"}),
                json!({"type":"message","id":"u","parentId":null,"message":{"role":"user","content":[{"type":"text","text":"Salut"}]}}),
                json!({"type":"compaction","id":"c","parentId":"u"}),
                json!({"type":"message","id":"a","parentId":"c","message":{"role":"assistant","content":[{"type":"text","text":"Bonjour"}]}}),
                json!({"type":"session_info","id":"n","parentId":"a","name":"Pi nommé"}),
            ],
        );
        let mut found = vec![];
        assert_eq!(scan(&root("Pi", dir.path()), |s| found.push(s)).count, 1);
        assert_eq!(found[0].title, "Pi nommé");
        assert_eq!(messages(&found[0]).unwrap().len(), 2);
    }
    #[test]
    fn opencode_sqlite_wal_is_read_only_and_unknown_schema_is_partial() {
        let dir = tempfile::tempdir().unwrap();
        let db = dir.path().join("opencode.db");
        let c = Connection::open(&db).unwrap();
        c.execute_batch("PRAGMA journal_mode=WAL;CREATE TABLE session(id TEXT,title TEXT,directory TEXT,time_updated INTEGER);CREATE TABLE message(id TEXT,session_id TEXT,time_created INTEGER,data TEXT);CREATE TABLE part(id TEXT,message_id TEXT,time_created INTEGER,data TEXT);INSERT INTO session VALUES('oc','OpenCode réel','/repo',1700000000000);").unwrap();
        c.execute(
            "INSERT INTO message VALUES('m','oc',1,?)",
            [json!({"role":"assistant"}).to_string()],
        )
        .unwrap();
        c.execute(
            "INSERT INTO part VALUES('p','m',1,?)",
            [json!({"type":"text","text":"Texte natif"}).to_string()],
        )
        .unwrap();
        let bytes = fs::read(&db).unwrap();
        let wal = fs::read(format!("{}-wal", db.display())).unwrap();
        let mut found = vec![];
        assert_eq!(
            scan(&root("OpenCode", dir.path()), |s| found.push(s)).count,
            1
        );
        assert_eq!(messages(&found[0]).unwrap()[0].text, "Texte natif");
        assert_eq!(fs::read(&db).unwrap(), bytes);
        assert_eq!(fs::read(format!("{}-wal", db.display())).unwrap(), wal);
        let bad = dir.path().join("opencode-unknown.db");
        Connection::open(&bad)
            .unwrap()
            .execute_batch("CREATE TABLE other(id TEXT)")
            .unwrap();
        let cov = scan(&root("OpenCode", dir.path()), |_| {});
        assert_eq!(cov.status, "partial");
        assert_eq!(cov.count, 1);
    }
}
