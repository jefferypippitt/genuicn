import { expect, test } from "@playwright/test";
import { expectReplayedPrompt } from "./helpers";

const CARD_PAGES = [
  { path: "/docs/quote", prompt: "How's NVDA doing?", title: "Quote" },
  {
    path: "/docs/weather",
    prompt: "What's the weather in New York?",
    title: "Weather",
  },
  {
    path: "/docs/candlestick",
    prompt: "How did NVDA trade this month?",
    title: "Candlestick",
  },
  { path: "/docs/crypto", prompt: "How's Bitcoin doing?", title: "Crypto" },
  {
    path: "/docs/flights",
    prompt: "Show my boarding pass for BA 117 on November 3, 2026.",
    title: "Flights",
  },
  {
    path: "/docs/scoreboard",
    prompt: "What's the Lakers score?",
    title: "NBA scoreboard",
  },
  {
    path: "/docs/standings",
    prompt: "Show me the Western Conference standings.",
    title: "NBA standings",
  },
  {
    path: "/docs/nba-cup",
    prompt: "Show me NBA Cup West Group A.",
    title: "NBA Cup",
  },
  {
    path: "/docs/player",
    prompt: "How's LeBron James doing?",
    title: "NBA player",
  },
  {
    path: "/docs/win-probability",
    prompt: "Who's going to win the Knicks game on October 20?",
    title: "NBA win probability",
  },
  {
    path: "/docs/bar-chart",
    prompt: "Which countries have the largest economies?",
    title: "Bar Chart",
  },
  {
    path: "/docs/pie-chart",
    prompt: "What's the US electricity mix by source?",
    title: "Pie Chart",
  },
  {
    path: "/docs/radar-chart",
    prompt: "Compare the nutrition of an apple and a banana",
    title: "Radar Chart",
  },
  {
    path: "/docs/radial-chart",
    prompt: "How full are California's major reservoirs?",
    title: "Radial Chart",
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
