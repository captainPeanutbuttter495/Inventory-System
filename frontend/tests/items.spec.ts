import { test, expect } from "@playwright/test";

test("home page shows the Inventory heading", async ({ page }) => {
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Inventory" }),
  ).toBeVisible();
});

test("adding an item persists across a reload", async ({ page }) => {
  // The E2E hits the REAL shared Postgres (no test-DB isolation like Django's
  // test runner gives), so every run leaves rows behind. A unique name keeps
  // assertions reliable across reruns.
  const name = `e2e-widget-${Date.now()}`;

  await page.goto("/");

  await page.getByTestId("item-input").fill(name);
  await page.getByTestId("add-btn").click();

  // Appears in the list — this round-trips browser -> Django -> Postgres.
  await expect(page.getByTestId("item-list")).toContainText(name);

  // The real proof it persisted server-side (not just in React state):
  // reload the page and it's still there.
  await page.reload();
  await expect(page.getByTestId("item-list")).toContainText(name);
});
