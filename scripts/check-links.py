#!/usr/bin/env python3
"""Fail if a relative link in a Markdown file points to a missing path."""
import re
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

LINK = re.compile(r"(?<!!)\[[^\]]*\]\(([^)\s]+)(?:\s+\"[^\"]*\")?\)|!\[[^\]]*\]\(([^)\s]+)\)")
# Dated context backups are kept as written, so their links are not checked.
IGNORED = ("docs/context/",)
SKIP = ("http://", "https://", "mailto:", "#", "/workspace/")

root = Path(subprocess.check_output(["git", "rev-parse", "--show-toplevel"], text=True).strip())
files = [
    f
    for f in subprocess.check_output(["git", "ls-files", "*.md"], cwd=root, text=True).split()
    if not f.startswith(IGNORED)
]

broken = []
for name in files:
    path = root / name
    in_fence = False
    for number, line in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if line.lstrip().startswith("```"):
            in_fence = not in_fence
        if in_fence:
            continue
        for match in LINK.finditer(line):
            target = match.group(1) or match.group(2)
            if target.startswith(SKIP):
                continue
            target = unquote(target.split("#", 1)[0])
            if target and not (path.parent / target).exists():
                broken.append(f"{name}:{number}: {target}")

if broken:
    print("Broken relative links:", *broken, sep="\n  ", file=sys.stderr)
    sys.exit(1)
print(f"Checked {len(files)} Markdown files: all relative links resolve.")
