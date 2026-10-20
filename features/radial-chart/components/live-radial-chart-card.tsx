"use client";

import { useEffect, useState } from "react";
import { RadialChartCard } from "@/features/radial-chart/components/radial-chart-card";
import { loadRadialChart } from "@/features/radial-chart/radial-chart-requests";
import type { RadialChartData } from "@/features/radial-chart/radial-chart-schema";

/**
What came back for one request. A result for a different topic reads as still loading, so a new topic never flashes the old chart.
*/
type Result =
  | { key: string; status: "ready"; data: RadialChartData }
  | { key: string; status: "error"; message: string };

export const LiveRadialChartCard = ({
  topic,
  streaming = false,
}: {
  readonly topic?: string;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
}) => {
  const [result, setResult] = useState<Result | null>(null);
  const requestKey = topic ?? "";

  useEffect(() => {
    let isCancelled = false;
    const run = async (wanted: string) => {
      let next: Result;
      try {
        next = {
          data: await loadRadialChart(wanted),
          key: requestKey,
          status: "ready",
        };
      } catch (error) {
        next = {
          key: requestKey,
          message: Error.isError(error)
            ? error.message
            : "Radial chart failed.",
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
  }, [topic, requestKey, streaming]);

  if (streaming || !topic) {
    return <RadialChartCard state="streaming" topic={topic} />;
  }
  const current = result?.key === requestKey ? result : null;
  if (current?.status === "ready") {
    return <RadialChartCard state="ready" data={current.data} />;
  }
  return current?.status === "error" ? (
    <RadialChartCard state="error" topic={topic} error={current.message} />
  ) : (
    <RadialChartCard state="loading" topic={topic} />
  );
};
