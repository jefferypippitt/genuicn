import { listOf } from "@/features/chat/lookup";
import { loadPlayer } from "@/features/player/player-requests";
import { normalizeName } from "@/features/player/player-schema";
import type { CardLookup } from "@/features/chat/lookup";

function playersOf(properties: Record<string, unknown>) {
  const names = Array.isArray(properties.players) ? properties.players : [];
  return names.flatMap((name) => {
    const normalized = typeof name === "string" ? normalizeName(name) : null;
    return normalized ? [normalized] : [];
  });
}

export const playerLookup: CardLookup = {
  intent: (subjects) => `The averages for ${listOf(subjects)}`,
  load: async (properties) => {
    const players = playersOf(properties);
    if (players.length === 0) {
      throw new Error("Name an NBA player.");
    }
    return await Promise.all(players.map((player) => loadPlayer(player)));
  },
  sources: () => [
    {
      href: "https://www.espn.com/nba/players",
      label: "espn.com/nba/players",
    },
  ],
  subject: (properties) => {
    const players = playersOf(properties);
    return players.length > 0 ? listOf(players) : null;
  },
};
