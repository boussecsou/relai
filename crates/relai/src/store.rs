use crate::model::*;
use rusqlite::{Connection, params};
use serde_json::{Value, json};
use std::path::Path;

pub struct Store {
    pub conn: Connection,
}
impl Store {
    pub fn open(path: &Path) -> rusqlite::Result<Self> {
        let conn = Connection::open(path)?;
        conn.busy_timeout(std::time::Duration::from_secs(3))?;
        conn.execute_batch("PRAGMA journal_mode=WAL;
            CREATE TABLE IF NOT EXISTS sessions(id TEXT PRIMARY KEY, native TEXT NOT NULL, modified INTEGER NOT NULL, fingerprint TEXT NOT NULL DEFAULT '');
            CREATE TABLE IF NOT EXISTS annotations(id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS drafts(id TEXT PRIMARY KEY, revision INTEGER NOT NULL, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS labels(id TEXT PRIMARY KEY, data TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS preferences(id INTEGER PRIMARY KEY CHECK(id=1),data TEXT NOT NULL);
            CREATE VIRTUAL TABLE IF NOT EXISTS search USING fts5(session_id UNINDEXED,text,tokenize='unicode61');
            CREATE TABLE IF NOT EXISTS indexed(id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL);")?;
        Ok(Self { conn })
    }
    pub fn page(
        &self,
        q: &str,
        tool: &str,
        label: &str,
        view: &str,
        offset: usize,
    ) -> rusqlite::Result<(usize, Vec<Value>)> {
        let phrase = q
            .split_whitespace()
            .map(|w| format!("\"{}\"*", w.replace('"', "\"\"")))
            .collect::<Vec<_>>()
            .join(" AND ");
        let pattern = format!(
            "%{}%",
            q.replace('\\', "\\\\")
                .replace('%', "\\%")
                .replace('_', "\\_")
        );
        let where_sql=" FROM sessions s LEFT JOIN annotations a ON a.id=s.id WHERE
          (?1='' OR json_extract(s.native,'$.tool')=?1)
          AND (?2='' OR EXISTS(SELECT 1 FROM json_each(COALESCE(a.data,'{}'),'$.labels') WHERE value=?2))
          AND (?3!='starred' OR json_extract(a.data,'$.starred')=1)
          AND (?3!='archived' OR json_extract(a.data,'$.archived')=1)
          AND (?3!='sessions' OR COALESCE(json_extract(a.data,'$.archived'),0)=0)
          AND (?4='' OR lower(json_extract(s.native,'$.title')||' '||json_extract(s.native,'$.cwd')||' '||json_extract(s.native,'$.branch')||' '||json_extract(s.native,'$.tool')) LIKE ?5 ESCAPE '\\'
            OR s.id IN (SELECT session_id FROM search WHERE search MATCH ?6))";
        let total = self.conn.query_row(
            &format!("SELECT COUNT(*){where_sql}"),
            params![tool, label, view, q, pattern, phrase],
            |r| r.get::<_, i64>(0),
        )?;
        let mut stmt=self.conn.prepare(&format!("SELECT s.native,COALESCE(a.data,'{{\"labels\":[],\"starred\":false,\"archived\":false,\"ticket\":\"\"}}'){where_sql} ORDER BY s.modified DESC,s.id LIMIT 100 OFFSET ?7"))?;
        let rows = stmt.query_map(
            params![tool, label, view, q, pattern, phrase, offset as i64],
            |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)),
        )?;
        let items = rows
            .filter_map(Result::ok)
            .filter_map(|(s, _a)| {
                Some(self.public_session(&serde_json::from_str::<Session>(&s).ok()?))
            })
            .collect();
        Ok((total as usize, items))
    }
    pub fn session(&self, id: &str) -> Option<Session> {
        let data: String = self
            .conn
            .query_row("SELECT native FROM sessions WHERE id=?", [id], |r| r.get(0))
            .ok()?;
        serde_json::from_str(&data).ok()
    }
    pub fn sessions(&self) -> Vec<Session> {
        let mut stmt = self
            .conn
            .prepare("SELECT native FROM sessions ORDER BY modified DESC,id")
            .unwrap();
        stmt.query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(|r| serde_json::from_str(&r.ok()?).ok())
            .collect()
    }
    pub fn upsert(&self, s: &Session) -> rusqlite::Result<()> {
        self.conn.execute("INSERT INTO sessions(id,native,modified) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET native=excluded.native,modified=excluded.modified WHERE native!=excluded.native",params![s.id,serde_json::to_string(s).unwrap(),s.modified])?;
        Ok(())
    }
    pub fn annotations(&self, id: &str) -> Value {
        self.conn
            .query_row("SELECT data FROM annotations WHERE id=?", [id], |r| {
                r.get::<_, String>(0)
            })
            .ok()
            .and_then(|s| serde_json::from_str(&s).ok())
            .unwrap_or(
                json!({"labels":[],"starred":false,"archived":false,"unread":false,"ticket":""}),
            )
    }
    pub fn annotate(&self, id: &str, v: &Value) -> rusqlite::Result<()> {
        self.conn.execute("INSERT INTO annotations(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",params![id,v.to_string()])?;
        Ok(())
    }
    pub fn labels(&self) -> Vec<Label> {
        let mut st = self
            .conn
            .prepare("SELECT data FROM labels ORDER BY id")
            .unwrap();
        st.query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(|r| serde_json::from_str(&r.ok()?).ok())
            .collect()
    }
    pub fn label(&self, label: &Label) -> rusqlite::Result<()> {
        self.conn.execute("INSERT INTO labels(id,data) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data",params![label.id,serde_json::to_string(label).unwrap()])?;
        Ok(())
    }
    pub fn remove_label(&mut self, id: &str) -> rusqlite::Result<()> {
        let tx = self.conn.transaction()?;
        tx.execute("DELETE FROM labels WHERE id=?", [id])?;
        for table in ["annotations", "drafts"] {
            let entries: Vec<(String, String)> = {
                let mut s = tx.prepare(&format!("SELECT id,data FROM {table}"))?;
                s.query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
                    .filter_map(Result::ok)
                    .collect()
            };
            for (key, data) in entries {
                if let Ok(mut v) = serde_json::from_str::<Value>(&data) {
                    if let Some(labels) = v["labels"].as_array_mut() {
                        labels.retain(|l| l.as_str() != Some(id));
                    }
                    if table == "drafts" {
                        let revision = v["revision"].as_i64().unwrap_or(0) + 1;
                        v["revision"] = revision.into();
                        tx.execute(
                            "UPDATE drafts SET data=?,revision=? WHERE id=?",
                            params![v.to_string(), revision, key],
                        )?;
                    } else {
                        tx.execute(
                            "UPDATE annotations SET data=? WHERE id=?",
                            params![v.to_string(), key],
                        )?;
                    }
                }
            }
        }
        tx.commit()
    }
    pub fn drafts(&self) -> Vec<Draft> {
        let mut st = self
            .conn
            .prepare("SELECT data FROM drafts ORDER BY rowid DESC")
            .unwrap();
        st.query_map([], |r| r.get::<_, String>(0))
            .unwrap()
            .filter_map(|r| serde_json::from_str(&r.ok()?).ok())
            .collect()
    }
    pub fn draft(&self, id: &str) -> Option<Draft> {
        self.drafts().into_iter().find(|d| d.id == id)
    }
    pub fn save_draft(&mut self, draft: &mut Draft) -> Result<(), String> {
        let tx = self
            .conn
            .transaction()
            .map_err(|_| "The draft could not be saved.")?;
        let current: Option<i64> = tx
            .query_row("SELECT revision FROM drafts WHERE id=?", [&draft.id], |r| {
                r.get(0)
            })
            .ok();
        if current.unwrap_or(0) != draft.revision {
            return Err("conflict".into());
        }
        draft.revision += 1;
        draft.modified = now();
        tx.execute("INSERT INTO drafts(id,revision,data) VALUES(?,?,?) ON CONFLICT(id) DO UPDATE SET revision=excluded.revision,data=excluded.data",params![draft.id,draft.revision,serde_json::to_string(draft).unwrap()]).map_err(|_|"The disk cannot save this draft.")?;
        tx.commit()
            .map_err(|_| "The save was not confirmed.".into())
    }
    pub fn indexed(&self, id: &str, fingerprint: &str) -> bool {
        self.conn
            .query_row("SELECT fingerprint FROM indexed WHERE id=?", [id], |r| {
                r.get::<_, String>(0)
            })
            .ok()
            .as_deref()
            == Some(fingerprint)
    }
    pub fn index(
        &mut self,
        s: &Session,
        messages: &[Message],
        fingerprint: &str,
    ) -> rusqlite::Result<()> {
        let text = messages
            .iter()
            .map(|m| m.text.as_str())
            .collect::<Vec<_>>()
            .join("\n");
        let tx = self.conn.transaction()?;
        tx.execute("DELETE FROM search WHERE session_id=?", [&s.id])?;
        tx.execute(
            "INSERT INTO search(session_id,text) VALUES(?,?)",
            params![s.id, text],
        )?;
        tx.execute("INSERT INTO indexed(id,fingerprint) VALUES(?,?) ON CONFLICT(id) DO UPDATE SET fingerprint=excluded.fingerprint",params![s.id,fingerprint])?;
        tx.commit()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn fixture(id: &str) -> Session {
        Session {
            id: id.into(),
            native_id: id.into(),
            tool: "Codex".into(),
            title: format!("Conversation {id}"),
            cwd: "/projet".into(),
            branch: "main".into(),
            modified: 1,
            archived_native: false,
            source_kind: "history".into(),
            store: "/native".into(),
            native_path: "/native/session".into(),
            parent_id: String::new(),
        }
    }
    #[test]
    fn drafts_persist_and_conflicts_preserve_text() {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("relai.sqlite");
        let mut store = Store::open(&path).unwrap();
        assert!(store.drafts().is_empty());
        assert!(store.labels().is_empty());
        assert!(store.sessions().is_empty());
        let mut d = Draft::empty();
        d.markdown = "## Mon Relai\n\n- [ ] tâche".into();
        store.save_draft(&mut d).unwrap();
        let mut old = d.clone();
        d.markdown.push_str("\nSuite");
        store.save_draft(&mut d).unwrap();
        old.markdown = "Texte de l’autre onglet".into();
        assert_eq!(store.save_draft(&mut old), Err("conflict".into()));
        assert_eq!(old.markdown, "Texte de l’autre onglet");
        drop(store);
        let store = Store::open(&path).unwrap();
        assert_eq!(store.draft(&d.id).unwrap().markdown, d.markdown);
    }
    #[test]
    fn labels_and_fulltext_filter_catalogue() {
        let dir = tempfile::tempdir().unwrap();
        let mut store = Store::open(&dir.path().join("r.sqlite")).unwrap();
        let s = fixture("one");
        store.upsert(&s).unwrap();
        let label = Label {
            id: "l".into(),
            name: "À revoir".into(),
            color: "teal".into(),
        };
        store.label(&label).unwrap();
        store
            .annotate(
                &s.id,
                &json!({"labels":["l"],"starred":true,"archived":false}),
            )
            .unwrap();
        let mut d = Draft::empty();
        d.labels.push("l".into());
        store.save_draft(&mut d).unwrap();
        store
            .index(
                &s,
                &[Message {
                    id: "m".into(),
                    text: "Le résultat contient extraordinaire".into(),
                    role: "assistant".into(),
                    time: 0,
                    activity: false,
                }],
                "v1",
            )
            .unwrap();
        assert_eq!(store.page("", "", "l", "starred", 0).unwrap().0, 1);
        assert_eq!(
            store
                .page("extraordinaire", "", "", "sessions", 0)
                .unwrap()
                .0,
            1
        );
        assert_eq!(store.page("absent", "", "", "sessions", 0).unwrap().0, 0);
        store.remove_label("l").unwrap();
        assert!(store.draft(&d.id).unwrap().labels.is_empty());
        assert_eq!(store.page("", "", "l", "sessions", 0).unwrap().0, 0);
    }
    #[test]
    fn ten_thousand_rows_have_bounded_pages() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::open(&dir.path().join("r.sqlite")).unwrap();
        store.conn.execute_batch("BEGIN").unwrap();
        for i in 0..10_000 {
            store.upsert(&fixture(&format!("{i:05}"))).unwrap()
        }
        store.conn.execute_batch("COMMIT").unwrap();
        let start = std::time::Instant::now();
        let (count, page) = store.page("", "", "", "sessions", 9900).unwrap();
        eprintln!("Catalogue 10 000 : page et comptage {:?}", start.elapsed());
        assert_eq!(count, 10_000);
        assert_eq!(page.len(), 100);
        assert_eq!(
            store.page("", "", "", "sessions", 10_000).unwrap().1.len(),
            0
        );
    }
}
