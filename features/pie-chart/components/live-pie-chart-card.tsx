"use client";

import { useEffect, useState } from "react";
import { PieChartCard } from "@/features/pie-chart/components/pie-chart-card";
import { loadPieChart } from "@/features/pie-chart/pie-chart-requests";
import type { PieChartData } from "@/features/pie-chart/pie-chart-schema";

/**
What came back for one request. A result for a different topic reads as still loading, so a new topic never flashes the old chart.
*/
type Result =
  | { key: string; status: "ready"; data: PieChartData }
  | { key: string; status: "error"; message: string };

export const LivePieChartCard = ({
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
          data: await loadPieChart(wanted),
          key: requestKey,
          status: "ready",
        };
      } catch (error) {
        next = {
          key: requestKey,
          message: Error.isError(error) ? error.message : "Pie chart failed.",
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
    return <PieChartCard state="streaming" topic={topic} />;
  }
  const current = result?.key === requestKey ? result : null;
  if (current?.status === "ready") {
    return <PieChartCard state="ready" data={current.data} />;
  }
  return current?.status === "error" ? (
    <PieChartCard state="error" topic={topic} error={current.message} />
  ) : (
    <PieChartCard state="loading" topic={topic} />
  );
};
