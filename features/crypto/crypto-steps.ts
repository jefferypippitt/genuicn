import { listOf } from "@/features/chat/lookup";
import { loadCrypto } from "@/features/crypto/crypto-requests";
import {
  isCryptoRange,
  normalizeCryptoSymbol,
} from "@/features/crypto/crypto-schema";
import type { CardLookup } from "@/features/chat/lookup";

function symbolOf(properties: Record<string, unknown>) {
  return typeof properties.symbol === "string" ? properties.symbol : "";
}

export const cryptoLookup: CardLookup = {
  intent: (symbols) =>
    symbols.length === 1
      ? `The price of ${symbols[0]}`
      : `Prices for ${listOf(symbols)}`,
  load: (properties) =>
    loadCrypto(
      symbolOf(properties),
      isCryptoRange(properties.range) ? properties.range : "24h"
    ),
  sources: () => [
    { href: "https://www.coingecko.com/", label: "coingecko.com" },
  ],
  subject: (properties) => normalizeCryptoSymbol(symbolOf(properties)),
};
