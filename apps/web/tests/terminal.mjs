import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const repo = resolve(import.meta.dirname, "../../..");
const temp = await mkdtemp(join(tmpdir(), "relai-terminal-"));
const root = join(temp, "codex"),
  cwd = join(temp, "project");
await mkdir(join(root, "sessions"), { recursive: true });
await mkdir(cwd);
await writeFile(
  join(root, "sessions", "fixture.jsonl"),
  JSON.stringify({
    type: "session_meta",
    payload: { id: "terminal-fixture", cwd },
  }) +
    "\n" +
    JSON.stringify({
      type: "response_item",
      payload: {
        role: "user",
        content: [{ type: "input_text", text: "Terminal fixture" }],
      },
    }) +
    "\n",
);
const fixture = join(temp, "pty.py");
await writeFile(
  fixture,
  '#!/usr/bin/env python3\nimport sys\nprint("\\033[32mNative PTY ready\\033[0m", flush=True)\nfor line in sys.stdin:\n print("PTY reply: " + line.strip(), flush=True)\n',
  { mode: 0o755 },
);
const server = spawn(join(repo, "target/debug/relai"), {
  cwd: repo,
  env: {
    ...process.env,
    RELAI_PORT: "4185",
    RELAI_DATA_DIR: join(temp, "data"),
    RELAI_DISCOVERY_ISOLATED: "1",
    RELAI_SESSION_ROOTS: JSON.stringify([{ tool: "Codex", path: root }]),
    RELAI_CODEX_BIN: join(repo, "crates/relai/tests/fake-codex.py"),
    RELAI_TERMINAL_TEST_COMMAND: fixture,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
server.stderr.on("data", (data) => process.stderr.write(data));
let browser;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4185")).ok) break;
    } catch {}
    await wait(100);
  }
  browser = await chromium.launch({
    executablePath: process.env.RELAI_CHROMIUM,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4185");
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await page.locator(".session-row .row-main").click();
  await page.getByRole("tab", { name: "Open terminal", exact: true }).click();
  await expect(
    page.getByText("You control this terminal", { exact: true }),
  ).toBeVisible({ timeout: 20000 });
  await expect(page.locator(".xterm-accessibility-tree")).toContainText(
    "Native PTY ready",
  );
  await page.locator(".xterm-helper-textarea").focus();
  await page.keyboard.type("one owner");
  await page.keyboard.press("Enter");
  await expect(page.locator(".xterm-accessibility-tree")).toContainText(
    "PTY reply: one owner",
  );
  await page.keyboard.press("Control+Escape");
  await expect(
    page.getByRole("button", { name: "Reconnect", exact: true }),
  ).toBeFocused();
  const other = await context.newPage();
  other.on("pageerror", (e) => errors.push(e.message));
  await other.goto("http://127.0.0.1:4185");
  await other.getByRole("button", { name: "Sessions", exact: true }).click();
  await other.locator(".session-row .row-main").click();
  await other.getByRole("tab", { name: "Open terminal", exact: true }).click();
  await expect(
    other.getByText("Observing · take control to type", { exact: true }),
  ).toBeVisible();
  await expect(other.locator(".xterm-accessibility-tree")).toContainText(
    "PTY reply: one owner",
  );
  const sessions = await context.request.get(
    "http://127.0.0.1:4185/api/v1/sessions",
  );
  const sid = (await sessions.json()).items[0].id;
  async function api(path, method = "GET", data) {
    const response = await context.request.fetch(
      "http://127.0.0.1:4185/api/v1/" + path,
      { method, data },
    );
    expect(response.ok()).toBe(true);
    return response.json();
  }
  const queued = [];
  for (const schedule of [false, true]) {
    let draft = await api("drafts", "POST");
    draft = await api("drafts/" + draft.id, "PUT", {
      ...draft,
      sessionId: sid,
      tool: "Codex",
      cwd,
      title: "Terminal queue fixture",
      markdown: schedule
        ? "scheduled while terminal owns chat"
        : "queued while terminal owns chat",
    });
    queued.push(
      await api("deliveries", "POST", {
        draftId: draft.id,
        revision: draft.revision,
        idempotencyKey: draft.id,
        ...(schedule ? { dueAt: Date.now() + 600, timezone: "UTC" } : {}),
      }),
    );
  }
  await wait(1200);
  for (const delivery of queued)
    expect((await api("deliveries/" + delivery.id)).delivery.status).toBe(
      "queued",
    );
  await other
    .getByRole("button", { name: "Take control", exact: true })
    .click();
  await expect(
    other.getByText("You control this terminal", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Observing · take control to type", { exact: true }),
  ).toBeVisible();
  await other.locator(".xterm-helper-textarea").focus();
  await other.keyboard.type("second owner");
  await other.keyboard.press("Enter");
  await expect(other.locator(".xterm-accessibility-tree")).toContainText(
    "PTY reply: second owner",
  );
  await other.getByRole("tab", { name: "Markdown", exact: true }).click();
  await expect(other.locator(".terminal-panel")).toHaveCount(0);
  await other.getByRole("tab", { name: "Open terminal", exact: true }).click();
  await expect(other.locator(".xterm-accessibility-tree")).toContainText(
    "PTY reply: second owner",
  );
  await expect(
    other.getByText("You control this terminal", { exact: true }),
  ).toBeVisible();
  for (const width of [390, 768, 1024, 1365, 1920]) {
    await other.setViewportSize({ width, height: 900 });
    expect(
      await other.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await other
    .getByRole("button", { name: "Return to automatic sending", exact: true })
    .click();
  await expect(other.locator(".terminal-panel")).toHaveCount(0);
  const state = await context.request.get(
    `http://127.0.0.1:4185/api/v1/sessions/${sid}/terminal`,
  );
  expect(await state.json()).toMatchObject({
    mode: "automatic",
    running: false,
  });
  await expect
    .poll(
      async () => (await api("deliveries/" + queued[1].id)).delivery.execution,
      { timeout: 10000 },
    )
    .toBe("completed");
  expect(errors).toEqual([]);
  console.log(
    "Terminal: native PTY, two-tab lease, rendered snapshot, hide/reconnect, keyboard escape, responsive layouts and explicit automatic sending passed.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await wait(300);
}
