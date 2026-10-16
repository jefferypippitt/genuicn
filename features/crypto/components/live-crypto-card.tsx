"use client";

import { useEffect, useState } from "react";
import { CryptoCard } from "@/features/crypto/components/crypto-card";
import { loadCrypto } from "@/features/crypto/crypto-requests";
import { errorMessage } from "@/features/crypto/crypto-schema";
import type { CryptoData, CryptoRange } from "@/features/crypto/crypto-schema";

/**
What came back for one symbol and range. A result for different props reads as still loading, so a new coin never flashes the old one.
*/
type Result =
  | { key: string; status: "ready"; data: CryptoData }
  | { key: string; status: "error"; message: string };

export function LiveCryptoCard({
  symbol,
  range = "24h",
  streaming = false,
  className,
}: {
  readonly symbol?: string;
  readonly range?: CryptoRange;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    let isCancelled = false;
    const run = async (wanted: string, key: string) => {
      let next: Result;
      try {
        next = {
          data: await loadCrypto(wanted, range),
          key,
          status: "ready",
        };
      } catch (error) {
        next = {
          key,
          message: errorMessage(error, "Crypto lookup failed."),
          status: "error",
        };
      }
      if (!isCancelled) {
        setResult(next);
      }
    };
    if (!streaming && symbol) {
      run(symbol, `${symbol}:${range}`);
    }
    return () => {
      isCancelled = true;
    };
  }, [symbol, range, streaming]);

  if (streaming || !symbol) {
    return (
      <CryptoCard state="streaming" symbol={symbol} className={className} />
    );
  }
  const current = result?.key === `${symbol}:${range}` ? result : null;
  if (current?.status === "ready") {
    return (
      <CryptoCard
        state="ready"
        data={current.data}
        loadRange={loadCrypto}
        className={className}
      />
    );
  }
  if (current?.status === "error") {
    return (
      <CryptoCard
        state="error"
        symbol={symbol}
        error={current.message}
        className={className}
      />
    );
  }
  return <CryptoCard state="loading" symbol={symbol} className={className} />;
}
