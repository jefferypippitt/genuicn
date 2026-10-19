import "server-only";
import { findGame } from "@/features/scoreboard/scoreboard-queries";
import type {
  EspnCompetitor,
  EspnEvent,
} from "@/features/scoreboard/scoreboard-queries";
import type {
  WinProbabilityData,
  WinProbabilityTeam,
} from "@/features/win-probability/win-probability-schema";

// Server only: ESPN's site API doesn't allow browser requests (CORS).

const SUMMARY =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/summary";

const TIMEOUT_MS = 8000;
const NOT_FOUND = 404;
const PERCENT = 100;

/**
A game with no chances to show yet: ESPN hasn't predicted it.
*/
export class WinProbabilityNotFoundError extends Error {
  readonly status = NOT_FOUND;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "WinProbabilityNotFoundError";
  }
}

interface EspnSummary {
  /**
  ESPN's Matchup Predictor, before the game: each side's chance as a string percent, "53.1".
  */
  predictor?: {
    homeTeam?: { gameProjection?: string };
    awayTeam?: { gameProjection?: string };
  };
  /**
  The home team's chance after each play, 0 to 1, oldest first. Empty before the game.
  */
  winprobability?: { homeWinPercentage: number }[];
}

function hex(color: string | undefined) {
  return color && /^[\da-f]{6}$/iu.test(color)
    ? `#${color.toLowerCase()}`
    : null;
}

function channels(color: string) {
  const value = Number.parseInt(color.slice(1), 16);
  // eslint-disable-next-line no-bitwise -- unpacks the three 8-bit channels of a hex color
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function distance(first: string, second: string) {
  const [r1, g1, b1] = channels(first);
  const [r2, g2, b2] = channels(second);
  return Math.hypot(r1 - r2, g1 - g2, b1 - b2);
}

const CLASH_DISTANCE = 60;
const WHITE = "#ffffff";
const BLACK = "#000000";
const EDGE_DISTANCE = 60;
const NEUTRAL = "#71717a";

function colorsOf(away: EspnCompetitor, home: EspnCompetitor) {
  const homeColor = hex(home.team.color) ?? NEUTRAL;
  const awayColor = hex(away.team.color) ?? NEUTRAL;
  const awayAlternate = hex(away.team.alternateColor);
  const isClash = distance(awayColor, homeColor) < CLASH_DISTANCE;
  const isUsable =
    awayAlternate !== null &&
    distance(awayAlternate, homeColor) >= CLASH_DISTANCE &&
    distance(awayAlternate, WHITE) >= EDGE_DISTANCE &&
    distance(awayAlternate, BLACK) >= EDGE_DISTANCE;
  return [isClash && isUsable ? awayAlternate : awayColor, homeColor] as const;
}

function homeChance(
  event: EspnEvent,
  summary: EspnSummary,
  home: EspnCompetitor
) {
  const { state } = event.status.type;
  if (state === "post") {
    return home.winner ? PERCENT : 0;
  }
  const latest = summary.winprobability?.at(-1)?.homeWinPercentage;
  if (state === "in" && typeof latest === "number") {
    return latest * PERCENT;
  }
  const predicted = Number(summary.predictor?.homeTeam?.gameProjection);
  if (
    Number.isNaN(predicted) ||
    summary.predictor?.homeTeam?.gameProjection === undefined
  ) {
    throw new WinProbabilityNotFoundError(
      "ESPN hasn't predicted this game yet."
    );
  }
  return predicted;
}

/**
"2027" reads "2026-27": ESPN names a season by the year it ends.
*/
function seasonName(year: number | undefined, startsAt: number) {
  const start = new Date(startsAt);
  const end = year ?? start.getUTCFullYear();
  return `${end - 1}-${String(end % PERCENT).padStart(2, "0")}`;
}

function teamOf(
  competitor: EspnCompetitor,
  color: string,
  probability: number
): WinProbabilityTeam {
  return {
    abbreviation: competitor.team.abbreviation,
    color,
    logo: competitor.team.logo ?? null,
    logoDark: competitor.team.logoDark ?? null,
    name: competitor.team.displayName,
    probability,
  };
}

/**
Each team's chance of winning one NBA team's game: with a date (YYYY-MM-DD), the game that day; without one, today's game, or the closest one to now.
*/
export async function getWinProbability(
  query: string,
  date?: string
): Promise<WinProbabilityData> {
  const event = await findGame(query, date);
  const competitors = event.competitions[0]?.competitors ?? [];
  const away = competitors.find((side) => side.homeAway === "away");
  const home = competitors.find((side) => side.homeAway === "home");
  if (!(away && home)) {
    throw new Error("The scores service sent a game without two teams.");
  }
  const response = await fetch(`${SUMMARY}?event=${event.id}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`The scores service returned ${response.status}.`);
  }
  const summary = (await response.json()) as EspnSummary;
  const home100 = homeChance(event, summary, home);
  const [awayColor, homeColor] = colorsOf(away, home);
  const startsAt = Date.parse(event.date);
  return {
    asOf: Date.now(),
    season: seasonName(event.season?.year, startsAt),
    startsAt,
    state: event.status.type.state,
    teams: [
      teamOf(away, awayColor, PERCENT - home100),
      teamOf(home, homeColor, home100),
    ],
  };
}
