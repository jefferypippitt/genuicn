"use client";

import { useEffect, useState } from "react";
import { WeatherCard } from "@/features/weather/components/weather-card";
import { loadWeather } from "@/features/weather/weather-requests";
import type {
  WeatherData,
  WeatherUnits,
} from "@/features/weather/weather-schema";

type Load =
  | { status: "loading" }
  | { status: "ready"; data: WeatherData }
  | { status: "error"; message: string };

export function LiveWeatherCard({
  location,
  units,
  streaming = false,
  className,
}: {
  readonly location?: string;
  /**
  Null or left out: the place's usual units.
  */
  readonly units?: WeatherUnits | null;
  /**
  The model is still writing the card's props.
  */
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  const [load, setLoad] = useState<Load>({ status: "loading" });

  useEffect(() => {
    if (streaming || !location) {
      return;
    }
    let isCancelled = false;
    setLoad({ status: "loading" });
    const run = async () => {
      try {
        const data = await loadWeather(location, units ?? undefined);
        if (!isCancelled) {
          setLoad({ data, status: "ready" });
        }
      } catch (error) {
        if (!isCancelled) {
          setLoad({
            message: Error.isError(error) ? error.message : "Weather failed.",
            status: "error",
          });
        }
      }
    };
    run();
    return () => {
      isCancelled = true;
    };
  }, [location, units, streaming]);

  if (streaming || !location) {
    return (
      <WeatherCard
        state="streaming"
        location={location}
        className={className}
      />
    );
  }
  if (load.status === "ready") {
    return <WeatherCard state="ready" data={load.data} className={className} />;
  }
  if (load.status === "error") {
    return (
      <WeatherCard
        state="error"
        location={location}
        error={load.message}
        className={className}
      />
    );
  }
  return (
    <WeatherCard state="loading" location={location} className={className} />
  );
}
