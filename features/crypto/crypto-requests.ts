import { normalizeCryptoSymbol } from "@/features/crypto/crypto-schema";
import type { CryptoData, CryptoRange } from "@/features/crypto/crypto-schema";

const sharedCryptoRequests = new Map<
  string,
  { expiresAt: number; crypto: Promise<CryptoData> }
>();
const REUSE_MS = 60_000;

function cryptoKey(symbol: string, range: CryptoRange) {
  const coin = normalizeCryptoSymbol(symbol) ?? symbol.trim().toUpperCase();
  return `${coin}:${range}`;
}

async function fetchCrypto(symbol: string, range: CryptoRange) {
  const parameters = new URLSearchParams({ range, symbol });
  const response = await fetch(`/api/crypto?${parameters}`);
  const body = (await response.json()) as CryptoData | { error: string };
  if (!response.ok || "error" in body) {
    throw new Error(
      "error" in body ? body.error : `Crypto request failed: ${response.status}`
    );
  }
  return body;
}

async function requestCrypto(key: string, symbol: string, range: CryptoRange) {
  try {
    return await fetchCrypto(symbol, range);
  } catch (error) {
    sharedCryptoRequests.delete(key);
    throw error;
  }
}

export function loadCrypto(symbol: string, range: CryptoRange = "24h") {
  const key = cryptoKey(symbol, range);
  const hit = sharedCryptoRequests.get(key);
  if (hit && Date.now() < hit.expiresAt) {
    return hit.crypto;
  }
  const crypto = requestCrypto(key, symbol, range);
  sharedCryptoRequests.set(key, { crypto, expiresAt: Date.now() + REUSE_MS });
  return crypto;
}

export function primeCrypto(
  symbol: string,
  range: CryptoRange,
  data: CryptoData
) {
  sharedCryptoRequests.set(cryptoKey(symbol, range), {
    crypto: Promise.resolve(data),
    expiresAt: Infinity,
  });
}
