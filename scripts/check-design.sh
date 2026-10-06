#!/usr/bin/env bash
# Check the self-contained prototype without modifying it.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
python3 - <<'PY'
from pathlib import Path
from html.parser import HTMLParser
html = Path('index.html').read_text()
HTMLParser(convert_charrefs=True).feed(html)
for marker in ('<!DOCTYPE html>', '<title>Relai', '<script>', '</script>', '</html>'):
    if marker not in html:
        raise SystemExit(f'Missing HTML marker: {marker}')
print('Standalone HTML structure checked.')
PY
if command -v node >/dev/null 2>&1; then
  node - <<'JS'
const fs = require('node:fs');
const html = fs.readFileSync('index.html', 'utf8');
for (const script of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
  new Function(script[1]);
}
console.log('Inline JavaScript syntax checked.');
JS
else
  echo 'Node.js unavailable; JavaScript syntax check skipped.'
fi
