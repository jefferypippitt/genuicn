import { expect } from "@playwright/test";
import type { Page } from "@playwright/test";

/**
The playground replays its first recorded chat on load. Wait for that prompt to show as the user's message.
*/
export async function expectReplayedPrompt(page: Page, prompt: string) {
  await expect(page.getByText(prompt, { exact: true }).first()).toBeVisible();
}
