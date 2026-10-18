import "server-only";
import type {
  PlayerAverages,
  PlayerData,
} from "@/features/player/player-schema";

// Server only: ESPN's site APIs don't allow browser requests (CORS).

const NBA = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba";
const COMMON =
  "https://site.web.api.espn.com/apis/common/v3/sports/basketball/nba";
const SEARCH = "https://site.web.api.espn.com/apis/search/v2";

const TIMEOUT_MS = 8000;
/**
Averages only move after a game, and the answer covers every player in the league, so it's kept for an hour.
*/
const AVERAGES_FRESH_MS = 3_600_000;
const NOT_FOUND = 404;

/**
A lookup that found no player, or one who isn't on a team.
*/
export class PlayerNotFoundError extends Error {
  readonly status = NOT_FOUND;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "PlayerNotFoundError";
  }
}

interface EspnRoster {
  season?: { displayName?: string };
  team?: { abbreviation: string; displayName: string };
  athletes?: {
    id: string;
    displayName: string;
    jersey?: string;
    displayHeight?: string;
    age?: number;
    experience?: { years?: number };
    headshot?: { href?: string };
  }[];
}

interface EspnAverages {
  requestedSeason?: { displayName?: string };
  categories?: { name: string; names: string[] }[];
  athletes?: {
    athlete: { id: string };
    categories: { name: string; values: number[] }[];
  }[];
}

interface EspnSearch {
  results?: {
    type: string;
    contents?: { uid?: string; defaultLeagueSlug?: string }[];
  }[];
}

async function espn<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`The player service returned ${response.status}.`);
  }
  return (await response.json()) as T;
}

const averagesCache: {
  current: { expiresAt: number; value: Promise<EspnAverages> } | null;
} = { current: null };

async function fetchAverages() {
  try {
    // Without a season, ESPN answers with the latest one that has games, and says which.
    return await espn<EspnAverages>(
      `${COMMON}/statistics/byathlete?seasontype=2&limit=1000`
    );
  } catch (error) {
    averagesCache.current = null;
    throw error;
  }
}

/**
Every player's averages in one answer, kept for an hour and forgotten if the request fails.
*/
function leagueAverages() {
  const hit = averagesCache.current;
  if (hit && Date.now() < hit.expiresAt) {
    return hit.value;
  }
  const value = fetchAverages();
  averagesCache.current = { expiresAt: Date.now() + AVERAGES_FRESH_MS, value };
  return value;
}

/**
The NBA player ESPN's search finds first for a name, and the team he plays for now.
*/
async function findPlayer(query: string) {
  const parameters = new URLSearchParams({
    limit: "5",
    query,
    type: "player",
  });
  const body = await espn<EspnSearch>(`${SEARCH}?${parameters}`);
  const match = body.results
    ?.find((result) => result.type === "player")
    ?.contents?.find((content) => content.defaultLeagueSlug === "nba");
  // A player's uid ends in his id: "s:40~l:46~a:1966".
  const playerId = match?.uid?.split("~a:", 2)[1];
  if (!playerId) {
    throw new PlayerNotFoundError(`No NBA player called "${query}".`);
  }
  const { athlete } = await espn<{
    athlete: { displayName: string; team?: { id: string } };
  }>(`${COMMON}/athletes/${playerId}`);
  if (!athlete.team) {
    throw new PlayerNotFoundError(
      `${athlete.displayName} isn't on an NBA team right now.`
    );
  }
  return { playerId, teamId: athlete.team.id };
}

const NO_AVERAGES: PlayerAverages = {
  assists: null,
  points: null,
  rebounds: null,
  steals: null,
};

/**
One player's per-game points, assists, rebounds and steals. ESPN files each stat under a category with a parallel list of names, so they're found by name rather than by position.
*/
function averagesOf(body: EspnAverages, playerId: string): PlayerAverages {
  const entry = body.athletes?.find(({ athlete }) => athlete.id === playerId);
  if (!entry) {
    return NO_AVERAGES;
  }
  const categoryList = body.categories ?? [];
  const read = (name: string) => {
    for (const category of categoryList) {
      const index = category.names.indexOf(name);
      if (index !== -1) {
        const value = entry.categories.find(
          (candidate) => candidate.name === category.name
        )?.values[index];
        return typeof value === "number" ? value : null;
      }
    }
    return null;
  };
  return {
    assists: read("avgAssists"),
    points: read("avgPoints"),
    rebounds: read("avgRebounds"),
    steals: read("avgSteals"),
  };
}

/**
Seasons played before this one, as a roster page counts them. ESPN counts the current season for everyone but this year's rookies, who get 0: a second-year player reads 2, LeBron James in his 24th season reads 24.
*/
function seasonsBefore(years = 0) {
  return Math.max(years - 1, 0);
}

/**
One NBA player this season: his team now, his number, height, age and experience from its roster, and his per-game averages.
*/
export async function getPlayer(name: string): Promise<PlayerData> {
  const { playerId, teamId } = await findPlayer(name);
  const [roster, averages] = await Promise.all([
    espn<EspnRoster>(`${NBA}/teams/${teamId}/roster`),
    leagueAverages(),
  ]);
  const athlete = roster.athletes?.find(
    (candidate) => candidate.id === playerId
  );
  if (!athlete) {
    throw new PlayerNotFoundError(
      `Couldn't find "${name}" on the ${roster.team?.displayName ?? "team's"} roster.`
    );
  }
  return {
    asOf: Date.now(),
    player: {
      age: athlete.age ?? null,
      experience: seasonsBefore(athlete.experience?.years),
      headshot: athlete.headshot?.href ?? null,
      height: athlete.displayHeight ?? null,
      id: athlete.id,
      jersey: athlete.jersey ?? null,
      name: athlete.displayName,
      ...averagesOf(averages, athlete.id),
    },
    season: roster.season?.displayName ?? "",
    statsSeason: averages.requestedSeason?.displayName ?? "",
    team: {
      abbreviation: roster.team?.abbreviation ?? "",
      name: roster.team?.displayName ?? "",
    },
  };
}
