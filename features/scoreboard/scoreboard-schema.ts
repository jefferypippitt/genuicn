/**
Where the game is: not started, being played, or over.
*/
export type GameState = "pre" | "in" | "post";

export interface ScoreboardTeam {
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
  /**
  Null before the game starts.
  */
  score: number | null;
  /**
  The season record, e.g. "4-1". Null when ESPN doesn't give one.
  */
  record: string | null;
  isWinner: boolean;
  /**
  Points in each period played so far, first quarter first, overtimes after the fourth. Empty before the game; a game in progress counts its current quarter so far.
  */
  periods: number[];
}

/**
Where a playoff series stands, as of this game: before it starts, the wins so far; once it ends, the wins counting it.
*/
export interface ScoreboardSeries {
  /**
  Most games the series can last, e.g. 7.
  */
  length: number;
  awayWins: number;
  homeWins: number;
  /**
  As ESPN writes it: "NY leads series 3-1", "NY wins series 4-1".
  */
  summary: string;
  /**
  True once a team has won the series.
  */
  isComplete: boolean;
  /**
  True for the NBA Finals.
  */
  isFinals: boolean;
  /**
  Which game of the series this is, e.g. 4. Null when ESPN doesn't say.
  */
  game: number | null;
}

/**
One NBA game.
*/
export interface ScoreboardData {
  state: GameState;
  /**
  How the game stands, as ESPN writes it: "8:12 - 3rd", "Final/OT", "10/17 - 7:00 PM EDT".
  */
  status: string;
  /**
  Unix time in milliseconds of the start.
  */
  startsAt: number;
  away: ScoreboardTeam;
  home: ScoreboardTeam;
  venue: string | null;
  /**
  Which part of the season the game belongs to, or what makes it special: "Preseason", "Play-In", "NBA Cup Championship", "NBA Finals - Game 4". Null for an ordinary regular-season game.
  */
  stage: string | null;
  /**
  The playoff series this game is part of. Null outside the playoffs.
  */
  series: ScoreboardSeries | null;
  /**
  The TV channel or stream, e.g. "ESPN".
  */
  broadcast: string | null;
  /**
  Unix time in milliseconds the score was read.
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

const REGULATION_QUARTERS = 4;

/**
The line score's column heads for the periods played: "1" to "4", then "OT", "2OT" and on.
*/
export function periodLabels(count: number): string[] {
  return Array.from({ length: count }, (_, index) => {
    const overtime = index + 1 - REGULATION_QUARTERS;
    if (overtime <= 0) {
      return String(index + 1);
    }
    return overtime === 1 ? "OT" : `${overtime}OT`;
  });
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
The game's day next to when the score was read, the way a scoreboard says it: "Today", "Yesterday", "Tomorrow", else "Sat, Oct 17". Uses US Eastern days, ESPN's own, so the server and the browser agree.
*/
export function gameDayLabel(data: ScoreboardData): string {
  const days = Math.round(
    (easternDay(data.startsAt) - easternDay(data.asOf)) / DAY_MS
  );
  if (days === 0) {
    return "Today";
  }
  if (days === -1) {
    return "Yesterday";
  }
  if (days === 1) {
    return "Tomorrow";
  }
  const start = new Date(data.startsAt);
  return start.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    timeZone: "America/New_York",
    weekday: "short",
  });
}

/**
One sentence the model (or a screen reader) can use to describe the card.
*/
export function summarizeScoreboard(data: ScoreboardData): string {
  const { away, home } = data;
  const matchup = `${away.name} at ${home.name}`;
  if (data.state === "pre") {
    return `${matchup}, ${data.status}.`;
  }
  const score = `${away.shortName} ${away.score ?? 0}, ${home.shortName} ${home.score ?? 0}`;
  return data.state === "post"
    ? `${matchup}: ${data.status}, ${score}.`
    : `${matchup}, live (${data.status}): ${score}.`;
}
