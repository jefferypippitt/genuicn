import "server-only";
import type {
  Conference,
  StandingsData,
  StandingsTeam,
} from "@/features/standings/standings-schema";

// Server only: ESPN's site API doesn't allow browser requests (CORS).

/**
seasontype=2 is the regular season. Without it, ESPN answers with the preseason's standings while exhibition games are on. With no season, ESPN picks the current one.
*/
const STANDINGS =
  "https://site.api.espn.com/apis/v2/sports/basketball/nba/standings?seasontype=2";

const TIMEOUT_MS = 8000;

interface EspnStat {
  type: string;
  displayValue: string;
}

interface EspnEntry {
  team: {
    displayName: string;
    shortDisplayName: string;
    abbreviation: string;
    logos?: { href: string; rel: string[] }[];
  };
  stats: EspnStat[];
}

interface EspnStandings {
  children?: {
    abbreviation: string;
    standings: { seasonDisplayName?: string; entries: EspnEntry[] };
  }[];
}

const ESPN_CONFERENCE: Record<Conference, string> = {
  east: "East",
  west: "West",
};

const NO_GAMES = "0-0";
const NO_VALUE = "-";

function rowOf(entry: EspnEntry): Omit<StandingsTeam, "rank"> & {
  seed: number;
} {
  const stat = (type: string) =>
    entry.stats.find((item) => item.type === type)?.displayValue;
  const logos = entry.team.logos ?? [];
  const wins = Number(stat("wins") ?? 0);
  const losses = Number(stat("losses") ?? 0);
  return {
    abbreviation: entry.team.abbreviation,
    away: stat("road") ?? NO_GAMES,
    conference: stat("vsconf") ?? NO_GAMES,
    gamesBehind: stat("gamesbehind") ?? NO_VALUE,
    home: stat("home") ?? NO_GAMES,
    // ESPN leaves out the last ten until a team has played.
    lastTen: stat("lasttengames") ?? NO_GAMES,
    logo: logos.find((logo) => !logo.rel.includes("dark"))?.href ?? null,
    logoDark: logos.find((logo) => logo.rel.includes("dark"))?.href ?? null,
    losses,
    name: entry.team.displayName,
    seed: Number(stat("playoffseed") ?? 0),
    shortName: entry.team.shortDisplayName,
    streak: stat("streak") ?? NO_VALUE,
    winPercent: stat("winpercent") ?? ".000",
    wins,
  };
}

/**
A seed of 0 means none yet: those teams go after every seeded one.
*/
function placeOf(seed: number) {
  return seed || Number.MAX_SAFE_INTEGER;
}

/**
One conference's regular-season standings, first place first. ESPN sends the teams in no order, with each one's seed; before the season every seed is 0, and the teams keep ESPN's order.
*/
export async function getStandings(
  conference: Conference
): Promise<StandingsData> {
  const response = await fetch(STANDINGS, {
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new Error(`The standings service returned ${response.status}.`);
  }
  const body = (await response.json()) as EspnStandings;
  const group = body.children?.find(
    (child) => child.abbreviation === ESPN_CONFERENCE[conference]
  );
  if (!group) {
    throw new Error("The standings service sent no table for that conference.");
  }
  const teams = group.standings.entries
    .map(rowOf)
    .toSorted((first, second) => placeOf(first.seed) - placeOf(second.seed))
    .map((row, index) => {
      const { seed, ...team } = row;
      return { ...team, rank: seed || index + 1 };
    });
  return {
    asOf: Date.now(),
    conference,
    season: group.standings.seasonDisplayName ?? "",
    teams,
  };
}
