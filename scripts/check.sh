#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
python3 scripts/check-secrets.py
npm run lint --prefix apps/web
npm run check --prefix apps/web
npm run build --prefix apps/web
cargo fmt --all -- --check
cargo clippy --locked --all-targets -- -D warnings
cargo test --locked
cargo build --locked
bash scripts/test-browser.sh
