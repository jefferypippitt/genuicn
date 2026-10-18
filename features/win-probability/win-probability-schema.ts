/**
Where the game is: not started, being played, or over.
*/
export type GameState = "pre" | "in" | "post";

/**
One team's side of the game.
*/
export interface WinProbabilityTeam {
  /**
  e.g. "New York Knicks".
  */
  name: string;
  /**
  e.g. "NY".
  */
  abbreviation: string;
  /**
  The team's logo, a square PNG, and the one drawn for dark backgrounds. Null when ESPN has none.
  */
  logo: string | null;
  logoDark: string | null;
  /**
  The color its bar and percent are drawn in, as "#rrggbb". The away team takes its second color when both teams share one.
  */
  color: string;
  /**
  Its chance of winning, 0 to 100.
  */
  probability: number;
}

/**
Each team's chance of winning one NBA game.
*/
export interface WinProbabilityData {
  state: GameState;
  /**
  Unix time in milliseconds of the start.
  */
  startsAt: number;
  /**
  e.g. "2026-27".
  */
  season: string;
  /**
  Away team first, then home, as a matchup is written.
  */
  teams: [WinProbabilityTeam, WinProbabilityTeam];
  /**
  Unix time in milliseconds the chances were read.
  */
  asOf: number;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/u;

/**
True for a real calendar day written as YYYY-MM-DD.
*/
export function isGameDate(date: string): boolean {
  if (!ISO_DATE.test(date)) {
    return false;
  }
  const parsed = new Date(`${date}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(date)
  );
}

/**
"lakers" and " Lakers " both read "Lakers". Null when nothing is left.
*/
export function normalizeTeam(team: string): string | null {
  const trimmed = team.trim().replaceAll(/\s+/gu, " ");
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
A chance as a whole percent: "53%".
*/
export function formatPercent(probability: number): string {
  return `${Math.round(probability)}%`;
}

/**
What a win pays back for each unit, read from the chance: 53% pays 1.9x. A dash when the chance is 0, since nothing pays back.
*/
export function formatMultiplier(probability: number): string {
  return probability > 0 ? `${(100 / probability).toFixed(1)}x` : "–";
}

const EASTERN_DAY = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/New_York",
  year: "numeric",
});

const DAY_MS = 86_400_000;

function easternDay(time: number) {
  return Date.parse(`${EASTERN_DAY.format(time)}T00:00:00Z`);
}

/**
The game's day next to when the chances were read, the way a scoreboard says it: "Today", "Yesterday", "Tomorrow", else "Tue, Oct 20". Uses US Eastern days, ESPN's own, so the server and the browser agree.
*/
export function gameDayLabel(data: WinProbabilityData): string {
  const days = Math.round(
    (easternDay(data.startsAt) - easternDay(data.asOf)) / DAY_MS
  );
  const relative: Record<number, string> = {
    [-1]: "Yesterday",
    0: "Today",
    1: "Tomorrow",
  };
  const start = new Date(data.startsAt);
  return (
    relative[days] ??
    start.toLocaleDateString("en-US", {
      day: "numeric",
      month: "short",
      timeZone: "America/New_York",
      weekday: "short",
    })
  );
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeWinProbability(data: WinProbabilityData): string {
  const [away, home] = data.teams;
  const chances = `${away.name} ${formatPercent(away.probability)}, ${home.name} ${formatPercent(home.probability)}`;
  if (data.state === "post") {
    return `${away.name} at ${home.name}, final: ${chances}.`;
  }
  return data.state === "in"
    ? `${away.name} at ${home.name}, live chance of winning: ${chances}.`
    : `${away.name} at ${home.name}, chance of winning before the game: ${chances}.`;
}
