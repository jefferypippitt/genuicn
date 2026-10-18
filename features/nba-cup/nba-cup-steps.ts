import { listOf } from "@/features/chat/lookup";
import { loadCupGroup } from "@/features/nba-cup/nba-cup-requests";
import { cupGroupName, parseCupGroup } from "@/features/nba-cup/nba-cup-schema";
import type { CardLookup } from "@/features/chat/lookup";

function groupOf(properties: Record<string, unknown>) {
  return typeof properties.group === "string"
    ? parseCupGroup(properties.group)
    : null;
}

export const nbaCupLookup: CardLookup = {
  intent: (groups) => `The NBA Cup's ${listOf(groups)}`,
  load: async (properties) => {
    const group = groupOf(properties);
    if (!group) {
      throw new Error("Pick an NBA Cup group, e.g. west-a.");
    }
    return await loadCupGroup(group);
  },
  sources: () => [
    {
      href: "https://www.nba.com/cup/standings",
      label: "nba.com/cup/standings",
    },
  ],
  subject: (properties) => {
    const group = groupOf(properties);
    return group ? cupGroupName(group) : null;
  },
};
