#!/usr/bin/env python3
"""Fail on private runtime files and recognizable credentials in tracked files.

This is a conservative preflight, not a guarantee that arbitrary secrets can be
identified. Review the staged diff before publishing. Never print matched text.
"""
import pathlib
import re
import subprocess
import sys

files = subprocess.check_output(["git", "ls-files", "-z"]).decode().split("\0")
private = re.compile(r"(^|/)(\.env(?:\..*)?|\.relai[^/]*/|\.aws/|\.codex/|\.agents/|auth\.json$|credentials\.json$|\.npmrc$|\.netrc$)|\.(sqlite|db)(-|$)")
patterns = [
    re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    re.compile(r"\b(?:ghp_|github_pat_|sk-proj-|sk-ant-)[A-Za-z0-9_-]{20,}"),
    re.compile(r"\bAKIA[0-9A-Z]{16}\b"),
]
findings = []
for name in filter(None, files):
    path = pathlib.Path(name)
    if private.search(name) and path.name != ".env.example":
        findings.append(f"{name}: private file must not be tracked")
    if not path.is_file():
        continue
    data = path.read_bytes()
    if b"\0" in data:
        continue
    for line, text in enumerate(data.decode(errors="replace").splitlines(), 1):
        if any(pattern.search(text) for pattern in patterns):
            findings.append(f"{name}:{line}: possible credential (value withheld)")
if findings:
    print("\n".join(findings), file=sys.stderr)
    sys.exit(1)
print("Tracked-file credential preflight passed.")
