import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const repo = resolve(import.meta.dirname, "../../.."),
  temp = await mkdtemp(join(tmpdir(), "relai-hooks-")),
  root = join(temp, "claude"),
  cwd = join(temp, "project"),
  bin = join(temp, "bin");
const transcript = join(root, "projects", "fixture", "claude-fixture.jsonl");
await Promise.all([
  mkdir(join(root, "projects", "fixture"), { recursive: true }),
  mkdir(cwd),
  mkdir(bin),
]);
await writeFile(
  transcript,
  JSON.stringify({
    type: "user",
    uuid: "u",
    sessionId: "claude-fixture",
    cwd,
    message: { role: "user", content: "Claude terminal fixture" },
  }) + "\n",
);
await writeFile(
  join(bin, "claude"),
  `#!/usr/bin/env python3
import json, os, sys, subprocess
sid=sys.argv[sys.argv.index('--resume')+1]
settings=json.loads(sys.argv[sys.argv.index('--settings')+1])
def hook(event, extra={}):
 payload={'session_id':sid,'hook_event_name':event,**extra}
 command=settings['hooks'][event][0]['hooks'][0]['command']
 return subprocess.check_output(command,shell=True,input=json.dumps(payload).encode(),env=os.environ).decode().strip()
hook('UserPromptSubmit')
print('Permission hook active',flush=True)
answer=hook('PermissionRequest',{'tool_name':'Bash','tool_input':{'command':'echo fixture'}})
print('Native answer: '+answer,flush=True)
record={'type':'assistant','uuid':'a','parentUuid':'u','sessionId':sid,'cwd':os.getcwd(),'message':{'role':'assistant','content':[{'type':'text','text':'Claude hook fixture reply'}]}}
with open(os.environ['RELAI_FIXTURE_TRANSCRIPT'],'a') as f:f.write(json.dumps(record)+'\\n')
hook('Stop',{'last_assistant_message':'Claude hook fixture reply'})
for line in sys.stdin: print('Native input: '+line.strip(),flush=True)
`,
  { mode: 0o755 },
);
const server = spawn(join(repo, "target/debug/relai"), {
  cwd: repo,
  env: {
    ...process.env,
    PATH: bin + ":" + process.env.PATH,
    RELAI_PORT: "4187",
    RELAI_DATA_DIR: join(temp, "data"),
    RELAI_SESSION_ROOTS: JSON.stringify([{ tool: "Claude Code", path: root }]),
    RELAI_DISCOVERY_ISOLATED: "1",
    RELAI_FIXTURE_TRANSCRIPT: transcript,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
server.stderr.on("data", (b) => process.stderr.write(b));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4187")).ok) break;
    } catch {}
    await wait(100);
  }
  browser = await chromium.launch({
    executablePath: process.env.RELAI_CHROMIUM,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4187");
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await page.locator(".session-row .row-main").click();
  await page.getByRole("tab", { name: "Open terminal", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Approval requested", exact: true }),
  ).toBeVisible({ timeout: 10000 });
  const sessions = await (
    await context.request.get("http://127.0.0.1:4187/api/v1/sessions")
  ).json();
  const sid = sessions.items[0].id;
  const activity = await (
    await context.request.get(
      `http://127.0.0.1:4187/api/v1/sessions/${sid}/activity`,
    )
  ).json();
  const rid = activity.requests.find((r) => r.state === "pending").id;
  await page
    .getByRole("button", { name: "Return to automatic sending", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("Stop the active turn");
  await page.getByRole("button", { name: "Allow once", exact: true }).click();
  await expect(page.locator(".xterm-accessibility-tree")).toContainText(
    '"behavior":"allow"',
  );
  await expect(page.locator(".interaction-card")).toHaveCount(0);
  const duplicate = await context.request.post(
    `http://127.0.0.1:4187/api/v1/terminal-requests/${rid}/respond`,
    { data: { decision: "accept" } },
  );
  expect(duplicate.status()).toBe(409);
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  await expect(
    page.getByText("Claude hook fixture reply", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await expect(page.locator(".session-row")).toHaveCount(1);
  expect(errors).toEqual([]);
  console.log(
    "Native permission hooks: exact resume, GUI Allow once, one-shot response, blocked release while busy, reply/history and Inbox passed.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await wait(300);
}
