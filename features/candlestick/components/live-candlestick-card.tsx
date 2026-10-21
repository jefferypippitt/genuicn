"use client";

import { useEffect, useState } from "react";
import { CandlestickCard } from "@/features/candlestick/components/candlestick-card";
import { loadCandlestick } from "@/features/candlestick/candlestick-requests";
import { errorMessage } from "@/features/candlestick/candlestick-schema";
import type {
  CandlestickData,
  CandlestickRange,
} from "@/features/candlestick/candlestick-schema";

/**
What came back for one ticker and range. A result for different props reads as still loading, so a new ticker never flashes the old one.
*/
type Result =
  | { key: string; status: "ready"; data: CandlestickData }
  | { key: string; status: "error"; message: string };

export function LiveCandlestickCard({
  ticker,
  range = "1m",
  streaming = false,
  className,
}: {
  readonly ticker?: string;
  readonly range?: CandlestickRange;
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
          data: await loadCandlestick(wanted, range),
          key,
          status: "ready",
        };
      } catch (error) {
        next = {
          key,
          message: errorMessage(error, "Chart lookup failed."),
          status: "error",
        };
      }
      if (!isCancelled) {
        setResult(next);
      }
    };
    if (!streaming && ticker) {
      run(ticker, `${ticker}:${range}`);
    }
    return () => {
      isCancelled = true;
    };
  }, [ticker, range, streaming]);

  if (streaming || !ticker) {
    return (
      <CandlestickCard
        state="streaming"
        ticker={ticker}
        className={className}
      />
    );
  }
  const current = result?.key === `${ticker}:${range}` ? result : null;
  if (current?.status === "ready") {
    return (
      <CandlestickCard
        state="ready"
        data={current.data}
        loadRange={loadCandlestick}
        className={className}
      />
    );
  }
  if (current?.status === "error") {
    return (
      <CandlestickCard
        state="error"
        ticker={ticker}
        error={current.message}
        className={className}
      />
    );
  }
  return (
    <CandlestickCard state="loading" ticker={ticker} className={className} />
  );
}
