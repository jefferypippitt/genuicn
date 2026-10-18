/**
The NBA Cup's six groups of five, three per conference.
*/
export const CUP_GROUPS = [
  "east-a",
  "east-b",
  "east-c",
  "west-a",
  "west-b",
  "west-c",
] as const;

export type CupGroup = (typeof CUP_GROUPS)[number];

/**
"west-a" reads "West Group A", as the NBA writes it.
*/
export function cupGroupName(group: CupGroup): string {
  const [conference, letter] = group.split("-", 2);
  return `${conference.charAt(0).toUpperCase()}${conference.slice(1)} Group ${letter.toUpperCase()}`;
}

/**
The words a group's name can carry beyond its conference and letter, and everything that isn't a letter.
*/
const FILLER = /\b(?:the|conference|group)\b|ern\b|[^a-z]/gu;

/**
"west-a", "West Group A" and "Western Conference Group A" all read "west-a". Null when it names no group.
*/
export function parseCupGroup(value: string): CupGroup | null {
  const compact = value.toLowerCase().replaceAll(FILLER, "");
  return CUP_GROUPS.find((group) => group.replace("-", "") === compact) ?? null;
}

/**
One team's row in a group.
*/
export interface CupTeam {
  /**
  Its place in the group, 1 first.
  */
  rank: number;
  /**
  e.g. "Mavericks".
  */
  name: string;
  /**
  e.g. "DAL".
  */
  abbreviation: string;
  /**
  The team's logo for a light background, a square PNG.
  */
  logo: string;
  /**
  The same logo drawn for a dark background.
  */
  logoDark: string;
  wins: number;
  losses: number;
  /**
  Points scored and allowed in the group's games, and the difference.
  */
  pointsFor: number;
  pointsAgainst: number;
  difference: number;
}

/**
One NBA Cup group's table.
*/
export interface CupGroupData {
  group: CupGroup;
  /**
  e.g. "2026-27".
  */
  season: string;
  teams: CupTeam[];
  /**
  Unix time in milliseconds the table was read.
  */
  asOf: number;
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
export function summarizeCupGroup(data: CupGroupData): string {
  const name = `NBA Cup ${cupGroupName(data.group)}, ${data.season}`;
  const [leader] = data.teams;
  const lead = leader
    ? `: the ${leader.name} lead at ${leader.wins}-${leader.losses}`
    : "";
  return `${name}${lead}.`;
}
