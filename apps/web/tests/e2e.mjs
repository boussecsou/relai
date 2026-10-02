import { chromium, expect } from "@playwright/test";
import { mkdtemp, mkdir, writeFile, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawn } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import http from "node:http";
const repo = resolve(import.meta.dirname, "../../..");
const temp = await mkdtemp(join(tmpdir(), "relai-e2e-"));
const native = join(temp, "codex"),
  claude = join(temp, "claude"),
  oc = join(temp, "opencode"),
  bin = join(temp, "bin");
await Promise.all([
  mkdir(join(native, "sessions"), { recursive: true }),
  mkdir(join(claude, "projects"), { recursive: true }),
  mkdir(oc),
  mkdir(bin),
]);
const executions = join(temp, "executions");
await writeFile(
  join(bin, "codex"),
  '#!/bin/sh\necho executed >> "' + executions + '"\n',
  { mode: 0o755 },
);
const lines = (records) =>
  records.map((v) => JSON.stringify(v) + "\n").join("");
const records = [
  {
    type: "session_meta",
    payload: {
      id: "native-real",
      cwd: "/projects/sample",
      git: { branch: "main" },
    },
  },
  ...Array.from({ length: 62 }, (_, i) => ({
    type: "response_item",
    timestamp: "2026-09-30T10:00:00Z",
    payload: {
      role: i % 2 ? "assistant" : "user",
      content: [
        {
          type: "output_text",
          text:
            "Message " +
            i +
            (i === 61
              ? "\n\n## Résultat\n\n- [x] Terminé\n\n**Texte** et `code`."
              : ""),
        },
      ],
    },
  })),
];
const transcript = join(native, "sessions", "real.jsonl");
await writeFile(transcript, lines(records));
await writeFile(
  join(native, "session_index.jsonl"),
  lines([{ id: "native-real", thread_name: "Conversation retenue" }]),
);
await writeFile(join(claude, "projects", "broken.jsonl"), "malformed\n");
const db = new DatabaseSync(join(oc, "opencode.db"));
db.exec("CREATE TABLE unexpected(id TEXT)");
db.close();
const roots = [
  { tool: "Codex", path: native },
  { tool: "Claude Code", path: claude },
  { tool: "OpenCode", path: oc },
  { tool: "Pi", path: join(temp, "absent") },
];
let server, browser;
const base = "http://127.0.0.1:4181";
const rawStatus = (headers) =>
  new Promise((resolve, reject) => {
    const request = http.get(
      base + "/api/v1/bootstrap",
      { headers },
      (response) => {
        response.resume();
        resolve(response.statusCode);
      },
    );
    request.on("error", reject);
  });
function start(persisted = false) {
  server = spawn(resolve(repo, "target/debug/relai"), {
    cwd: repo,
    env: {
      ...process.env,
      RELAI_PORT: "4181",
      RELAI_DATA_DIR: join(temp, "data"),
      ...(persisted ? {} : { RELAI_SESSION_ROOTS: JSON.stringify(roots) }),
      RELAI_DISCOVERY_ISOLATED: "1",
      PATH: bin + ":" + process.env.PATH,
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  server.stderr.on("data", (b) => process.stderr.write(b));
}
async function stop() {
  if (!server) return;
  const done = new Promise((resolve) => server.once("exit", resolve));
  server.kill("SIGTERM");
  await done;
  server = null;
}
async function waitServer() {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch(base)).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Server startup failed");
}
try {
  start();
  await waitServer();
  browser = await chromium.launch({
    headless: true,
    executablePath: process.env.RELAI_CHROMIUM || undefined,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1365, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await expect(
    page.getByRole("heading", { name: "Your Inbox is clear" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      async () => (await (await fetch("/api/v1/drafts")).json()).length,
    ),
  ).toBe(0);
  expect(
    await page.evaluate(
      async () => (await (await fetch("/api/v1/labels")).json()).length,
    ),
  ).toBe(0);
  await page.screenshot({ path: join(temp, "inbox.png") });
  await page
    .getByRole("button", { name: "View sessions", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: /^Conversation retenue/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: /^Conversation retenue/ }).click();
  await expect(
    page.getByRole("heading", { name: "Conversation retenue" }),
  ).toBeVisible();
  await expect(page.getByText("Message 61")).toBeVisible();
  await expect(page.getByText("Message 0", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Load older messages" }).click();
  await expect(page.getByText("Message 0", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reply" }).click();
  await expect(page.getByRole("heading", { name: "Reply" })).toBeVisible();
  await expect(page.getByPlaceholder("Chat name")).toHaveCount(0);
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  const markdown =
    "# Mon Relai\n\nUn **texte** avec _italique_ et [lien](https://example.com).\n\n- [ ] Une tâche\n- [x] Terminée\n\n> Citation\n\n```ts\nconst x = 1\n```\n\n| Nom | État |\n| --- | --- |\n| Test | OK |";
  await page.getByRole("textbox", { name: "Markdown message" }).fill(markdown);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Preview", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Mon Relai" })).toBeVisible();
  await page.getByRole("tab", { name: "Visual", exact: true }).click();
  await expect(page.locator(".tiptap")).toBeVisible();
  await expect(page.locator(".tiptap table")).toBeVisible();
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown message" }),
  ).toHaveValue(markdown);
  const unsupported =
    "<!-- conserver exactement -->\n\nTexte avec <custom-element>balise</custom-element>.";
  await page
    .getByRole("textbox", { name: "Markdown message" })
    .fill(unsupported);
  await page.getByRole("tab", { name: "Visual", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown message" }),
  ).toHaveValue(unsupported);
  await page.locator(".more-actions summary").click();
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await page.getByRole("button", { name: "Drafts", exact: false }).click();
  await page.getByRole("button", { name: /^Conversation retenue/ }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown message" }),
  ).toHaveValue(unsupported);
  // Concurrent change through a second client: no silent overwriting.
  const second = await context.newPage();
  await second.goto(base);
  const saved = await second.evaluate(
    async () => (await (await fetch("/api/v1/drafts")).json())[0],
  );
  await second.evaluate(async (d) => {
    await fetch("/api/v1/drafts/" + d.id, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...d, markdown: "Autre onglet" }),
    });
  }, saved);
  await page
    .getByRole("textbox", { name: "Markdown message" })
    .fill("Mon texte à conserver");
  await expect(
    page.getByRole("alert").filter({ hasText: "another tab" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Save a copy" }).click();
  await expect(page.getByText("Copy saved", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Back", exact: true }).click();
  // Labels are persisted, not populated by default.
  await page.getByRole("button", { name: "Create label" }).click();
  await page.getByLabel("Name", { exact: true }).fill("À revoir");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Edit À revoir" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await page.getByRole("button", { name: /^Conversation retenue/ }).click();
  await page.getByLabel("À revoir", { exact: true }).check();
  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          (await (await fetch("/api/v1/sessions")).json()).items[0].annotations
            .labels.length,
      ),
    )
    .toBe(1);
  await page.getByRole("button", { name: /Back to Sessions/ }).click();
  // Watcher picks up a new native session without a manual refresh.
  await writeFile(
    join(native, "sessions", "new.jsonl"),
    lines([
      { type: "session_meta", payload: { id: "new-native", cwd: "/new" } },
      {
        type: "response_item",
        payload: { role: "user", content: "Nouveau travail" },
      },
    ]),
  );
  await expect(
    page.getByRole("button", { name: /^Nouveau travail/ }),
  ).toBeVisible({ timeout: 35000 });
  await page
    .getByRole("button", { name: "Sources and discovery", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByText(/Partial discovery/),
  ).toHaveCount(2);
  await page.getByText("Configure sources", { exact: true }).click();
  const extra = join(temp, "extra-codex");
  await mkdir(join(extra, "sessions"), { recursive: true });
  await writeFile(
    join(extra, "sessions", "extra.jsonl"),
    lines([
      { type: "session_meta", payload: { id: "extra", cwd: "/extra" } },
      {
        type: "response_item",
        payload: { role: "user", content: "Source personnalisée" },
      },
    ]),
  );
  await page.getByRole("button", { name: "Add", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Source folder 5", exact: true })
    .fill(extra);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Save", exact: true })
    .click();
  await expect(page.getByText("Sources saved.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Source personnalisée/ }),
  ).toBeVisible({ timeout: 35000 });
  expect(
    await page.evaluate(
      async () => (await (await fetch("/api/v1/roots")).json()).length,
    ),
  ).toBe(5);
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.screenshot({ path: join(temp, "sessions-light.png") });
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  // Origin and authentication checks.
  expect((await fetch(base + "/api/v1/drafts")).status).toBe(401);
  expect(
    (
      await fetch(base + "/api/v1/bootstrap", {
        headers: { Origin: "https://evil.example" },
      })
    ).status,
  ).toBe(403);
  expect(await rawStatus({ Host: "evil.example" })).toBe(403);
  expect(await rawStatus({ "Sec-Fetch-Site": "cross-site" })).toBe(403);
  // UI stays within narrow screens; keyboard shortcuts do not consume typed text.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open navigation" }).click();
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Your Inbox is clear" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: join(temp, "mobile.png") });
  await page
    .getByRole("button", { name: "Compose a Relai", exact: true })
    .last()
    .click();
  await expect(page.locator(".tiptap")).toBeVisible();
  await page.locator(".tiptap").pressSequentially("Un nouveau Relai");
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: "Markdown message" }),
  ).toHaveValue("Un nouveau Relai");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Back", exact: true }).click();
  // Native transcript is unchanged, no harness executed.
  expect(await readFile(transcript, "utf8")).toBe(lines(records));
  let executed = false;
  try {
    await access(executions);
    executed = true;
  } catch {}
  expect(executed).toBe(false);
  expect(errors).toEqual([]);
  // Restart service: drafts and labels survive; startup returns to an empty Inbox.
  await context.close();
  await stop();
  start(true);
  await waitServer();
  const finalPage = await browser.newPage();
  await finalPage.goto(base);
  await expect(
    finalPage.getByRole("heading", { name: "Your Inbox is clear" }),
  ).toBeVisible();
  expect(
    await finalPage.evaluate(
      async () => (await (await fetch("/api/v1/drafts")).json()).length,
    ),
  ).toBe(3);
  expect(
    await finalPage.evaluate(
      async () => (await (await fetch("/api/v1/labels")).json()).length,
    ),
  ).toBe(1);
  expect(
    await finalPage.evaluate(
      async () => (await (await fetch("/api/v1/roots")).json()).length,
    ),
  ).toBe(5);
  console.log(
    "E2E OK: blank Inbox, histories, pagination, editor roundtrip, drafts, conflict copy, labels, watcher, security, mobile, zero harness executions.",
  );
  console.log("Fixture screenshots: " + temp);
} finally {
  await browser?.close();
  await stop();
}
