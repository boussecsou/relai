use crate::{ApiResult, App, error};
use axum::{
    Json,
    extract::{Query, State},
    http::StatusCode,
};
use serde_json::json;
use std::{
    collections::HashMap,
    path::{Path, PathBuf},
};
pub async fn folders(State(a): State<App>, Query(q): Query<HashMap<String, String>>) -> ApiResult {
    if let Some(path) = q.get("path") {
        let path = Path::new(path);
        if !path.is_absolute() {
            return Err(error(
                StatusCode::BAD_REQUEST,
                "Use an absolute folder path.",
            ));
        }
        let canonical = std::fs::canonicalize(path).map_err(|_| {
            error(
                StatusCode::UNPROCESSABLE_ENTITY,
                "This folder is unavailable.",
            )
        })?;
        let root = q
            .get("root")
            .map(PathBuf::from)
            .unwrap_or_else(|| canonical.clone());
        let root = std::fs::canonicalize(root)
            .map_err(|_| error(StatusCode::BAD_REQUEST, "The browsing root is unavailable."))?;
        if !canonical.starts_with(&root) {
            return Err(error(
                StatusCode::BAD_REQUEST,
                "Choose this path as a new browsing root to navigate outside the current root.",
            ));
        }
        let prefix = q.get("prefix").cloned().unwrap_or_default().to_lowercase();
        let mut paths = vec![];
        let mut partial = false;
        for (index, entry) in std::fs::read_dir(&canonical)
            .map_err(|_| error(StatusCode::FORBIDDEN, "This folder cannot be read."))?
            .enumerate()
        {
            if index >= 10000 {
                partial = true;
                break;
            }
            let Ok(entry) = entry else {
                partial = true;
                continue;
            };
            let name = entry.file_name().to_string_lossy().to_string();
            if (name.starts_with('.') && q.get("hidden").is_none_or(|s| s != "true"))
                || !name.to_lowercase().starts_with(&prefix)
            {
                continue;
            }
            if !entry
                .file_type()
                .is_ok_and(|t| t.is_dir() || t.is_symlink())
            {
                continue;
            }
            if let Ok(real) = std::fs::canonicalize(entry.path())
                && real.is_dir()
                && real.starts_with(&root)
            {
                paths.push(
                    json!({"name":name,"path":entry.path().to_string_lossy(),"canonical":real}),
                );
            }
        }
        paths.sort_by(|a, b| a["name"].as_str().cmp(&b["name"].as_str()));
        let offset = q
            .get("offset")
            .and_then(|s| s.parse::<usize>().ok())
            .unwrap_or(0)
            .min(paths.len());
        let end = (offset + 100).min(paths.len());
        return Ok(Json(
            json!({"path":canonical,"root":root,"parent":canonical.parent().filter(|p|p.starts_with(&root)),"items":paths[offset..end],"total":paths.len(),"offset":offset,"limit":100,"partial":partial}),
        ));
    }
    let s = a.store.lock().unwrap();
    let mut st = s
        .conn
        .prepare("SELECT path FROM recent_folders ORDER BY used DESC LIMIT 30")
        .unwrap();
    let mut paths: Vec<String> = st
        .query_map([], |r| r.get(0))
        .unwrap()
        .filter_map(Result::ok)
        .collect();
    paths.extend(s.sessions().into_iter().map(|s| s.cwd));
    paths.push(std::env::var("HOME").unwrap_or_default());
    let text = q.get("q").cloned().unwrap_or_default().to_lowercase();
    let mut seen = std::collections::HashSet::new();
    paths.retain(|p| !p.is_empty() && p.to_lowercase().contains(&text) && seen.insert(p.clone()));
    paths.truncate(100);
    Ok(Json(
        json!({"items":paths.into_iter().map(|p|json!({"name":Path::new(&p).file_name().unwrap_or_default().to_string_lossy(),"available":Path::new(&p).is_dir(),"path":p})).collect::<Vec<_>>() }),
    ))
}
