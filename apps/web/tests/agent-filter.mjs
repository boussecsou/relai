import { chromium, expect } from "@playwright/test";

const browser = await chromium.launch({
  executablePath: process.env.RELAI_CHROMIUM,
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage();
  await page.route("**/api/v1/**", async (route) => {
    const url = new URL(route.request().url());
    const endpoint = url.pathname.split("/").at(-1);
    let body = {};
    if (endpoint === "events") {
      await route.fulfill({
        contentType: "text/event-stream",
        body: ": connected\n\n",
      });
      return;
    }
    if (endpoint === "discovery")
      body = {
        scanning: false,
        indexing: false,
        sources: ["Codex", "Claude Code", "OpenCode"].map((tool) => ({ tool })),
        indexErrors: 0,
      };
    if (["labels", "drafts", "roots"].includes(endpoint)) body = [];
    if (endpoint === "preferences") body = { theme: "light", compact: false };
    if (endpoint === "mailbox")
      body = {
        items: [],
        total: url.searchParams.get("tool") ? 0 : 1,
        offset: 0,
        limit: 50,
        scope: url.searchParams.get("view") || "inbox",
      };
    await route.fulfill({ json: body });
  });
  await page.goto(process.env.RELAI_UI_URL || "http://127.0.0.1:4178");
  const filter = page.getByRole("combobox", { name: "Filter by agent" });
  for (const width of [390, 768, 1024, 1365, 1920]) {
    await page.setViewportSize({ width, height: 900 });
    for (const view of [
      "Inbox",
      "Drafts",
      "Scheduled",
      "Queued",
      "Sent",
      "Sessions",
      "Starred",
      "Archived",
    ]) {
      const menu = page.getByRole("button", {
        name: "Open navigation",
        exact: true,
      });
      if (
        (await menu.isVisible()) &&
        !(await page
          .getByRole("button", { name: "Inbox", exact: true })
          .isVisible())
      )
        await menu.click();
      if (["Starred", "Archived"].includes(view)) {
        const more = page.getByRole("button", { name: "More", exact: true });
        if ((await more.getAttribute("aria-expanded")) === "false")
          await more.click();
      }
      await page.getByRole("button", { name: view, exact: true }).click();
      for (const agent of ["Codex", "Claude Code", "OpenCode", "Pi"]) {
        await filter.selectOption(agent);
        await expect(page.locator(".list-heading h1")).toContainText("0");
        await expect(filter).toBeVisible();
        await filter.selectOption("");
        await expect(page.locator(".list-heading h1")).toContainText("1");
      }
    }
  }
  console.log(
    "Agent filter remains available with zero results; All restores the list.",
  );
} finally {
  await browser.close();
}
