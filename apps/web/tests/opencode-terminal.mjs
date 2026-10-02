import { chromium, expect } from "@playwright/test";
import { DatabaseSync } from "node:sqlite";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const repo = resolve(import.meta.dirname, "../../.."),
  temp = await mkdtemp(join(tmpdir(), "relai-opencode-terminal-")),
  root = join(temp, "opencode"),
  cwd = join(temp, "project"),
  bin = join(temp, "bin");
await Promise.all([mkdir(root), mkdir(cwd), mkdir(bin)]);
await symlink(
  join(repo, "crates/relai/tests/fake-opencode.py"),
  join(bin, "opencode"),
);
const dbPath = join(root, "opencode.db");
const db = new DatabaseSync(dbPath);
db.exec(
  "CREATE TABLE session(id TEXT PRIMARY KEY,title TEXT,directory TEXT,time_updated INTEGER);CREATE TABLE message(id TEXT PRIMARY KEY,session_id TEXT,time_created INTEGER,data TEXT);CREATE TABLE part(id TEXT PRIMARY KEY,message_id TEXT,time_created INTEGER,data TEXT)",
);
db.prepare(
  "INSERT INTO session VALUES('ses_fixture','OpenCode fixture',?,?)",
).run(cwd, Date.now());
db.close();
const server = spawn(join(repo, "target/debug/relai"), {
  cwd: repo,
  env: {
    ...process.env,
    PATH: bin + ":" + process.env.PATH,
    RELAI_PORT: "4188",
    RELAI_DATA_DIR: join(temp, "data"),
    RELAI_SESSION_ROOTS: JSON.stringify([{ tool: "OpenCode", path: root }]),
    RELAI_DISCOVERY_ISOLATED: "1",
    RELAI_FIXTURE_DB: dbPath,
  },
  stdio: ["ignore", "ignore", "pipe"],
});
server.stderr.on("data", (b) => process.stderr.write(b));
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let browser;
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4188")).ok) break;
    } catch {}
    await wait(100);
  }
  browser = await chromium.launch({
    executablePath: process.env.RELAI_CHROMIUM,
    args: ["--no-sandbox"],
  });
  for (const native of [false, true]) {
    const context = await browser.newContext();
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("http://127.0.0.1:4188");
    await page.getByRole("button", { name: "Sessions", exact: true }).click();
    await page.locator(".session-row .row-main").click();
    await page.getByRole("tab", { name: "Open terminal", exact: true }).click();
    await expect(page.locator(".xterm-accessibility-tree")).toContainText(
      "Attached exact native session",
      { timeout: 20000 },
    );
    await expect(
      page.getByRole("heading", { name: "Approval requested", exact: true }),
    ).toBeVisible({ timeout: 10000 });
    if (native) {
      await page.locator(".xterm-helper-textarea").focus();
      await page.keyboard.type("native-allow");
      await page.keyboard.press("Enter");
      await expect(page.locator(".xterm-accessibility-tree")).toContainText(
        "Native permission answered",
      );
    } else {
      await page
        .getByRole("button", { name: "Allow once", exact: true })
        .click();
    }
    await expect(page.locator(".interaction-card")).toHaveCount(0, {
      timeout: 10000,
    });
    await page.getByRole("tab", { name: "Markdown", exact: true }).click();
    await expect(
      page.getByText("OpenCode native fixture reply", { exact: true }),
    ).toBeVisible({ timeout: 10000 });
    await page.getByRole("tab", { name: "Open terminal", exact: true }).click();
    await page
      .getByRole("button", { name: "Return to automatic sending", exact: true })
      .click();
    await expect(page.locator(".terminal-panel")).toHaveCount(0);
    expect(errors).toEqual([]);
    await context.close();
  }
  console.log(
    "OpenCode HTTP/SSE fixture: authenticated attach, exact session, GUI and native permission responses, resolved cards, native history/reply and release passed.",
  );
} finally {
  await browser?.close();
  server.kill("SIGTERM");
  await wait(300);
}
