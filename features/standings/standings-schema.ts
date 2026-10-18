/**
The NBA's two conferences.
*/
export const CONFERENCES = ["east", "west"] as const;

export type Conference = (typeof CONFERENCES)[number];

export const CONFERENCE_NAMES: Record<Conference, string> = {
  east: "Eastern Conference",
  west: "Western Conference",
};

/**
One team's row in the table.
*/
export interface StandingsTeam {
  /**
  Its place in the conference, 1 first.
  */
  rank: number;
  /**
  e.g. "Los Angeles Lakers".
  */
  name: string;
  /**
  e.g. "Lakers".
  */
  shortName: string;
  /**
  e.g. "LAL".
  */
  abbreviation: string;
  /**
  The team's logo, a square PNG. Null when ESPN has none for it.
  */
  logo: string | null;
  /**
  The same logo drawn for a dark background. Null when ESPN has none.
  */
  logoDark: string | null;
  wins: number;
  losses: number;
  /**
  As a scoreboard writes it: ".646".
  */
  winPercent: string;
  /**
  Games behind the conference leader: "11", "2.5", or "-" for the leader.
  */
  gamesBehind: string;
  /**
  Records as "W-L": against the conference, at home, away, and over the last ten games.
  */
  conference: string;
  home: string;
  away: string;
  lastTen: string;
  /**
  e.g. "W3", "L1", or "-" before the first game.
  */
  streak: string;
}

/**
One conference's standings.
*/
export interface StandingsData {
  conference: Conference;
  /**
  e.g. "2026-27".
  */
  season: string;
  teams: StandingsTeam[];
  /**
  Unix time in milliseconds the standings were read.
  */
  asOf: number;
}

/**
"west", "West", "Western Conference" and "western" all read "west". Null when it names neither conference.
*/
export function parseConference(value: string): Conference | null {
  const text = value.trim().toLowerCase();
  return CONFERENCES.find((conference) => text.startsWith(conference)) ?? null;
}

/**
The message of a thrown error, or the fallback when something else was thrown. Uses instanceof rather than Error.isError, which Node 22 and older browsers don't have.
*/
export function errorMessage(error: unknown, fallback: string): string {
  // eslint-disable-next-line unicorn/prefer-error-is-error -- Error.isError is missing on Node 22 and older browsers
  return error instanceof Error ? error.message : fallback;
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeStandings(data: StandingsData): string {
  const name = CONFERENCE_NAMES[data.conference];
  const [leader] = data.teams;
  const lead = leader
    ? `: the ${leader.name} lead at ${leader.wins}-${leader.losses}`
    : "";
  return `${name} standings, ${data.season}${lead}.`;
}
