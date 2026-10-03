# Contributing to Relai

The workspace edition lives on `experimental/relai-workspace`. Base experimental changes on that branch. Do not push directly to `main` or rewrite existing history.

Install the tools listed in the README, then run `bash scripts/check.sh`. Run `npm run format --prefix apps/web` and `cargo fmt --all` before committing. Rust's compiler and Clippy and TypeScript's strict and unused-code checks are part of CI. Browser tests require Chromium, Python 3 and Linux PTYs.

Keep changes focused. Use commit subjects such as `feat: add conversation focus mode`, `fix: restore draft after a conflict`, `refactor: share the API client` or `docs: explain terminal ownership`. PR descriptions should explain the problem, resulting behavior and validation, with synthetic screenshots for UI changes.

Prefer semantic HTML, explicit state ownership and shared domain types. Preserve native thread IDs, draft revision checks, one input owner per terminal and delivery uncertainty handling. A visual change must not create a native session or send a prompt as a side effect.

Before publishing, inspect `git diff --cached`, run `python3 scripts/check-secrets.py`, and confirm the staged file list. Never commit authentication files, `.env` files, runtime databases, real transcripts, private screenshots or machine-specific tool directories. The preflight recognizes some credential formats; manual review is still necessary.

Report vulnerabilities privately following [SECURITY.md](SECURITY.md). Contributions are licensed under Apache License 2.0.
