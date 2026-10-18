import { listOf } from "@/features/chat/lookup";
import { loadWinProbability } from "@/features/win-probability/win-probability-requests";
import { normalizeTeam } from "@/features/win-probability/win-probability-schema";
import type { CardLookup } from "@/features/chat/lookup";

function propertiesOf(properties: Record<string, unknown>) {
  return {
    date: typeof properties.date === "string" ? properties.date : null,
    team: typeof properties.team === "string" ? properties.team : "",
  };
}

export const winProbabilityLookup: CardLookup = {
  intent: (teams) =>
    teams.length === 1
      ? `The ${teams[0]} game's win probability`
      : `Win probability for the ${listOf(teams)} games`,
  load: (properties) => loadWinProbability(propertiesOf(properties)),
  sources: () => [
    {
      href: "https://www.espn.com/nba/scoreboard",
      label: "espn.com/nba/scoreboard",
    },
  ],
  subject: (properties) => normalizeTeam(propertiesOf(properties).team),
};
