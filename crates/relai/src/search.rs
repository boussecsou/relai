//! One parser and one scope contract for every mailbox.
use crate::{ApiResult, App, error, store::Store};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use rusqlite::{params_from_iter, types::Value as SqlValue};
use serde_json::{Value, json};
use std::collections::HashMap;
#[derive(Debug, Default)]
pub struct Search {
    pub scope: String,
    pub terms: Vec<String>,
    pub filters: Vec<(String, String)>,
}
const SCOPES: &[&str] = &[
    "inbox",
    "sent",
    "drafts",
    "queued",
    "scheduled",
    "sessions",
    "starred",
    "archived",
];
pub fn parse(q: &str, scope: &str) -> Result<Search, String> {
    if q.len() > 4096 {
        return Err("Search is too long.".into());
    }
    let mut out = Search {
        scope: scope.into(),
        ..Default::default()
    };
    let (mut token, mut quoted) = (String::new(), false);
    let mut tokens = vec![];
    for ch in q.chars() {
        if ch == '"' {
            quoted = !quoted;
        } else if ch.is_whitespace() && !quoted {
            if !token.is_empty() {
                tokens.push(std::mem::take(&mut token));
            }
        } else {
            token.push(ch);
        }
    }
    if quoted {
        return Err("Close the quoted phrase.".into());
    }
    if !token.is_empty() {
        tokens.push(token);
    }
    let mut explicit: Option<String> = None;
    for token in tokens {
        if let Some((key, value)) = token.split_once(':') {
            let key = key.to_lowercase();
            let mailbox = if key == "in" {
                Some(value.to_lowercase())
            } else if SCOPES.contains(&key.as_str()) {
                Some(key.clone())
            } else if key == "envoyer" {
                Some("sent".into())
            } else {
                None
            };
            if let Some(mailbox) = mailbox {
                if !SCOPES.contains(&mailbox.as_str()) {
                    return Err(
                        "Unknown mailbox. Use inbox, sent, drafts, queued, scheduled or sessions."
                            .into(),
                    );
                }
                if explicit.as_ref().is_some_and(|s| s != &mailbox) {
                    return Err("Choose only one mailbox in a search.".into());
                }
                out.scope = mailbox.clone();
                explicit = Some(mailbox);
                if key != "in" && !value.is_empty() {
                    out.terms.push(value.into());
                }
                continue;
            }
            if ["agent", "folder", "branch", "label", "is", "triage"].contains(&key.as_str()) {
                if value.is_empty() {
                    return Err(format!("{key}: requires a value."));
                }
                if key == "is" && !["unread", "starred"].contains(&value.to_lowercase().as_str()) {
                    return Err("Use is:unread or is:starred.".into());
                }
                if key == "triage" && !["all", "attention", "replies"].contains(&value) {
                    return Err("Use triage:all, triage:attention or triage:replies.".into());
                }
                out.filters.push((key, value.into()));
                continue;
            }
        }
        out.terms.push(token);
    }
    if !SCOPES.contains(&out.scope.as_str()) {
        return Err("Unknown mailbox.".into());
    }
    Ok(out)
}
pub fn page(
    store: &Store,
    search: &Search,
    tool: &str,
    label: &str,
    offset: usize,
) -> rusqlite::Result<Value> {
    page_internal(store, search, tool, label, offset, false)
}
fn page_internal(
    store: &Store,
    search: &Search,
    tool: &str,
    label: &str,
    offset: usize,
    count_only: bool,
) -> rusqlite::Result<Value> {
    let catalog = ["sessions", "starred", "archived"].contains(&search.scope.as_str());
    let cte = if catalog {
        "SELECT s.id,s.id sid,'session' kind,s.native payload,json_extract(s.native,'$.tool') tool,json_extract(s.native,'$.cwd') cwd,json_extract(s.native,'$.title') title,json_extract(s.native,'$.branch') branch,COALESCE(a.data,'{}') ann,'' body,s.modified modified FROM sessions s LEFT JOIN annotations a ON a.id=s.id".to_owned()
    } else if search.scope == "inbox" {
        "SELECT s.id,s.id sid,'session' kind,s.native payload,json_extract(s.native,'$.tool') tool,json_extract(s.native,'$.cwd') cwd,json_extract(s.native,'$.title') title,json_extract(s.native,'$.branch') branch,COALESCE(a.data,'{}') ann,group_concat(i.text,char(10)) body,max(i.created) modified FROM incoming i JOIN sessions s ON i.session_id=s.id LEFT JOIN annotations a ON a.id=s.id GROUP BY s.id".to_owned()
    } else if search.scope == "drafts" {
        "SELECT d.id,json_extract(d.data,'$.sessionId') sid,'draft' kind,d.data payload,json_extract(d.data,'$.tool') tool,json_extract(d.data,'$.cwd') cwd,json_extract(d.data,'$.title') title,COALESCE(json_extract(d.data,'$.branch'),json_extract(s.native,'$.branch'),'') branch,json_set(COALESCE(a.data,d.data),'$.labels',json_extract(d.data,'$.labels')) ann,json_extract(d.data,'$.markdown') body,json_extract(d.data,'$.modified') modified FROM drafts d LEFT JOIN sessions s ON s.id=json_extract(d.data,'$.sessionId') LEFT JOIN annotations a ON a.id=s.id".to_owned()
    } else {
        let predicate = match search.scope.as_str() {
            "sent" => "json_extract(d.data,'$.acceptedAt') IS NOT NULL",
            "scheduled" => "d.status IN ('scheduled','missed')",
            _ => "d.status IN ('queued','dispatching','failed','uncertain')",
        };
        format!(
            "SELECT d.id,d.session_id sid,'delivery' kind,d.data payload,json_extract(d.data,'$.draft.tool') tool,json_extract(d.data,'$.draft.cwd') cwd,json_extract(d.data,'$.draft.title') title,COALESCE(json_extract(d.data,'$.draft.branch'),'') branch,COALESCE(a.data,json_extract(d.data,'$.draft')) ann,json_extract(d.data,'$.draft.markdown') body,json_extract(d.data,'$.modified') modified FROM deliveries d LEFT JOIN sessions s ON s.id=d.session_id LEFT JOIN annotations a ON a.id=s.id WHERE {predicate}"
        )
    };
    let mut conditions = vec!["1=1".to_owned()];
    let mut args: Vec<SqlValue> = vec![];
    if search.scope == "starred" {
        conditions.push("json_extract(ann,'$.starred')=1".into());
    }
    if search.scope == "archived" {
        conditions.push("json_extract(ann,'$.archived')=1".into());
    }
    if search.scope == "sessions" || search.scope == "inbox" {
        conditions.push("COALESCE(json_extract(ann,'$.archived'),0)=0".into());
    }
    let mut filters = search.filters.clone();
    if !tool.is_empty() {
        filters.push(("agent".into(), tool.into()));
    }
    if !label.is_empty() {
        filters.push(("label".into(), label.into()));
    }
    for (field, value) in filters {
        match field.as_str() {
            "triage" => {
                if search.scope == "inbox" {
                    match value.as_str() {
                        "attention" => conditions.push("(EXISTS(SELECT 1 FROM terminal_requests r WHERE r.session_id=rows.sid AND r.state IN ('pending','answering')) OR EXISTS(SELECT 1 FROM requests r WHERE r.session_id=rows.sid AND r.state IN ('pending','answering')) OR EXISTS(SELECT 1 FROM deliveries d WHERE d.session_id=rows.sid AND (d.status IN ('failed','uncertain') OR json_extract(d.data,'$.execution') IN ('failed','interrupted'))))".into()),
                        "replies" => conditions.push("EXISTS(SELECT 1 FROM incoming i WHERE i.session_id=rows.sid AND i.kind='reply')".into()),
                        _ => {}
                    }
                }
            }
            "agent" => {
                conditions.push("lower(tool)=lower(?)".into());
                args.push(value.into());
            }
            "folder" => {
                conditions.push("instr(cwd,?)=1".into());
                args.push(value.into());
            }
            "branch" => {
                conditions.push("branch=?".into());
                args.push(value.into());
            }
            "label" => {
                conditions.push("EXISTS(SELECT 1 FROM json_each(ann,'$.labels') l WHERE l.value=? OR l.value IN (SELECT id FROM labels WHERE lower(json_extract(data,'$.name'))=lower(?)))".into());
                args.push(value.clone().into());
                args.push(value.into());
            }
            "is" => conditions.push(format!(
                "json_extract(ann,'$.{}')=1",
                if value.eq_ignore_ascii_case("unread") {
                    "unread"
                } else {
                    "starred"
                }
            )),
            _ => {}
        }
    }
    for text in &search.terms {
        let pattern = format!(
            "%{}%",
            text.replace('\\', "\\\\")
                .replace('%', "\\%")
                .replace('_', "\\_")
        );
        let mut condition =
            "(lower(title||' '||tool||' '||cwd||' '||branch||' '||body) LIKE lower(?) ESCAPE '\\'"
                .to_owned();
        args.push(pattern.into());
        if catalog {
            condition.push_str(" OR sid IN(SELECT session_id FROM search WHERE search MATCH ?)");
            args.push(
                format!(
                    "\"{}\"{}",
                    text.replace('"', "\"\""),
                    if text.contains(' ') { "" } else { "*" }
                )
                .into(),
            );
        }
        condition.push(')');
        conditions.push(condition);
    }
    let query = |projection: &str| {
        format!(
            "WITH rows AS ({cte}) SELECT {projection} FROM rows WHERE {}",
            conditions.join(" AND ")
        )
    };
    let total: i64 =
        store
            .conn
            .query_row(&query("COUNT(*)"), params_from_iter(args.iter()), |r| {
                r.get(0)
            })?;
    if count_only {
        return Ok(json!({"total":total}));
    }
    args.push((offset.min(i64::MAX as usize) as i64).into());
    let mut st = store.conn.prepare(
        &(query("id,sid,kind,payload,modified,body")
            + " ORDER BY modified DESC,id LIMIT 100 OFFSET ?"),
    )?;
    let rows = st.query_map(params_from_iter(args.iter()), |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, Option<String>>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, i64>(4)?,
            r.get::<_, String>(5)?,
        ))
    })?;
    let items: Vec<Value> = rows
        .filter_map(Result::ok)
        .filter_map(|(id, sid, kind, data, time, body)| {
            let v: Value = serde_json::from_str(&data).ok()?;
            let session = sid
                .and_then(|id| store.session(&id))
                .map(|s| store.public_session(&s));
            if kind == "session" {
                Some(json!({"id":id,"kind":kind,"session":session,"modified":time,"preview":body}))
            } else {
                Some(json!({"id":id,"kind":kind,"session":session,"data":v,"modified":time}))
            }
        })
        .collect();
    Ok(json!({"items":items,"total":total,"offset":offset,"limit":100,"scope":search.scope}))
}
pub async fn mailbox(State(a): State<App>, Query(q): Query<HashMap<String, String>>) -> ApiResult {
    let mut search = parse(
        q.get("q").map(String::as_str).unwrap_or(""),
        q.get("view").map(String::as_str).unwrap_or("inbox"),
    )
    .map_err(|e| {
        (
            StatusCode::BAD_REQUEST,
            Json(json!({"error":e,"code":"invalid_query"})),
        )
    })?;
    let category = search
        .filters
        .iter()
        .rev()
        .find(|(key, _)| key == "triage")
        .map(|(_, value)| value.clone())
        .unwrap_or_else(|| q.get("triage").cloned().unwrap_or_else(|| "all".into()));
    let triage = category.as_str();
    if !["all", "attention", "replies"].contains(&triage) {
        return Err(error(StatusCode::BAD_REQUEST, "Unknown inbox category."));
    }
    search.filters.retain(|(key, _)| key != "triage");
    let store = a.store.lock().unwrap();
    let mut counts = json!({});
    if search.scope == "inbox" {
        for category in ["all", "attention", "replies"] {
            search.filters.retain(|(key, _)| key != "triage");
            search.filters.push(("triage".into(), category.into()));
            let result = page_internal(
                &store,
                &search,
                q.get("tool").map(String::as_str).unwrap_or(""),
                q.get("label").map(String::as_str).unwrap_or(""),
                0,
                true,
            )
            .map_err(|_| error(StatusCode::INTERNAL_SERVER_ERROR, "Search is unavailable."))?;
            counts[category] = result["total"].clone();
        }
    }
    search.filters.retain(|(key, _)| key != "triage");
    search.filters.push(("triage".into(), triage.into()));
    let mut result = page(
        &store,
        &search,
        q.get("tool").map(String::as_str).unwrap_or(""),
        q.get("label").map(String::as_str).unwrap_or(""),
        q.get("offset").and_then(|s| s.parse().ok()).unwrap_or(0),
    )
    .map_err(|_| error(StatusCode::INTERNAL_SERVER_ERROR, "Search is unavailable."))?;
    result["triageCounts"] = counts;
    Ok(Json(result))
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn scopes_phrases_and_aliases() {
        let s = parse("envoyer:bug agent:Codex \"two words\"", "inbox").unwrap();
        assert_eq!(s.scope, "sent");
        assert_eq!(s.terms, vec!["bug", "two words"]);
        assert_eq!(s.filters, vec![("agent".into(), "Codex".into())]);
        assert_eq!(parse("inbox:", "sessions").unwrap().scope, "inbox");
        assert!(parse("in:sent in:drafts", "inbox").is_err());
        assert!(parse("in:unknown", "inbox").is_err());
        assert!(parse("\"unclosed", "inbox").is_err());
        assert_eq!(
            parse("https://example.test", "sessions")
                .unwrap()
                .terms
                .len(),
            1
        );
    }
    #[test]
    fn empty_mailboxes_are_not_native_histories() {
        let s = Store::open(std::path::Path::new(":memory:")).unwrap();
        crate::delivery::migrate(&s).unwrap();
        crate::terminal::migrate(&s).unwrap();
        for scope in SCOPES {
            assert_eq!(
                page(&s, &parse("", scope).unwrap(), "", "", 0).unwrap()["total"],
                0
            );
        }
    }
    #[test]
    fn populated_mailboxes_preserve_json_annotations_and_search_content() {
        let mut store = Store::open(std::path::Path::new(":memory:")).unwrap();
        crate::delivery::migrate(&store).unwrap();
        crate::terminal::migrate(&store).unwrap();
        let session = crate::discovery::session(
            &crate::discovery::Root {
                tool: "Codex".into(),
                path: "/tmp/codex-fixture".into(),
            },
            "native".into(),
            "/tmp/project".into(),
            "Literal {} title".into(),
            "main".into(),
            1,
            std::path::Path::new("/tmp/codex-fixture/thread.jsonl"),
        );
        store.upsert(&session).unwrap();
        store
            .index(
                &session,
                &[crate::model::Message {
                    id: "m".into(),
                    role: "assistant".into(),
                    text: "Searchable native words".into(),
                    time: 1,
                    activity: false,
                }],
                "fixture",
            )
            .unwrap();
        assert_eq!(
            page(&store, &parse("", "sessions").unwrap(), "", "", 0).unwrap()["total"],
            1
        );
        assert_eq!(
            page(
                &store,
                &parse("\"native words\"", "sessions").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["items"][0]["session"]["title"],
            "Literal {} title"
        );
        store
            .receive("incoming", &session.id, "Received phrase", "reply")
            .unwrap();
        assert_eq!(
            page(
                &store,
                &parse("triage:replies", "inbox").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["total"],
            1
        );
        assert_eq!(
            page(
                &store,
                &parse("triage:attention", "inbox").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["total"],
            0
        );
        store
            .conn
            .execute(
                "INSERT INTO terminal_requests VALUES('request',?,'process','pending','{}')",
                [&session.id],
            )
            .unwrap();
        assert_eq!(
            page(
                &store,
                &parse("triage:attention", "inbox").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["total"],
            1
        );
        assert_eq!(
            page(
                &store,
                &parse("triage:attention", "inbox").unwrap(),
                "Pi",
                "",
                0
            )
            .unwrap()["total"],
            0
        );
        store
            .conn
            .execute(
                "UPDATE terminal_requests SET state='resolved' WHERE id='request'",
                [],
            )
            .unwrap();
        assert_eq!(
            page(
                &store,
                &parse("triage:attention", "inbox").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["total"],
            0
        );
        assert_eq!(
            page(
                &store,
                &parse("inbox:Received is:unread", "sessions").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["total"],
            1
        );
        let mut draft = crate::model::Draft::empty();
        draft.session_id = Some(session.id.clone());
        draft.markdown = "Unsaved phrase".into();
        store.save_draft(&mut draft).unwrap();
        assert_eq!(
            page(
                &store,
                &parse("drafts:Unsaved", "inbox").unwrap(),
                "",
                "",
                0
            )
            .unwrap()["total"],
            1
        );
    }
}
