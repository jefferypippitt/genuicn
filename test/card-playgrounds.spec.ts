import { expect, test } from "@playwright/test";
import { expectReplayedPrompt } from "./helpers";

const CARD_PAGES = [
  { path: "/docs/quote", prompt: "How's NVDA doing?", title: "Quote" },
  {
    path: "/docs/weather",
    prompt: "What's the weather in New York?",
    title: "Weather",
  },
  { path: "/docs/crypto", prompt: "How's Bitcoin doing?", title: "Crypto" },
  {
    path: "/docs/flights",
    prompt: "Show my boarding pass for BA 117 on November 3, 2026.",
    title: "Flights",
  },
] as const;

test.describe("Card playgrounds", () => {
  for (const { path, prompt, title } of CARD_PAGES) {
    test(`${title} replays its first recorded chat`, async ({ page }) => {
      await page.goto(path);

      await expect(
        page.getByRole("heading", { level: 1, name: title })
      ).toBeVisible();
      await expectReplayedPrompt(page, prompt);
    });
  }
});
