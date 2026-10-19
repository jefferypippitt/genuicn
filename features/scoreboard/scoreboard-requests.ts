import { normalizeTeam } from "@/features/scoreboard/scoreboard-schema";
import type { ScoreboardData } from "@/features/scoreboard/scoreboard-schema";

const sharedScoreboardRequests = new Map<
  string,
  { expiresAt: number; scoreboard: Promise<ScoreboardData> }
>();
const REUSE_MS = 20_000;

/**
Which game a card asks for.
*/
export interface ScoreboardRequest {
  readonly team: string;
  readonly date?: string | null;
}

function scoreboardKey(request: ScoreboardRequest) {
  const name = (normalizeTeam(request.team) ?? request.team).toLowerCase();
  const day = request.date ?? "current";
  return `${name}:${day}`;
}

async function fetchScoreboard({ team, date }: ScoreboardRequest) {
  const parameters = new URLSearchParams({ team });
  if (date) {
    parameters.set("date", date);
  }
  const response = await fetch(`/api/scoreboard?${parameters}`);
  const body = (await response.json()) as ScoreboardData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : `Score request failed: ${response.status}`
    );
  }
  return body;
}

async function requestScoreboard(key: string, request: ScoreboardRequest) {
  try {
    return await fetchScoreboard(request);
  } catch (error) {
    sharedScoreboardRequests.delete(key);
    throw error;
  }
}

export function loadScoreboard(request: ScoreboardRequest) {
  const key = scoreboardKey(request);
  const hit = sharedScoreboardRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.scoreboard;
  }
  const scoreboard = requestScoreboard(key, request);
  sharedScoreboardRequests.set(key, {
    expiresAt: Date.now() + REUSE_MS,
    scoreboard,
  });
  return scoreboard;
}

export function primeScoreboard(
  request: ScoreboardRequest,
  data: ScoreboardData
) {
  sharedScoreboardRequests.set(scoreboardKey(request), {
    expiresAt: Infinity,
    scoreboard: Promise.resolve(data),
  });
}

/**
True while the saved score for these props is a recording's, which never goes stale: the card doesn't poll it.
*/
export function isPrimedScoreboard(request: ScoreboardRequest) {
  return (
    sharedScoreboardRequests.get(scoreboardKey(request))?.expiresAt === Infinity
  );
}
