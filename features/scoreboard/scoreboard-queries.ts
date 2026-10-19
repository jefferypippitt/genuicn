import "server-only";
import type {
  GameState,
  ScoreboardData,
  ScoreboardSeries,
  ScoreboardTeam,
} from "@/features/scoreboard/scoreboard-schema";

// Server only: ESPN's site API doesn't allow browser requests (CORS).

const NBA = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";

export interface EspnTeam {
  id: string;
  abbreviation: string;
  displayName: string;
  shortDisplayName: string;
  name?: string;
  nickname?: string;
  location?: string;
  logo?: string;
  logoDark?: string;
  /**
  The team's colors as hex without the #, e.g. "1d428a".
  */
  color?: string;
  alternateColor?: string;
}

interface EspnTeams {
  sports: { leagues: { teams: { team: EspnTeam }[] }[] }[];
}

export interface EspnStatus {
  type: { state: GameState; shortDetail: string };
}

export interface EspnCompetitor {
  homeAway: "home" | "away";
  score?: string;
  winner?: boolean;
  records?: { type?: string; summary: string }[];
  linescores?: { value: number }[];
  team: EspnTeam;
}

export interface EspnEvent {
  id: string;
  date: string;
  status: EspnStatus;
  season?: { slug?: string; year?: number };
  competitions: {
    notes?: { headline?: string }[];
    series?: {
      type?: string;
      summary?: string;
      completed?: boolean;
      totalCompetitions?: number;
      competitors?: { id: string; wins?: number }[];
    };
    venue?: { fullName?: string };
    broadcast?: string;
    broadcasts?: { names?: string[] }[];
    competitors: EspnCompetitor[];
  }[];
}

interface EspnScoreboard {
  events?: EspnEvent[];
}

interface EspnSchedule {
  events?: {
    id: string;
    date: string;
    competitions: { status: EspnStatus }[];
  }[];
}

const NOT_FOUND = 404;

/**
A lookup that found no team, or no game for it.
*/
export class ScoreboardNotFoundError extends Error {
  readonly status = NOT_FOUND;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "ScoreboardNotFoundError";
  }
}

const TIMEOUT_MS = 8000;
const TEAMS_FRESH_MS = 86_400_000;
const RECENT_MS = 36 * 3_600_000;
const NOT_LETTERS = /[^\da-z]+/gu;

async function espn<T>(path: string): Promise<T> {
  const response = await fetch(`${NBA}/${path}`, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`The scores service returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

const teamList: {
  current: { expiresAt: number; teams: Promise<EspnTeam[]> } | null;
} = { current: null };

async function fetchTeams() {
  let body: EspnTeams;
  try {
    body = await espn<EspnTeams>("teams");
  } catch (error) {
    teamList.current = null;
    throw error;
  }
  return body.sports[0]?.leagues[0]?.teams.map(({ team }) => team) ?? [];
}

function nbaTeams() {
  const hit = teamList.current;
  if (hit && Date.now() < hit.expiresAt) {
    return hit.teams;
  }
  const teams = fetchTeams();
  teamList.current = { expiresAt: Date.now() + TEAMS_FRESH_MS, teams };
  return teams;
}

function simplify(text = "") {
  return text.toLowerCase().replaceAll(NOT_LETTERS, " ").trim();
}

async function findTeam(query: string) {
  const wanted = simplify(query);
  const teams = await nbaTeams();
  const names = (team: EspnTeam) =>
    [
      team.abbreviation,
      team.displayName,
      team.shortDisplayName,
      team.name,
      team.nickname,
      team.location,
    ].map(simplify);
  const team =
    teams.find((candidate) => names(candidate).includes(wanted)) ??
    teams.find((candidate) =>
      simplify(candidate.displayName).includes(wanted)
    ) ??
    teams.find((candidate) => {
      const nickname = simplify(candidate.name ?? candidate.shortDisplayName);
      return nickname !== "" && wanted.includes(nickname);
    });
  if (!team) {
    throw new ScoreboardNotFoundError(`No NBA team called "${query}".`);
  }
  return team;
}

const EASTERN_DAY = new Intl.DateTimeFormat("en-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "America/New_York",
  year: "numeric",
});

/**
The scoreboard day a game falls on. ESPN files games by the US Eastern date, so a 10:30 PM Pacific start is still that day's game.
*/
function scoreboardDay(time: number) {
  return EASTERN_DAY.format(time).replaceAll("-", "");
}

function teamOf(competitor: EspnCompetitor, state: GameState): ScoreboardTeam {
  const { team } = competitor;
  const score = Math.trunc(Number(competitor.score ?? NaN));
  return {
    abbreviation: team.abbreviation,
    isWinner: competitor.winner === true,
    logo: team.logo ?? null,
    logoDark: team.logoDark ?? null,
    name: team.displayName,
    periods: (competitor.linescores ?? []).map((period) => period.value),
    record:
      competitor.records?.find((record) => record.type === "total")?.summary ??
      competitor.records?.[0]?.summary ??
      null,
    score: state === "pre" || Number.isNaN(score) ? null : score,
    shortName: team.shortDisplayName,
  };
}

const PHASE_LABEL: Record<string, string> = {
  "play-in-season": "Play-In",
  "post-season": "Playoffs",
  preseason: "Preseason",
};

function stageOf(event: EspnEvent) {
  const phase = PHASE_LABEL[event.season?.slug ?? ""] ?? null;
  const note = event.competitions[0]?.notes?.[0]?.headline || null;
  if (note && event.season?.slug === "preseason") {
    return `${phase} · ${note}`;
  }
  const series = event.competitions[0]?.series;
  // ESPN can attach a later playoff series between the same two teams to a regular-season game, so only playoff games show one.
  const isPlayoffs = event.season?.slug === "post-season";
  const standing =
    isPlayoffs && series?.type === "playoff" ? series.summary : undefined;
  const label = note ?? phase;
  return label && standing ? `${label} · ${standing}` : label;
}

const FINALS_NOTE = /^NBA Finals\b/u;
const BEST_OF_SEVEN = 7;

function seriesOf(event: EspnEvent): ScoreboardSeries | null {
  const [competition] = event.competitions;
  const { series } = competition;
  if (event.season?.slug !== "post-season" || series?.type !== "playoff") {
    return null;
  }
  const winsOf = (side: "home" | "away") => {
    const id = competition.competitors.find(
      (competitor) => competitor.homeAway === side
    )?.team.id;
    return series.competitors?.find((team) => team.id === id)?.wins ?? 0;
  };
  const note = competition.notes?.[0]?.headline ?? "";
  const game = Math.trunc(Number(note.split("Game ", 2)[1] ?? NaN));
  return {
    awayWins: winsOf("away"),
    game: Number.isNaN(game) ? null : game,
    homeWins: winsOf("home"),
    isComplete: series.completed === true,
    isFinals: FINALS_NOTE.test(note),
    length: series.totalCompetitions ?? BEST_OF_SEVEN,
    summary: series.summary ?? "",
  };
}

function gameOf(event: EspnEvent): ScoreboardData {
  const [competition] = event.competitions;
  const { state, shortDetail } = event.status.type;
  const away = competition.competitors.find((side) => side.homeAway === "away");
  const home = competition.competitors.find((side) => side.homeAway === "home");
  if (!(away && home)) {
    throw new Error("The scores service sent a game without two teams.");
  }
  return {
    asOf: Date.now(),
    away: teamOf(away, state),
    broadcast:
      competition.broadcast ?? competition.broadcasts?.[0]?.names?.[0] ?? null,
    home: teamOf(home, state),
    series: seriesOf(event),
    stage: stageOf(event),
    startsAt: Date.parse(event.date),
    state,
    status: shortDetail,
    venue: competition.venue?.fullName ?? null,
  };
}

async function eventsOn(day?: string) {
  const query = day ? `?dates=${day}` : "";
  const body = await espn<EspnScoreboard>(`scoreboard${query}`);
  return body.events ?? [];
}

function playing(teamId: string) {
  return (event: EspnEvent) =>
    event.competitions[0]?.competitors.some(
      (side) => side.team.id === teamId
    ) ?? false;
}

async function pickFromSchedule(team: EspnTeam) {
  const { events = [] } = await espn<EspnSchedule>(`teams/${team.id}/schedule`);
  const games = events
    .map((event) => ({
      id: event.id,
      startsAt: Date.parse(event.date),
      state: event.competitions[0]?.status.type.state,
    }))
    .toSorted((first, second) => first.startsAt - second.startsAt);
  const live = games.find((game) => game.state === "in");
  if (live) {
    return live;
  }
  const now = Date.now();
  const last = games.findLast((game) => game.state === "post");
  const next = games.find(
    (game) => game.state === "pre" && game.startsAt > now
  );
  const isRecent = last !== undefined && now - last.startsAt < RECENT_MS;
  return isRecent ? last : (next ?? last);
}

/**
ESPN's record of one NBA team's game, found the way getScoreboard finds it: with a date (YYYY-MM-DD), the game that day; without one, today's game, or the closest one to now. Other NBA cards about one game (win probability) start from it.
*/
export async function findGame(
  query: string,
  date?: string
): Promise<EspnEvent> {
  const team = await findTeam(query);

  if (date) {
    const events = await eventsOn(date.replaceAll("-", ""));
    const event = events.find(playing(team.id));
    if (!event) {
      throw new ScoreboardNotFoundError(
        `The ${team.displayName} have no game on ${date}.`
      );
    }
    return event;
  }

  const current = await eventsOn();
  const today = current.find(playing(team.id));
  if (today) {
    return today;
  }

  const picked = await pickFromSchedule(team);
  if (!picked) {
    throw new ScoreboardNotFoundError(
      `The ${team.displayName} have no recent or upcoming games.`
    );
  }
  const events = await eventsOn(scoreboardDay(picked.startsAt));
  const event = events.find((candidate) => candidate.id === picked.id);
  if (!event) {
    throw new ScoreboardNotFoundError(
      `Couldn't find that ${team.displayName} game.`
    );
  }
  return event;
}

/**
The score of one NBA team's game. With a date (YYYY-MM-DD), the game that day; without one, today's game, or the closest one to now. Each team's points come by quarter, too.
*/
export async function getScoreboard(
  query: string,
  date?: string
): Promise<ScoreboardData> {
  return gameOf(await findGame(query, date));
}
