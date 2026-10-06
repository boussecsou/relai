#!/usr/bin/env bash
# Fail if design/relai-v1/index.html is out of date with its sources.
set -euo pipefail

cd "$(git rev-parse --show-toplevel)"
target=design/relai-v1/index.html

before=$(git hash-object "$target")
python3 design/relai-v1/build-preview.py >/dev/null
after=$(git hash-object "$target")

if [ "$before" != "$after" ]; then
  echo "$target was out of date and has been rebuilt. Review and commit it." >&2
  exit 1
fi
echo "$target is up to date."
