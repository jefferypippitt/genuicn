/**
Per-game averages for the stats season. Each is null when the player didn't play in it.
*/
export interface PlayerAverages {
  points: number | null;
  assists: number | null;
  rebounds: number | null;
  steals: number | null;
}

/**
One player: who he is, and how he's averaging.
*/
export interface PlayerInfo extends PlayerAverages {
  /**
  ESPN's id for the player.
  */
  id: string;
  /**
  e.g. "LeBron James".
  */
  name: string;
  /**
  The jersey number as a string, so "00" keeps both zeros. Null before one is assigned.
  */
  jersey: string | null;
  /**
  e.g. "6' 9\"".
  */
  height: string | null;
  age: number | null;
  /**
  Seasons in the NBA before this one; 0 for a rookie.
  */
  experience: number;
  /**
  A cut-out photo, a PNG. Null when ESPN has none.
  */
  headshot: string | null;
}

/**
One NBA player this season.
*/
export interface PlayerData {
  player: PlayerInfo;
  /**
  The team he plays for now.
  */
  team: {
    /**
    e.g. "Philadelphia 76ers".
    */
    name: string;
    abbreviation: string;
  };
  /**
  This season, e.g. "2026-27".
  */
  season: string;
  /**
  The season the averages come from: this one once it has games, the one before until then.
  */
  statsSeason: string;
  /**
  Unix time in milliseconds the player was read.
  */
  asOf: number;
}

/**
"lebron  james " reads "lebron james". Null when nothing is left.
*/
export function normalizeName(name: string | null = ""): string | null {
  const trimmed = (name ?? "").trim().replaceAll(/\s+/gu, " ");
  return trimmed || null;
}

/**
The message of a thrown error, or the fallback when something else was thrown. Uses instanceof rather than Error.isError, which Node 22 and older browsers don't have.
*/
export function errorMessage(error: unknown, fallback: string): string {
  // eslint-disable-next-line unicorn/prefer-error-is-error -- Error.isError is missing on Node 22 and older browsers
  return error instanceof Error ? error.message : fallback;
}

/**
"R" for a rookie, else the seasons played, as a roster page writes it.
*/
export function formatExperience(years: number): string {
  return years === 0 ? "R" : String(years);
}

/**
An average to one decimal, or a dash when there is none.
*/
export function formatAverage(value: number | null): string {
  return value === null ? "–" : value.toFixed(1);
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizePlayer(data: PlayerData): string {
  const { player } = data;
  const who = `${player.name}, ${data.team.name}`;
  return player.points === null
    ? `${who}: no averages from ${data.statsSeason} yet.`
    : `${who}: ${formatAverage(player.points)} points, ${formatAverage(player.assists)} assists, ${formatAverage(player.rebounds)} rebounds and ${formatAverage(player.steals)} steals a game in ${data.statsSeason}.`;
}
