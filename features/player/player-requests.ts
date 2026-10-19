import { normalizeName } from "@/features/player/player-schema";
import type { PlayerData } from "@/features/player/player-schema";

const sharedPlayerRequests = new Map<
  string,
  { expiresAt: number; player: Promise<PlayerData> }
>();
const REUSE_MS = 300_000;

function playerKey(name: string) {
  return (normalizeName(name) ?? name).toLowerCase();
}

async function fetchPlayer(name: string) {
  const response = await fetch(
    `/api/player?${new URLSearchParams({ player: name })}`
  );
  const body = (await response.json()) as PlayerData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : `Player request failed: ${response.status}`
    );
  }
  return body;
}

async function requestPlayer(key: string, name: string) {
  try {
    return await fetchPlayer(name);
  } catch (error) {
    sharedPlayerRequests.delete(key);
    throw error;
  }
}

export function loadPlayer(name: string) {
  const key = playerKey(name);
  const hit = sharedPlayerRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.player;
  }
  const player = requestPlayer(key, name);
  sharedPlayerRequests.set(key, { expiresAt: Date.now() + REUSE_MS, player });
  return player;
}

export function primePlayer(name: string, data: PlayerData) {
  sharedPlayerRequests.set(playerKey(name), {
    expiresAt: Infinity,
    player: Promise.resolve(data),
  });
}
