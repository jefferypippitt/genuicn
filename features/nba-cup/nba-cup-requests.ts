import type { CupGroup, CupGroupData } from "@/features/nba-cup/nba-cup-schema";

const sharedCupRequests = new Map<
  CupGroup,
  { expiresAt: number; table: Promise<CupGroupData> }
>();
const REUSE_MS = 60_000;

async function fetchCupGroup(group: CupGroup) {
  const response = await fetch(`/api/nba-cup?group=${group}`);
  const body = (await response.json()) as CupGroupData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body
        ? body.error
        : `NBA Cup request failed: ${response.status}`
    );
  }
  return body;
}

async function requestCupGroup(group: CupGroup) {
  try {
    return await fetchCupGroup(group);
  } catch (error) {
    sharedCupRequests.delete(group);
    throw error;
  }
}

export function loadCupGroup(group: CupGroup) {
  const hit = sharedCupRequests.get(group);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.table;
  }
  const table = requestCupGroup(group);
  sharedCupRequests.set(group, { expiresAt: Date.now() + REUSE_MS, table });
  return table;
}

export function primeCupGroup(group: CupGroup, data: CupGroupData) {
  sharedCupRequests.set(group, {
    expiresAt: Infinity,
    table: Promise.resolve(data),
  });
}
