import type {
  Conference,
  StandingsData,
} from "@/features/standings/standings-schema";

const sharedStandingsRequests = new Map<
  Conference,
  { expiresAt: number; standings: Promise<StandingsData> }
>();
/**
Standings move once a game ends, so a minute is fresh enough.
*/
const REUSE_MS = 60_000;

async function fetchStandings(conference: Conference) {
  const response = await fetch(`/api/standings?conference=${conference}`);
  const body = (await response.json()) as StandingsData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Standings request failed: ${response.status}`
    );
  }
  return body;
}

async function requestStandings(conference: Conference) {
  try {
    return await fetchStandings(conference);
  } catch (error) {
    sharedStandingsRequests.delete(conference);
    throw error;
  }
}

export function loadStandings(conference: Conference) {
  const hit = sharedStandingsRequests.get(conference);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.standings;
  }
  const standings = requestStandings(conference);
  sharedStandingsRequests.set(conference, {
    expiresAt: Date.now() + REUSE_MS,
    standings,
  });
  return standings;
}

export function primeStandings(conference: Conference, data: StandingsData) {
  sharedStandingsRequests.set(conference, {
    expiresAt: Infinity,
    standings: Promise.resolve(data),
  });
}
