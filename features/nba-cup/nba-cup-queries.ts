import "server-only";
import { cupGroupName } from "@/features/nba-cup/nba-cup-schema";
import type {
  CupGroup,
  CupGroupData,
  CupTeam,
} from "@/features/nba-cup/nba-cup-schema";

// Server only: the NBA's stats API doesn't allow browser requests (CORS).

const IST_STANDINGS = "https://stats.nba.com/stats/iststandings";

/**
The NBA's stats API leaves a request hanging unless it looks like it came from nba.com.
*/
const HEADERS = {
  Accept: "application/json, text/plain, */*",
  Origin: "https://www.nba.com",
  Referer: "https://www.nba.com/",
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "x-nba-stats-origin": "stats",
  "x-nba-stats-token": "true",
};

const TIMEOUT_MS = 10_000;
/**
One answer holds all six groups, so the card for each group reuses it.
*/
const FRESH_MS = 60_000;

interface IstTeam {
  teamId: number;
  teamName: string;
  teamAbbreviation: string;
  istGroup: string;
  istGroupRank: number;
  wins: number;
  losses: number;
  pts: number;
  oppPts: number;
  diff: number;
}

interface IstStandings {
  seasonYear: string;
  teams?: IstTeam[];
}

/**
The season the NBA Cup is in: from August on, the one starting that fall, so "2026-27" in October 2026.
*/
function currentSeason(now = new Date()) {
  const AUGUST = 7;
  const start =
    now.getUTCMonth() >= AUGUST
      ? now.getUTCFullYear()
      : now.getUTCFullYear() - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

const cache: {
  current: { expiresAt: number; standings: Promise<IstStandings> } | null;
} = { current: null };

async function fetchStandings(season: string) {
  const parameters = new URLSearchParams({
    LeagueID: "00",
    Season: season,
    Section: "group",
  });
  const response = await fetch(`${IST_STANDINGS}?${parameters}`, {
    headers: HEADERS,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`The NBA's stats service returned ${response.status}.`);
  }
  return (await response.json()) as IstStandings;
}

async function standingsOf(season: string) {
  try {
    return await fetchStandings(season);
  } catch (error) {
    cache.current = null;
    throw error;
  }
}

function cupStandings() {
  const hit = cache.current;
  if (hit && Date.now() < hit.expiresAt) {
    return hit.standings;
  }
  const standings = standingsOf(currentSeason());
  cache.current = { expiresAt: Date.now() + FRESH_MS, standings };
  return standings;
}

/**
ESPN's logo names where they differ from the NBA's abbreviation. ESPN's logo host answers every client; the NBA's own refuses requests it takes for bots.
*/
const ESPN_LOGO_NAME: Record<string, string> = {
  GSW: "gs",
  NOP: "no",
  NYK: "ny",
  SAS: "sa",
  UTA: "utah",
  WAS: "wsh",
};

function teamOf(team: IstTeam): CupTeam {
  const logo =
    ESPN_LOGO_NAME[team.teamAbbreviation] ??
    team.teamAbbreviation.toLowerCase();
  return {
    abbreviation: team.teamAbbreviation,
    difference: team.diff,
    logo: `https://a.espncdn.com/i/teamlogos/nba/500/scoreboard/${logo}.png`,
    logoDark: `https://a.espncdn.com/i/teamlogos/nba/500-dark/scoreboard/${logo}.png`,
    losses: team.losses,
    name: team.teamName,
    pointsAgainst: team.oppPts,
    pointsFor: team.pts,
    rank: team.istGroupRank,
    wins: team.wins,
  };
}

/**
One NBA Cup group's table this season, first place first, in the NBA's own order (its tiebreakers settle ties, and the order before any game is played).
*/
export async function getCupGroup(group: CupGroup): Promise<CupGroupData> {
  const standings = await cupStandings();
  const name = cupGroupName(group);
  const teams = (standings.teams ?? [])
    .filter((team) => team.istGroup === name)
    .map(teamOf)
    .toSorted((first, second) => first.rank - second.rank);
  if (teams.length === 0) {
    throw new Error(
      `The NBA has no ${name} table for ${standings.seasonYear} yet.`
    );
  }
  return { asOf: Date.now(), group, season: standings.seasonYear, teams };
}
