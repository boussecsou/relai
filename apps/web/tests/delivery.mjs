import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
const repo = resolve(import.meta.dirname, "../../.."),
  temp = await mkdtemp(join(tmpdir(), "relai-delivery-")),
  root = join(temp, "codex"),
  cwd = join(temp, "project"),
  data = join(temp, "data");
await mkdir(root, { recursive: true });
await mkdir(cwd);
await mkdir(join(root, "sessions"));
const nativePath = join(root, "sessions", "detected.jsonl");
await writeFile(
  nativePath,
  JSON.stringify({ type: "session_meta", payload: { id: "detected", cwd } }) +
    "\n" +
    JSON.stringify({
      type: "response_item",
      payload: {
        role: "assistant",
        content: [{ type: "output_text", text: "Previous native history" }],
      },
    }) +
    "\n",
);
let server, cookie;
const base = "http://127.0.0.1:4182";
async function api(path, method = "GET", body, expected = 200) {
  const r = await fetch(base + "/api/v1/" + path, {
    method,
    headers: { cookie, "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const v = await r.json();
  assert.equal(r.status, expected, JSON.stringify(v));
  return v;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function poll(fn, timeout = 12000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const result = await fn();
    if (result) return result;
    await wait(100);
  }
  throw new Error("Timed out");
}
async function start() {
  server = spawn(join(repo, "target/debug/relai"), {
    cwd: repo,
    env: {
      ...process.env,
      RELAI_PORT: "4182",
      RELAI_DATA_DIR: data,
      RELAI_SESSION_ROOTS: JSON.stringify([{ tool: "Codex", path: root }]),
      RELAI_DISCOVERY_ISOLATED: "1",
      RELAI_CODEX_BIN: join(repo, "crates/relai/tests/fake-codex.py"),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (b) => process.stderr.write(b));
  await poll(async () => {
    try {
      const r = await fetch(base + "/api/v1/bootstrap");
      cookie = r.headers.get("set-cookie")?.split(";")[0];
      return r.ok;
    } catch {
      return false;
    }
  });
}
async function stop(signal = "SIGTERM") {
  const p = server;
  server = null;
  if (p) {
    if (p.exitCode === null && p.signalCode === null) {
      p.kill(signal);
      await new Promise((r) => p.once("exit", r));
    }
  }
}
async function draft(text, sid = null) {
  let d = await api("drafts", "POST");
  d = {
    ...d,
    tool: "Codex",
    cwd,
    title: "Fixture chat",
    markdown: text,
    sessionId: sid,
  };
  return api("drafts/" + d.id, "PUT", d);
}
async function submit(d, extra = {}) {
  return api("deliveries", "POST", {
    draftId: d.id,
    revision: d.revision,
    idempotencyKey: "key-" + d.id,
    ...extra,
  });
}
async function delivery(id) {
  return (await api("deliveries/" + id)).delivery;
}
async function complete(id) {
  return poll(async () => {
    const d = await delivery(id);
    return d.execution === "completed" && d;
  });
}
async function action(d, action, extra = {}) {
  return api("deliveries/" + d.id + "/actions", "POST", {
    revision: d.revision,
    action,
    ...extra,
  });
}
try {
  await start();
  const detected = await poll(async () => {
    const p = await api("sessions");
    return p.items[0];
  });
  assert.equal((await api("mailbox?view=inbox")).total, 0);
  const d = await draft("hello native", detected.id);
  await api(
    "deliveries",
    "POST",
    { draftId: d.id, revision: d.revision - 1, idempotencyKey: "stale" },
    409,
  );
  const [one, two] = await Promise.all([submit(d), submit(d)]);
  assert.equal(one.id, two.id);
  const done = await complete(one.id);
  assert.equal(done.nativeThreadId, "detected");
  assert.equal((await api("drafts")).length, 0);
  const history = await api("sessions/" + detected.id + "/messages");
  assert.equal(
    history.items.filter((m) => m.text === "Previous native history").length,
    1,
  );
  assert.equal(
    history.items.filter((m) => m.text === "hello native").length,
    1,
  );
  assert.equal(
    history.items.filter((m) => m.text === "Fixture reply: hello native")
      .length,
    1,
  );
  assert.equal((await api("mailbox?q=envoyer:hello&view=inbox")).scope, "sent");
  assert.equal((await api("mailbox?q=envoyer:hello&view=inbox")).total, 1);
  assert.equal((await api("mailbox?q=inbox:nope&view=sessions")).total, 0);
  await api("mailbox?q=in:sent%20in:inbox", "GET", undefined, 400);
  const queued = await submit(await draft("slow first", detected.id));
  await poll(async () => {
    const d = await delivery(queued.id);
    return d.execution === "running";
  });
  const second = await submit(await draft("second in queue", detected.id));
  await wait(700);
  assert.equal((await delivery(second.id)).status, "queued");
  const parallel = await submit(await draft("parallel same folder"));
  await complete(parallel.id);
  assert.equal((await delivery(queued.id)).execution, "running");
  await complete(queued.id);
  await complete(second.id);
  for (const type of ["approval", "question", "permissions"]) {
    const d = await submit(await draft(type));
    const r = await poll(async () => {
      const state = await delivery(d.id);
      if (!state.draft.sessionId) return false;
      const a = await api("sessions/" + state.draft.sessionId + "/activity");
      return a.requests.find((r) => r.state === "pending");
    });
    const result =
      type === "question"
        ? { answers: { choice: "A" } }
        : { decision: "accept" };
    await api("requests/" + r.id + "/respond", "POST", result);
    await api("requests/" + r.id + "/respond", "POST", result, 409);
    await complete(d.id);
  }
  const stopped = await submit(await draft("slow stop"));
  const running = await poll(async () => {
    const d = await delivery(stopped.id);
    return d.execution === "running" && d;
  });
  await api("sessions/" + running.draft.sessionId + "/interrupt", "POST");
  await poll(
    async () => (await delivery(stopped.id)).execution === "interrupted",
  );
  const scheduled = await submit(await draft("scheduled"), {
    dueAt: Date.now() + 2000,
    timezone: "UTC",
  });
  assert.equal(scheduled.status, "scheduled");
  await complete(scheduled.id);
  const cancelled = await submit(await draft("cancel schedule"), {
    dueAt: Date.now() + 60000,
    timezone: "UTC",
  });
  const restored = await action(cancelled, "cancel");
  assert.equal(restored.draft.markdown, "cancel schedule");
  await api(
    "deliveries/" + cancelled.id + "/actions",
    "POST",
    { revision: restored.delivery.revision, action: "cancel" },
    409,
  );
  const missing = await draft("bad schedule");
  await api(
    "deliveries",
    "POST",
    {
      draftId: missing.id,
      revision: missing.revision,
      idempotencyKey: "invalid-time",
      dueAt: "invalid",
    },
    400,
  );
  const missed = await submit(await draft("missed"), {
    dueAt: Date.now() + 1800,
    timezone: "UTC",
  });
  const interrupted = await submit(await draft("slow recovery"));
  await poll(async () =>
    delivery(interrupted.id).then((d) => d.execution === "running"),
  );
  await stop("SIGKILL");
  await wait(2100);
  await start();
  assert.equal((await delivery(missed.id)).status, "missed");
  assert.equal((await delivery(interrupted.id)).status, "uncertain");
  const reconciled = await action(
    await delivery(interrupted.id),
    "reconcile",
  ).catch(() => null); // A killed turn can still lack a terminal outcome.
  if (reconciled)
    assert.ok(
      ["completed", "failed", "interrupted"].includes(
        reconciled.delivery.execution,
      ),
    );
  const lost = await submit(await draft("lost-ack"));
  await poll(async () => (await delivery(lost.id)).status === "uncertain");
  await wait(1000);
  const state = JSON.parse(
    await readFile(join(root, ".fixture-state.json"), "utf8"),
  );
  assert.equal(
    Object.values(state)
      .flatMap((s) => s.turns)
      .filter((t) => t.items[0].content[0].text === "lost-ack").length,
    1,
  );
  await submit((await api("drafts")).find((d) => d.id === restored.draft.id));
  const parallelStart = Date.now();
  const bulk = await Promise.all(
    Array.from({ length: 25 }, async (_, i) =>
      submit(await draft("load session " + i)),
    ),
  );
  await Promise.all(bulk.map((d) => complete(d.id)));
  console.log(
    "25 independent sessions completed in " +
      (Date.now() - parallelStart) +
      " ms using the protocol fixture.",
  );
  await stop();
  const db = new DatabaseSync(join(data, "relai.sqlite"));
  assert.equal(
    db
      .prepare("select count(*) as n from deliveries where key=?")
      .get("key-" + d.id).n,
    1,
  );
  assert.ok(db.prepare("pragma user_version").get().user_version >= 1);
  // Native inputs must never be converted into a text-only graphical retry,
  // including cancellation/restoration and scheduling bypasses.
  const native = {
    ...done,
    id: "native-recovery-fixture",
    key: "terminal:native-recovery-fixture",
    draft: { ...done.draft, id: "native-recovery-draft" },
    status: "failed",
    execution: "unknown",
    stage: "starting_turn",
    acceptedAt: null,
    revision: 1,
  };
  const nativeInput = JSON.stringify({
    input: [
      { type: "text", text: "Keep native skill and image" },
      { type: "skill", name: "fixture", path: "/fixture/SKILL.md" },
      { type: "localImage", path: "/fixture/image.png" },
    ],
  });
  db.prepare(
    "INSERT INTO deliveries(id,key,draft_id,session_id,status,created,data) VALUES(?,?,?,?,?,?,?)",
  ).run(
    native.id,
    native.key,
    native.draft.id,
    detected.id,
    native.status,
    native.created,
    JSON.stringify(native),
  );
  db.prepare("INSERT INTO terminal_turns VALUES(?,?)").run(
    native.id,
    nativeInput,
  );
  db.close();
  await start();
  const draftsBefore = await api("drafts");
  for (const operation of [
    "retry",
    "resend",
    "cancel",
    "reschedule",
    "send_now",
  ]) {
    const rejected = await api(
      "deliveries/" + native.id + "/actions",
      "POST",
      {
        revision: 1,
        action: operation,
        confirmDuplicateRisk: true,
        dueAt: Date.now() + 60000,
        timezone: "UTC",
      },
      409,
    );
    assert.match(rejected.error, /native terminal input/);
  }
  await api(
    "deliveries/" + native.id,
    "PATCH",
    { revision: 1, markdown: "Text only" },
    409,
  );
  assert.deepEqual(await api("drafts"), draftsBefore);
  assert.equal((await delivery(native.id)).status, "failed");
  const skippedNative = await action(native, "skip");
  assert.equal(skippedNative.delivery.status, "cancelled");
  assert.equal(skippedNative.draft, null);
  await stop();
  const verified = new DatabaseSync(join(data, "relai.sqlite"));
  assert.equal(
    verified
      .prepare("SELECT params FROM terminal_turns WHERE delivery_id=?")
      .get(native.id).params,
    nativeInput,
  );
  verified.close();
  console.log(
    "Delivery protocol, FIFO, parallel sessions, interactions, scheduling, restart and idempotency passed. Fixtures: " +
      temp,
  );
} finally {
  await stop();
}
