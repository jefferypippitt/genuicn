import { listOf } from "@/features/chat/lookup";
import { loadStandings } from "@/features/standings/standings-requests";
import {
  CONFERENCE_NAMES,
  parseConference,
} from "@/features/standings/standings-schema";
import type { CardLookup } from "@/features/chat/lookup";

function conferenceOf(properties: Record<string, unknown>) {
  return typeof properties.conference === "string"
    ? parseConference(properties.conference)
    : null;
}

export const standingsLookup: CardLookup = {
  intent: (conferences) => `The ${listOf(conferences)} standings`,
  load: async (properties) => {
    const conference = conferenceOf(properties);
    if (!conference) {
      throw new Error("Pick a conference: east or west.");
    }
    return await loadStandings(conference);
  },
  sources: () => [
    {
      href: "https://www.espn.com/nba/standings",
      label: "espn.com/nba/standings",
    },
  ],
  subject: (properties) => {
    const conference = conferenceOf(properties);
    return conference ? CONFERENCE_NAMES[conference] : null;
  },
};
