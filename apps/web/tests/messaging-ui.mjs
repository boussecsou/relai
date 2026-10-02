import { chromium, expect } from "@playwright/test";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
const repo = resolve(import.meta.dirname, "../../.."),
  temp = await mkdtemp(join(tmpdir(), "relai-messaging-ui-")),
  root = join(temp, "codex"),
  folder = join(temp, "project");
await mkdir(join(root, "sessions"), { recursive: true });
await mkdir(join(folder, "subfolder"), { recursive: true });
await writeFile(
  join(root, "sessions", "fixture.jsonl"),
  JSON.stringify({
    type: "session_meta",
    payload: { id: "fixture-history", cwd: folder },
  }) +
    "\n" +
    JSON.stringify({
      type: "response_item",
      payload: {
        role: "assistant",
        content: [{ type: "output_text", text: "Read-only fixture history" }],
      },
    }) +
    "\n",
);
const server = spawn(join(repo, "target/debug/relai"), {
  cwd: repo,
  env: {
    ...process.env,
    RELAI_PORT: "4184",
    RELAI_DATA_DIR: join(temp, "data"),
    RELAI_SESSION_ROOTS: JSON.stringify([{ tool: "Codex", path: root }]),
    RELAI_DISCOVERY_ISOLATED: "1",
    RELAI_CODEX_BIN: join(repo, "crates/relai/tests/fake-codex.py"),
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (b) => process.stderr.write(b));
let browser;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const errors = [];
try {
  for (let i = 0; i < 100; i++) {
    try {
      if ((await fetch("http://127.0.0.1:4184")).ok) break;
    } catch {}
    await wait(100);
  }
  browser = await chromium.launch({
    executablePath: process.env.RELAI_CHROMIUM,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1365, height: 900 },
    reducedMotion: "reduce",
  });
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://127.0.0.1:4184");
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("link", { name: "Skip to workspace" }),
  ).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page.locator("#workspace")).toBeFocused();
  await expect(
    page.getByRole("heading", { name: "Your Inbox is clear" }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Compose a Relai", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("dialog", { name: "Compose a Relai", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Destination", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Message", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Agent", { exact: true }).selectOption("Codex");
  await page.getByRole("combobox", { name: "Working folder" }).fill(folder);
  await page
    .getByLabel("Chat title", { exact: true })
    .fill("UI fixture delivery");
  await page.getByRole("button", { name: "Browse", exact: true }).click();
  await expect(
    page.getByRole("dialog", { name: "Choose working folder" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "subfolder", exact: false }).click();
  await page.getByRole("button", { name: "Use this folder" }).click();
  await expect(
    page.getByRole("combobox", { name: "Working folder" }),
  ).toHaveValue(join(folder, "subfolder"));
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Markdown message" })
    .fill("approval from browser");
  const modal = page.getByRole("dialog", {
    name: "Compose a Relai",
    exact: true,
  });
  expect(
    await modal.evaluate(
      (el) => getComputedStyle(el, "::backdrop").backdropFilter,
    ),
  ).toContain("blur");
  const bounds = await modal.boundingBox();
  expect(Math.abs(bounds.x + bounds.width / 2 - 1365 / 2)).toBeLessThan(2);
  expect(Math.abs(bounds.y + bounds.height / 2 - 900 / 2)).toBeLessThan(2);
  for (let i = 0; i < 25; i++) {
    await page.keyboard.press("Tab");
    expect(
      await modal.evaluate(
        (el) =>
          el.contains(document.activeElement) ||
          document.activeElement === document.body,
      ),
    ).toBe(true);
  }
  for (const width of [1920, 1365, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({ path: join(temp, "compose-" + width + ".png") });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const send = await page
      .getByRole("button", { name: "Send", exact: true })
      .boundingBox();
    expect(send?.width).toBeGreaterThan(24);
  }
  await page.setViewportSize({ width: 1365, height: 900 });
  await page.getByRole("button", { name: "Expand composer" }).click();
  await expect(page.locator(".compose-modal")).toHaveClass(/expanded/);
  await page.getByRole("button", { name: "Restore composer" }).click();
  await expect(
    page.getByRole("dialog", { name: "Compose a Relai", exact: true }),
  ).toBeVisible();
  await page.getByRole("tab", { name: "Markdown", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(
    page.getByRole("tab", { name: "Preview", exact: true }),
  ).toBeFocused();
  await page.keyboard.press("ArrowLeft");
  await page.getByRole("button", { name: "Send", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "UI fixture delivery", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "View conversation" }).click();
  await expect(
    page.getByRole("heading", { name: "Approval requested" }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Allow once" }).click();
  await expect(
    page.getByText("Fixture reply: approval from browser", { exact: true }),
  ).toBeVisible({ timeout: 10000 });
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await expect(page.locator(".session-row")).toHaveCount(1);
  await page.getByRole("tab", { name: "Replies 1", exact: true }).click();
  await expect(page.locator(".session-row")).toHaveCount(1);
  await page
    .getByRole("tab", { name: "Needs attention 0", exact: true })
    .click();
  await expect(page.locator(".session-row")).toHaveCount(0);
  await page.getByRole("tab", { name: "All 1", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Search mailboxes and sessions" })
    .fill("envoyer:approval");
  await expect(page.getByRole("heading", { name: "Sent 1" })).toBeVisible();
  await expect(page.locator(".draft-row")).toHaveCount(1);
  await page
    .getByRole("textbox", { name: "Search mailboxes and sessions" })
    .fill("in:sent in:inbox");
  await expect(page.getByRole("alert")).toContainText(
    "Choose only one mailbox",
  );
  await page.getByRole("button", { name: "Inbox", exact: true }).click();
  await page
    .getByRole("button", { name: "Compose a Relai", exact: true })
    .first()
    .click();
  await page.getByLabel("Agent", { exact: true }).selectOption("Codex");
  await page.getByRole("combobox", { name: "Working folder" }).fill(folder);
  await page
    .getByLabel("Chat title", { exact: true })
    .fill("Scheduled browser fixture");
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Markdown message" })
    .fill("scheduled from browser");
  await page.getByRole("button", { name: "Schedule", exact: true }).click();
  const local = await page.evaluate(() => {
    const future = new Date(Date.now() + 3600000);
    return new Date(future.getTime() - future.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  });
  await page.getByLabel("Send at", { exact: true }).fill(local);
  await page
    .getByRole("button", { name: "Schedule send", exact: true })
    .click();
  await expect(
    page.getByRole("heading", {
      name: "Scheduled browser fixture",
      exact: true,
    }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cancel and restore draft" }).click();
  await page.getByRole("button", { name: "Drafts", exact: true }).click();
  await expect(
    page.getByRole("button", { name: /^Scheduled browser fixture/ }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Light theme", exact: true }).click();
  await page
    .getByRole("button", { name: /^Scheduled browser fixture/ })
    .click();
  await page.setViewportSize({ width: 390, height: 900 });
  await page
    .getByLabel("Chat title", { exact: true })
    .fill("LongTitle".repeat(20));
  await page
    .getByRole("textbox", { name: "Markdown message" })
    .fill(
      "A long message with a URL: https://example.com/" + "segment".repeat(80),
    );
  await page.screenshot({ path: join(temp, "compose-mobile-light.png") });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  // Browser zoom changes the CSS viewport. Reproduce 200% reflow, rather than
  // setting CSS zoom (which leaves media-query viewport dimensions unchanged).
  const zoomContext = await browser.newContext({
    viewport: { width: 683, height: 450 },
    deviceScaleFactor: 2,
    reducedMotion: "reduce",
  });
  const zoomPage = await zoomContext.newPage();
  zoomPage.on("pageerror", (e) => errors.push(e.message));
  await zoomPage.goto("http://127.0.0.1:4184");
  await zoomPage.getByRole("button", { name: "Open navigation" }).click();
  await zoomPage.getByRole("button", { name: "Drafts", exact: true }).click();
  await zoomPage.locator(".draft-row .row-main").click();
  await zoomPage.getByRole("tab", { name: "Markdown", exact: true }).click();
  await zoomPage
    .getByRole("textbox", { name: "Markdown message" })
    .scrollIntoViewIfNeeded();
  await zoomPage.screenshot({ path: join(temp, "compose-zoom.png") });
  expect(
    await zoomPage.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  const zoomSend = await zoomPage
    .getByRole("button", { name: "Send", exact: true })
    .boundingBox();
  expect(zoomSend.x + zoomSend.width).toBeLessThanOrEqual(683);
  expect(zoomSend.y + zoomSend.height).toBeLessThanOrEqual(450);
  await zoomContext.close();
  // Typing while Back waits for a slow save must preserve the newer revision.
  await page.setViewportSize({ width: 1365, height: 900 });
  await expect(page.getByText("Saved", { exact: true })).toBeVisible();
  let releaseSave, observeSave;
  const heldSave = new Promise((resolve) => {
    releaseSave = resolve;
  });
  const saveStarted = new Promise((resolve) => {
    observeSave = resolve;
  });
  let intercepted = false;
  await page.route("**/api/v1/drafts/*", async (route) => {
    if (route.request().method() === "PUT" && !intercepted) {
      intercepted = true;
      observeSave();
      await heldSave;
    }
    await route.continue();
  });
  const message = page.getByRole("textbox", { name: "Markdown message" });
  await message.fill("Draft before close");
  await page.getByRole("button", { name: "Back", exact: true }).click();
  await saveStarted;
  await message.fill("Draft typed while closing");
  releaseSave();
  await expect(modal).not.toBeVisible();
  await page.unroute("**/api/v1/drafts/*");
  await page.getByRole("button", { name: "Drafts", exact: true }).click();
  await page.locator(".draft-row .row-main").click();
  await page.getByRole("tab", { name: "Markdown", exact: true }).click();
  await expect(message).toHaveValue("Draft typed while closing");
  expect(errors).toEqual([]);
  console.log(
    "Messaging browser flows, responsive layouts, keyboard tabs, approval, scheduling and recovery passed. Screenshots: " +
      temp,
  );
} finally {
  await browser?.close();
  if (server.exitCode === null && server.signalCode === null) {
    server.kill("SIGTERM");
    await new Promise((r) => server.once("exit", r));
  }
}
