#!/usr/bin/env bash
# Check that the tools Relai needs are installed. Read-only.
set -uo pipefail

missing=0
check() {
  local name=$1 required=$2 cmd=$3
  if command -v "$cmd" >/dev/null 2>&1; then
    printf '  ok       %-8s %s\n' "$name" "$("$cmd" --version 2>&1 | head -n1)"
  elif [ "$required" = required ]; then
    printf '  MISSING  %-8s (required)\n' "$name"
    missing=1
  else
    printf '  missing  %-8s (optional)\n' "$name"
  fi
}

echo "Relai environment"
check git     required git
check python3 required python3
check node    optional node
check npm     optional npm
check cargo   optional cargo
check rustc   optional rustc
exit "$missing"
