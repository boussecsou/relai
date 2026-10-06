#!/bin/bash
# Prepare a Claude Code cloud session. Runs only in remote environments.
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(git rev-parse --show-toplevel)}"

# The repository has no package manifests yet (design and docs only).
# Install dependencies here once Cargo.toml or package.json exist.
./scripts/doctor.sh

# Check the current self-contained prototype.
make check
