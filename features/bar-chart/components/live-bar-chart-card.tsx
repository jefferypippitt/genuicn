"use client";

import { useEffect, useState } from "react";
import { BarChartCard } from "@/features/bar-chart/components/bar-chart-card";
import { loadBarChart } from "@/features/bar-chart/bar-chart-requests";
import { barLimit } from "@/features/bar-chart/bar-chart-schema";
import type { BarChartData } from "@/features/bar-chart/bar-chart-schema";

/**
What came back for one request. A result for different props reads as still loading, so a new topic never flashes the old chart.
*/
type Result =
  | { key: string; status: "ready"; data: BarChartData }
  | { key: string; status: "error"; message: string };

export const LiveBarChartCard = ({
  topic,
  limit,
  streaming = false,
}: {
  readonly topic?: string;
  /**
  How many bars the model asked for; clamped to what the card can draw.
  */
  readonly limit?: number;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
}) => {
  const [result, setResult] = useState<Result | null>(null);
  const bars = barLimit(limit);
  const requestKey = [topic, bars].join("|");

  useEffect(() => {
    let isCancelled = false;
    const run = async (wanted: string) => {
      let next: Result;
      try {
        next = {
          data: await loadBarChart(wanted, bars),
          key: requestKey,
          status: "ready",
        };
      } catch (error) {
        next = {
          key: requestKey,
          message: Error.isError(error) ? error.message : "Bar chart failed.",
          status: "error",
        };
      }
      if (!isCancelled) {
        setResult(next);
      }
    };
    if (!streaming && topic) {
      run(topic);
    }
    return () => {
      isCancelled = true;
    };
  }, [topic, bars, requestKey, streaming]);

  if (streaming || !topic) {
    return <BarChartCard state="streaming" topic={topic} limit={bars} />;
  }
  const current = result?.key === requestKey ? result : null;
  if (current?.status === "ready") {
    return <BarChartCard state="ready" data={current.data} />;
  }
  return current?.status === "error" ? (
    <BarChartCard state="error" topic={topic} error={current.message} />
  ) : (
    <BarChartCard state="loading" topic={topic} limit={bars} />
  );
};
