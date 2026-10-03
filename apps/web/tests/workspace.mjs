import { chromium, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { spawn } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

// All rendered content is synthetic. Screenshots are safe to publish.
const temp = await mkdtemp(join(tmpdir(), "relai-workspace-"));
const repo = resolve(import.meta.dirname, "../../..");
const base = process.env.RELAI_UI_URL || "http://127.0.0.1:4191";
const server = process.env.RELAI_UI_URL
  ? null
  : spawn(join(repo, "target/debug/relai"), {
      cwd: repo,
      env: {
        ...process.env,
        RELAI_PORT: "4191",
        RELAI_DATA_DIR: join(temp, "data"),
        RELAI_DISCOVERY_ISOLATED: "1",
        RELAI_SESSION_ROOTS: "[]",
      },
      stdio: "ignore",
    });
const sessions = [
  [
    "checkout",
    "Simplify the checkout flow",
    "Codex",
    "commerce/storefront",
    "feat/checkout",
    "The checkout now has one clear path. Ready for your review.",
  ],
  [
    "design",
    "Build a consistent component library",
    "Claude Code",
    "studio/design-system",
    "feat/components",
    "Button, input and dialog states are aligned with the new tokens.",
  ],
  [
    "api",
    "Investigate the slow API response",
    "OpenCode",
    "platform/api",
    "fix/query-plan",
    "Found an unnecessary join. The query plan is attached to the conversation.",
  ],
  [
    "docs",
    "Write the onboarding guide",
    "Pi",
    "studio/docs",
    "docs/onboarding",
    "The first draft covers setup, a first session, and recovery.",
  ],
].map(([id, title, tool, cwd, branch, preview], i) => ({
  id,
  nativeId: id,
  title,
  tool,
  cwd: "/projects/" + cwd,
  branch,
  preview,
  modified: Date.UTC(2026, 9, 2, 14, 30 - i * 15),
  parentId: "",
  archivedNative: false,
  sourceAvailable: true,
  state: "completed",
  managed: false,
  annotations: {
    labels: i === 0 ? ["product"] : [],
    starred: i === 0,
    archived: false,
    unread: i < 2,
    ticket: "",
  },
}));
let browser;
try {
  for (let n = 0; n < 100; n++) {
    try {
      if ((await fetch(base)).ok) break;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  browser = await chromium.launch({
    executablePath: process.env.RELAI_CHROMIUM,
    args: ["--no-sandbox"],
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  // A stable event channel makes this a deterministic view test; real SSE is
  // exercised by the passive, delivery and messaging integration suites.
  await context.addInitScript(() => {
    window.EventSource = class {
      constructor() {
        setTimeout(() => this.onopen?.(), 0);
      }
      close() {}
      addEventListener() {}
      removeEventListener() {}
    };
  });
  let theme = "light";
  await context.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split("/").at(-1);
    let data = {};
    if (endpoint === "preferences") {
      if (route.request().method() === "PUT")
        theme = route.request().postDataJSON().theme;
      data = { theme, compact: false };
    }
    if (endpoint === "discovery")
      data = {
        scanning: false,
        indexing: false,
        indexErrors: 0,
        sources: sessions.map((s) => ({
          tool: s.tool,
          root: "/fixtures/" + s.tool,
          installed: true,
          status: "ok",
          count: 1,
          errors: 0,
          detail: "",
        })),
      };
    if (endpoint === "labels")
      data = [
        { id: "product", name: "Product", color: "teal" },
        { id: "engineering", name: "Engineering", color: "lavender" },
      ];
    if (["drafts", "roots"].includes(endpoint)) data = [];
    if (endpoint === "mailbox") {
      const scope = url.searchParams.get("view") || "inbox";
      let items = ["inbox", "sessions", "starred"].includes(scope)
        ? sessions
        : [];
      if (scope === "starred")
        items = items.filter((s) => s.annotations.starred);
      if (url.searchParams.get("q"))
        items = items.filter((s) =>
          s.title
            .toLowerCase()
            .includes(url.searchParams.get("q").toLowerCase()),
        );
      if (url.searchParams.get("tool"))
        items = items.filter((s) => s.tool === url.searchParams.get("tool"));
      if (url.searchParams.get("label"))
        items = items.filter((s) =>
          s.annotations.labels.includes(url.searchParams.get("label")),
        );
      data = {
        items: items.map((session) => ({
          kind: "session",
          session,
          id: session.id,
          modified: session.modified,
          preview: session.preview,
        })),
        total: items.length,
        limit: 100,
        offset: 0,
        scope,
        triageCounts: { all: 4, attention: 0, replies: 4 },
      };
    }
    if (endpoint === "messages")
      data = {
        before: 0,
        items: [
          {
            id: "m1",
            role: "user",
            text: "Simplify the checkout into a single, accessible flow. Keep the order summary visible and make errors easy to recover from.",
            time: sessions[0].modified - 60000,
            activity: false,
          },
          {
            id: "m2",
            role: "assistant",
            text: "## Ready for review\n\nThe checkout now has one clear path from cart to confirmation.\n\n- **One page** for contact, shipping and payment\n- An order summary that stays visible\n- Inline validation that preserves the entered details\n- Keyboard navigation through every step\n\n### Verification\n\nAll 18 checkout tests pass, including the mobile flow and payment recovery.\n\n```tsx\n<CheckoutLayout>\n  <CheckoutForm />\n  <OrderSummary />\n</CheckoutLayout>\n```\n\nThe changes are ready in `feat/checkout`.",
            time: sessions[0].modified,
            activity: false,
          },
        ],
      };
    if (endpoint === "activity")
      data = {
        items: [],
        deliveries: [],
        requests: [],
        truncated: false,
        historyVersion: 0,
      };
    await route.fulfill({ json: data });
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  async function audit(name) {
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations.map((v) => ({
        rule: v.id,
        nodes: v.nodes.map((n) => n.target),
      })),
      name,
    ).toEqual([]);
  }
  await page.goto(base);
  await expect(page.locator(".session-row")).toHaveCount(4);
  await page.screenshot({ path: join(temp, "inbox-light.png") });
  await audit("light inbox");
  await page
    .getByRole("button", { name: "Open commands", exact: true })
    .click();
  await expect(
    page.getByRole("combobox", { name: "Find a command" }),
  ).toBeFocused();
  await audit("command palette");
  await page.screenshot({ path: join(temp, "commands.png") });
  await page
    .getByRole("combobox", { name: "Find a command" })
    .fill("scheduled");
  await page.keyboard.press("Enter");
  await expect(page.locator(".list-heading h1")).toContainText("Scheduled");
  await expect(page).toHaveURL(/view=scheduled/);
  await page.reload();
  await expect(page.locator(".list-heading h1")).toContainText("Scheduled");
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  await page.goBack();
  await expect(page.locator(".list-heading h1")).toContainText("Scheduled");
  await page.getByRole("button", { name: "Sessions", exact: true }).click();
  const search = page.getByRole("textbox", {
    name: "Search mailboxes and sessions",
  });
  await search.fill("no-match");
  await expect(page.getByRole("heading", { name: "No results" })).toBeVisible();
  await page
    .locator(".workspace-empty")
    .getByRole("button", { name: "Clear filters" })
    .click();
  await expect(page.locator(".session-row")).toHaveCount(4);
  await page
    .getByRole("combobox", { name: "Filter by agent" })
    .selectOption("Codex");
  await expect(page).toHaveURL(/agent=Codex/);
  await page.reload();
  await expect(page.locator(".session-row")).toHaveCount(1);
  await page
    .getByRole("combobox", { name: "Filter by agent" })
    .selectOption("");
  await page.locator(".session-row .row-main").first().click();
  await expect(
    page.getByRole("heading", { name: "Ready for review" }),
  ).toBeVisible();
  await expect(page.locator(".reading-list")).toBeVisible();
  await page.screenshot({ path: join(temp, "reader-light.png") });
  await audit("split reader");
  await page
    .getByRole("button", { name: "Focus conversation", exact: true })
    .click();
  await expect(page.locator(".reading-list")).toBeHidden();
  await page
    .getByRole("button", { name: "Show conversation list", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Back to Sessions", exact: true })
    .click();
  await page.getByRole("button", { name: "Dark theme", exact: true }).click();
  await page.screenshot({ path: join(temp, "inbox-dark.png") });
  await audit("dark inbox");
  for (const width of [320, 390, 768, 1024, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      `reflow at ${width}`,
    ).toBe(true);
    if (width <= 390) {
      await expect(
        page.getByRole("button", { name: "Sessions", exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await expect(
        page.getByRole("dialog", { name: "Workspace navigation" }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(
        page.getByRole("button", { name: "Open navigation", exact: true }),
      ).toBeFocused();
      await page
        .getByRole("button", { name: "Open navigation", exact: true })
        .click();
      await page
        .getByRole("dialog", { name: "Workspace navigation" })
        .getByRole("button", { name: "Close navigation", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Open navigation", exact: true }),
      ).toBeFocused();
      await page.screenshot({ path: join(temp, `mobile-${width}.png`) });
      if (width === 390) await audit("mobile inbox");
    }
  }
  const recovery = await context.newPage();
  let failBootstrap = true;
  await recovery.route("**/api/v1/bootstrap", async (route) => {
    if (failBootstrap) {
      failBootstrap = false;
      await route.fulfill({
        status: 503,
        json: { error: "Service temporarily unavailable" },
      });
    } else await route.fallback();
  });
  await recovery.goto(base);
  await expect(recovery.getByRole("alert")).toContainText(
    "Service temporarily unavailable",
  );
  await recovery.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(recovery.locator(".session-row")).toHaveCount(4);
  await recovery.close();
  expect(errors).toEqual([]);
  console.log(
    "Workspace: commands, keyboard focus, browser history, persistent filters, split reader, two themes, 320–1920px reflow and axe scans passed.",
  );
  console.log("Synthetic screenshots: " + temp);
} finally {
  await browser?.close();
  server?.kill("SIGTERM");
}
