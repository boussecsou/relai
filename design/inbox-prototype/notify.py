"""Forward a Codex notify event to this Relai instance; no global config changes."""
import json
import os
import sys
import urllib.error
import urllib.request

try:
    notification = json.loads(sys.argv[1])
    if notification.get("type") == "agent-turn-complete":
        payload = json.dumps({"runtimeId": os.environ["RELAI_RUNTIME_ID"], "notification": notification}).encode()
        request = urllib.request.Request(
            os.environ["RELAI_INBOX_URL"] + "/api/receive",
            data=payload,
            headers={"Content-Type": "application/json", "Authorization": "Bearer " + os.environ["RELAI_INBOX_TOKEN"]},
            method="POST",
        )
        with urllib.request.urlopen(request, timeout=10) as response:
            response.read()
except (OSError, ValueError, KeyError, IndexError, urllib.error.URLError):
    # Failure to notify must not interrupt the native coding session.
    sys.exit(0)
