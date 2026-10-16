import { expect, test } from "@playwright/test";

test.describe("Docs navigation", () => {
  test("next and previous walk the sidebar order", async ({ page }) => {
    await page.goto("/docs");
    await expect(
      page.getByRole("heading", { level: 1, name: "Introduction" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Next: Installation" }).click();
    await expect(page).toHaveURL("/docs/installation");
    await expect(
      page.getByRole("heading", { level: 1, name: "Installation" })
    ).toBeVisible();

    await page.getByRole("link", { name: "Previous: Introduction" }).click();
    await expect(page).toHaveURL("/docs");
  });

  test("the first page has no previous page", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("button", { name: "No previous page" })
    ).toBeDisabled();
  });
});
