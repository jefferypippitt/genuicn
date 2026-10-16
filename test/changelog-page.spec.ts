import { expect, test } from "@playwright/test";

test.describe("Changelog page (/changelog)", () => {
  test("lists each release by day", async ({ page }) => {
    await page.goto("/changelog");

    await expect(
      page.getByRole("heading", { level: 1, name: "Changelog" })
    ).toBeVisible();
    await expect(page.locator('time[datetime="2026-10-15"]')).toHaveText(
      "October 15, 2026"
    );
    await expect(
      page.getByText("Quote, Weather, and a gallery homepage")
    ).toBeVisible();
  });
});
