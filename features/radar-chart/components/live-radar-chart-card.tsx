"use client";

import { useEffect, useState } from "react";
import { RadarChartCard } from "@/features/radar-chart/components/radar-chart-card";
import { loadRadarChart } from "@/features/radar-chart/radar-chart-requests";
import type { RadarChartData } from "@/features/radar-chart/radar-chart-schema";

/**
What came back for one request. A result for a different topic reads as still loading, so a new topic never flashes the old chart.
*/
type Result =
  | { key: string; status: "ready"; data: RadarChartData }
  | { key: string; status: "error"; message: string };

export const LiveRadarChartCard = ({
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
          data: await loadRadarChart(wanted),
          key: requestKey,
          status: "ready",
        };
      } catch (error) {
        next = {
          key: requestKey,
          message: Error.isError(error) ? error.message : "Radar chart failed.",
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
    return <RadarChartCard state="streaming" topic={topic} />;
  }
  const current = result?.key === requestKey ? result : null;
  if (current?.status === "ready") {
    return <RadarChartCard state="ready" data={current.data} />;
  }
  return current?.status === "error" ? (
    <RadarChartCard state="error" topic={topic} error={current.message} />
  ) : (
    <RadarChartCard state="loading" topic={topic} />
  );
};
