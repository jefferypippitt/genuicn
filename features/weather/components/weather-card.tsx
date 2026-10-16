"use client";

import { GlassCard } from "@/components/glass-card";
import { WeatherIcon } from "@/features/weather/components/weather-icon";
import { WeatherSky } from "@/features/weather/components/weather-sky";
import {
  formatHour,
  formatTemperature,
  skyPhase,
  summarizeWeather,
} from "@/features/weather/weather-schema";
import { cn } from "@/lib/utils";
import type { WeatherData } from "@/features/weather/weather-schema";

export type WeatherCardState = "streaming" | "loading" | "ready" | "error";

export interface WeatherCardProps {
  readonly state: WeatherCardState;
  /**
  The location from the props, shown before the data arrives.
  */
  readonly location?: string;
  readonly data?: WeatherData;
  readonly error?: string;
  readonly className?: string;
}

const CARD_FRAME = "relative isolate w-full max-w-sm rounded-2xl p-4";

export function WeatherCard({
  state,
  location,
  data,
  error,
  className,
}: WeatherCardProps) {
  if (state === "ready" && data) {
    return <WeatherReady data={data} className={className} />;
  }
  if (state === "error") {
    return (
      <WeatherError location={location} message={error} className={className} />
    );
  }
  return (
    <WeatherCardSkeleton
      location={location}
      streaming={state === "streaming"}
      className={className}
    />
  );
}

function WeatherReady({
  data,
  className,
}: {
  readonly data: WeatherData;
  readonly className?: string;
}) {
  const phase = skyPhase(data.asOf, data.sunrise, data.sunset);
  const sunProgress =
    (data.asOf - data.sunrise) / Math.max(data.sunset - data.sunrise, 1);
  return (
    <GlassCard
      surface="scene"
      label={summarizeWeather(data)}
      className={className}
      backdrop={
        <WeatherSky
          phase={phase}
          condition={data.condition}
          sunProgress={sunProgress}
        />
      }
    >
      <div className="flex flex-col gap-3">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] leading-5 font-semibold">
              {data.location}
            </h3>
            <p className="mt-1 text-5xl leading-none font-light tracking-tight tabular-nums">
              {formatTemperature(data.temperature)}
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end text-right text-[13px] leading-5 font-semibold">
            <WeatherIcon
              condition={data.condition}
              isDay={data.isDay}
              size={20}
              className="drop-shadow-sm"
            />
            <p className="mt-1.5">{data.label}</p>
            <p className="tabular-nums">
              H:{formatTemperature(data.high)} L:{formatTemperature(data.low)}
            </p>
          </div>
        </header>

        <ol className="grid grid-cols-6 text-center">
          {data.hours.map((hour) => (
            <li key={hour.time} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] leading-4 font-medium text-white/80">
                {formatHour(hour.time, data.timeZone)}
              </span>
              <WeatherIcon
                condition={hour.condition}
                isDay={hour.isDay}
                size={22}
                className="drop-shadow-sm"
              />
              <span className="text-[13px] leading-5 font-semibold tabular-nums">
                {formatTemperature(hour.temperature)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </GlassCard>
  );
}

function WeatherError({
  location,
  message,
  className,
}: {
  readonly location?: string;
  readonly message?: string;
  readonly className?: string;
}) {
  return (
    <div
      role="alert"
      className={cn(
        CARD_FRAME,
        "bg-card text-card-foreground flex flex-col gap-1 border",
        className
      )}
    >
      <p className="text-sm font-semibold">
        {location
          ? `Couldn't load the weather for ${location}`
          : "Couldn't load the weather"}
      </p>
      <p className="text-muted-foreground text-xs">
        {message ??
          "The weather service didn't respond. Try again in a moment."}
      </p>
    </div>
  );
}

/** The card while its data is on the way: the same frame and rows as the
 *  ready card, so nothing moves when the forecast lands. Shows the place as
 *  soon as it's known (with "…" while the model is still writing it). */
export function WeatherCardSkeleton({
  location,
  streaming = false,
  className,
}: {
  readonly location?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) {
  return (
    <div
      role="status"
      className={cn(CARD_FRAME, "bg-muted text-foreground", className)}
    >
      <span className="sr-only">
        {location ? `Loading the weather for ${location}` : "Loading weather"}
      </span>
      <div aria-hidden className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {location ? (
              <p className="truncate text-[15px] leading-5 font-semibold">
                {location}
                {streaming ? (
                  <span className="text-muted-foreground">…</span>
                ) : null}
              </p>
            ) : (
              <div className="flex h-5 items-center">
                <div className="bg-foreground/10 h-3.5 w-24 animate-pulse rounded" />
              </div>
            )}
            <div className="bg-foreground/10 mt-1 h-12 w-20 animate-pulse rounded-lg" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="bg-foreground/10 size-5 animate-pulse rounded-full" />
            <div className="bg-foreground/10 h-4 w-24 animate-pulse rounded" />
            <div className="bg-foreground/10 h-4 w-20 animate-pulse rounded" />
          </div>
        </div>
        <div className="grid grid-cols-6">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <div key={key} className="flex flex-col items-center gap-1.5">
              <div className="bg-foreground/10 h-4 w-8 animate-pulse rounded" />
              <div className="bg-foreground/10 size-[22px] animate-pulse rounded-full" />
              <div className="bg-foreground/10 h-5 w-7 animate-pulse rounded" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
