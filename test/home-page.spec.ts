import { expect, test } from "@playwright/test";

test.describe("Home page (/)", () => {
  test("shows the gallery heading", async ({ page }) => {
    await page.goto("/");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Generative UI cards for your chatbot",
      })
    ).toBeVisible();
  });
});
