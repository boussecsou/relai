#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Test only disposable histories. No installed agent or provider is invoked.
test_dir=$(mktemp -d "${TMPDIR:-/tmp}/relai-browser.XXXXXX")
test_server_pid=""
cleanup() {
  if [[ -n "$test_server_pid" ]]; then
    kill "$test_server_pid" 2>/dev/null || true
    wait "$test_server_pid" 2>/dev/null || true
  fi
}
trap cleanup EXIT INT TERM
RELAI_PORT=4190 RELAI_DATA_DIR="$test_dir/data" RELAI_DISCOVERY_ISOLATED=1 RELAI_SESSION_ROOTS='[]' \
  ./target/debug/relai > "$test_dir/server.log" 2>&1 &
test_server_pid=$!
export RELAI_UI_URL=http://127.0.0.1:4190
for attempt in {1..100}; do
  if ! kill -0 "$test_server_pid" 2>/dev/null; then
    cat "$test_dir/server.log"
    exit 1
  fi
  if curl --silent --fail "$RELAI_UI_URL" > /dev/null; then break; fi
  sleep 0.1
done
for suite in e2e delivery messaging terminal permissions opencode filters workspace; do
  timeout 240s npm run "test:$suite" --prefix apps/web
done
