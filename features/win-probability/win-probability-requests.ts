import { normalizeTeam } from "@/features/win-probability/win-probability-schema";
import type { WinProbabilityData } from "@/features/win-probability/win-probability-schema";

const sharedWinProbabilityRequests = new Map<
  string,
  { expiresAt: number; chances: Promise<WinProbabilityData> }
>();
const REUSE_MS = 20_000;

/**
Which game a card asks for.
*/
export interface WinProbabilityRequest {
  readonly team: string;
  readonly date?: string | null;
}

function requestKey(request: WinProbabilityRequest) {
  const name = (normalizeTeam(request.team) ?? request.team).toLowerCase();
  return `${name}:${request.date ?? "current"}`;
}

async function fetchWinProbability({ team, date }: WinProbabilityRequest) {
  const parameters = new URLSearchParams({ team });
  if (date) {
    parameters.set("date", date);
  }
  const response = await fetch(`/api/win-probability?${parameters}`);
  const body = (await response.json()) as
    WinProbabilityData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `Win probability request failed: ${response.status}`
    );
  }
  return body;
}

async function requestWinProbability(
  key: string,
  request: WinProbabilityRequest
) {
  try {
    return await fetchWinProbability(request);
  } catch (error) {
    sharedWinProbabilityRequests.delete(key);
    throw error;
  }
}

export function loadWinProbability(request: WinProbabilityRequest) {
  const key = requestKey(request);
  const hit = sharedWinProbabilityRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.chances;
  }
  const chances = requestWinProbability(key, request);
  sharedWinProbabilityRequests.set(key, {
    chances,
    expiresAt: Date.now() + REUSE_MS,
  });
  return chances;
}

export function primeWinProbability(
  request: WinProbabilityRequest,
  data: WinProbabilityData
) {
  sharedWinProbabilityRequests.set(requestKey(request), {
    chances: Promise.resolve(data),
    expiresAt: Infinity,
  });
}

/**
True while the saved chances for these props are a recording's, which never go stale: the card doesn't poll them.
*/
export function isPrimedWinProbability(request: WinProbabilityRequest) {
  return (
    sharedWinProbabilityRequests.get(requestKey(request))?.expiresAt ===
    Infinity
  );
}
