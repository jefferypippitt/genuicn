"use client";

import { useEffect, useState } from "react";
import { ForecastCard } from "@/features/forecast/components/forecast-card";
import { loadForecast } from "@/features/forecast/forecast-requests";
import type {
  ForecastData,
  ForecastView,
} from "@/features/forecast/forecast-schema";
import type { WeatherUnits } from "@/features/weather/weather-schema";

/**
What came back for one place and units. A result for different props reads as still loading, so a new place never flashes the old one.
*/
type Result =
  | { key: string; status: "ready"; data: ForecastData }
  | { key: string; status: "error"; message: string };

export function LiveForecastCard({
  location,
  units,
  view = "daily",
  streaming = false,
  className,
}: {
  readonly location?: string;
  /**
  Null or left out: the place's usual units.
  */
  readonly units?: WeatherUnits | null;
  readonly view?: ForecastView;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [result, setResult] = useState<Result | null>(null);
  const key = `${location}:${units ?? "auto"}`;

  useEffect(() => {
    let isCancelled = false;
    const requested = units ?? undefined;
    const run = async (place: string) => {
      let next: Result;
      try {
        next = {
          data: await loadForecast(place, requested),
          key,
          status: "ready",
        };
      } catch (error) {
        next = {
          key,
          message: Error.isError(error) ? error.message : "Forecast failed.",
          status: "error",
        };
      }
      if (!isCancelled) {
        setResult(next);
      }
    };
    if (!streaming && location) {
      run(location);
    }
    return () => {
      isCancelled = true;
    };
  }, [key, location, units, streaming]);

  if (streaming || !location) {
    return (
      <ForecastCard
        state="streaming"
        location={location}
        view={view}
        className={className}
      />
    );
  }
  const current = result?.key === key ? result : null;
  if (current?.status === "ready") {
    return (
      <ForecastCard
        state="ready"
        data={current.data}
        view={view}
        className={className}
      />
    );
  }
  if (current?.status === "error") {
    return (
      <ForecastCard
        state="error"
        location={location}
        error={current.message}
        className={className}
      />
    );
  }
  return (
    <ForecastCard
      state="loading"
      location={location}
      view={view}
      className={className}
    />
  );
}
