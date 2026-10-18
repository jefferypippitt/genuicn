import { listOf } from "@/features/chat/lookup";
import { loadScoreboard } from "@/features/scoreboard/scoreboard-requests";
import { normalizeTeam } from "@/features/scoreboard/scoreboard-schema";
import type { CardLookup } from "@/features/chat/lookup";

function propertiesOf(properties: Record<string, unknown>) {
  return {
    date: typeof properties.date === "string" ? properties.date : null,
    team: typeof properties.team === "string" ? properties.team : "",
  };
}

export const scoreboardLookup: CardLookup = {
  intent: (teams) =>
    teams.length === 1
      ? `The score of the ${teams[0]} game`
      : `Scores for the ${listOf(teams)}`,
  load: (properties) => loadScoreboard(propertiesOf(properties)),
  sources: () => [
    {
      href: "https://www.espn.com/nba/scoreboard",
      label: "espn.com/nba/scoreboard",
    },
  ],
  subject: (properties) => normalizeTeam(propertiesOf(properties).team),
};
