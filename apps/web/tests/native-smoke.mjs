// Explicit smoke check: only two text-only turns in a new temporary working folder.
import { spawn } from "node:child_process";
import { mkdtemp, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
const repo = resolve(import.meta.dirname, "../../.."),
  temp = await mkdtemp(join(tmpdir(), "relai-native-smoke-")),
  cwd = join(temp, "project");
await mkdir(cwd);
const root = process.env.CODEX_HOME || join(process.env.HOME, ".codex");
const server = spawn(join(repo, "target/debug/relai"), {
  cwd: repo,
  env: {
    ...process.env,
    RELAI_PORT: "4183",
    RELAI_DATA_DIR: join(temp, "data"),
    RELAI_SESSION_ROOTS: JSON.stringify([{ tool: "Codex", path: root }]),
    RELAI_DISCOVERY_ISOLATED: "1",
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (b) => process.stderr.write(b));
let cookie;
const base = "http://127.0.0.1:4183/api/v1/";
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function api(path, method = "GET", body) {
  const r = await fetch(base + path, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const v = await r.json();
  assert.ok(r.ok, JSON.stringify(v));
  return v;
}
async function until(fn, timeout = 120000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    const v = await fn();
    if (v) return v;
    await wait(300);
  }
  throw Error("Native check timed out");
}
async function turn(text, sid = null) {
  let d = await api("drafts", "POST");
  d = await api("drafts/" + d.id, "PUT", {
    ...d,
    tool: "Codex",
    cwd,
    title: "Relai integration smoke check",
    markdown: text,
    sessionId: sid,
  });
  const result = await api("deliveries", "POST", {
    draftId: d.id,
    revision: d.revision,
    idempotencyKey: d.id,
  });
  return until(async () => {
    const { delivery } = await api("deliveries/" + result.id);
    if (delivery.error) throw Error("Native delivery: " + delivery.error);
    if (["waiting_input", "waiting_approval"].includes(delivery.execution))
      throw Error(
        "Native smoke requires an unexpected interaction; no approval was granted.",
      );
    return delivery.execution === "completed" && delivery;
  });
}
try {
  await until(async () => {
    try {
      const r = await fetch(base + "bootstrap");
      cookie = r.headers.get("set-cookie")?.split(";")[0];
      return r.ok;
    } catch {
      return false;
    }
  }, 10000);
  const first = await turn(
    "Reply with exactly RELAI_SMOKE_OK. Do not use tools, run commands, edit files or start other agents.",
  );
  const second = await turn(
    "Reply with exactly RELAI_RESUME_OK. Do not use tools, run commands, edit files or start other agents.",
    first.draft.sessionId,
  );
  assert.equal(first.nativeThreadId, second.nativeThreadId);
  assert.notEqual(first.nativeTurnId, second.nativeTurnId);
  const messages = await api("sessions/" + first.draft.sessionId + "/messages");
  assert.ok(messages.items.some((m) => m.text.includes("RELAI_SMOKE_OK")));
  assert.ok(messages.items.some((m) => m.text.includes("RELAI_RESUME_OK")));
  console.log(
    "Real Codex smoke passed: two completed turns in the same new native thread. Temporary working folder: " +
      cwd,
  );
} finally {
  if (server.exitCode === null && server.signalCode === null) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
}
