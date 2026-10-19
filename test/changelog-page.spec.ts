import { expect, test } from "@playwright/test";

test.describe("Changelog page (/changelog)", () => {
  test("lists each release by month", async ({ page }) => {
    await page.goto("/changelog");

    await expect(
      page.getByRole("heading", { level: 1, name: "Changelog" })
    ).toBeVisible();
    await expect(page.locator('time[datetime="2026-10"]')).toHaveText(
      "October 2026"
    );
    await expect(
      page.getByRole("link", { exact: true, name: "Area Chart" }).first()
    ).toBeVisible();
  });
});
