"use client";

import { useEffect, useState } from "react";
import { AreaChartCard } from "@/features/area-chart/components/area-chart-card";
import { loadAreaChart } from "@/features/area-chart/area-chart-requests";
import {
  compareSubjects,
  withRange,
} from "@/features/area-chart/area-chart-schema";
import type {
  AreaChartData,
  AreaChartRange,
} from "@/features/area-chart/area-chart-schema";

/**
What came back for one request. A result for different props reads as still loading, so a new topic never flashes the old chart.
*/
type Result =
  | { key: string; status: "ready"; data: AreaChartData }
  | { key: string; status: "error"; message: string };

export const LiveAreaChartCard = ({
  topic,
  range,
  ranges = false,
  compare,
  streaming = false,
}: {
  readonly topic?: string;
  readonly range?: AreaChartRange;
  /**
  Model opt-in for the 10Y/25Y/50Y/Max tabs on long multi-decade series.
  */
  readonly ranges?: boolean;
  /**
  Model opt-in for subject tabs, e.g. ["Coal", "Solar"]. Takes the place of the range tabs.
  */
  readonly compare?: readonly string[];
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
}) => {
  const [result, setResult] = useState<Result | null>(null);
  const compareKey = compareSubjects(compare).join("\n");
  const isCompare = compareKey !== "";
  const isShowRanges = ranges === true && !isCompare;
  const initialRange = range ?? (isShowRanges ? "50y" : "max");
  const requestKey = [topic, initialRange, isShowRanges, compareKey].join("|");

  useEffect(() => {
    let isCancelled = false;
    const fetchRange = isShowRanges ? "max" : initialRange;
    const options = {
      compare: compareKey ? compareKey.split("\n") : [],
      ranges: isShowRanges,
    };
    const run = async (wanted: string) => {
      let next: Result;
      try {
        next = {
          data: await loadAreaChart(wanted, fetchRange, options),
          key: requestKey,
          status: "ready",
        };
      } catch (error) {
        next = {
          key: requestKey,
          message: Error.isError(error) ? error.message : "Area chart failed.",
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
  }, [topic, initialRange, isShowRanges, compareKey, requestKey, streaming]);

  if (streaming || !topic) {
    return <AreaChartCard state="streaming" topic={topic} />;
  }
  const current = result?.key === requestKey ? result : null;
  if (current?.status === "ready") {
    return (
      <AreaChartCard
        state="ready"
        data={
          isShowRanges ? withRange(current.data, initialRange) : current.data
        }
        series={isShowRanges ? current.data : undefined}
      />
    );
  }
  return current?.status === "error" ? (
    <AreaChartCard state="error" topic={topic} error={current.message} />
  ) : (
    <AreaChartCard state="loading" topic={topic} />
  );
};
