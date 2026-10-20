"use client";

import { WeatherIcon } from "@/features/weather/components/weather-icon";
import { WeatherSky } from "@/features/weather/components/weather-sky";
import {
  formatHour,
  formatTemperature,
  skyPhase,
  summarizeWeather,
} from "@/features/weather/weather-schema";
import { CARD_SURFACE } from "@/lib/card-frame";
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

const CARD_FRAME = "relative isolate w-full max-w-md rounded-2xl p-4";

/**
How long each hour waits after the one before it to fade in, so the forecast reads left to right.
*/
const HOUR_STAGGER_MS = 60;

const SCENE = "text-white [text-shadow:0_1px_2px_rgb(0_0_0/0.2)]";

/**
Clips the sky to the card's corners. A clip-path rather than overflow-hidden, so the sky's animated layers stay clipped in Safari.
*/
const SKY_CLIP =
  "pointer-events-none absolute inset-0 rounded-[inherit] [clip-path:inset(0_round_1rem)]";

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
    <section
      aria-label={summarizeWeather(data)}
      className={cn(CARD_FRAME, SCENE, className)}
    >
      <div aria-hidden className={SKY_CLIP}>
        <WeatherSky
          phase={phase}
          condition={data.condition}
          sunProgress={sunProgress}
        />
      </div>
      <div className="relative flex flex-col gap-3">
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-[15px] leading-5 font-semibold">
              {data.location}
            </h3>
            <p className="mt-1 font-mono text-5xl leading-none font-light tracking-tighter tabular-nums">
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
            <p className="font-mono font-medium tabular-nums">
              H:{formatTemperature(data.high)} L:{formatTemperature(data.low)}
            </p>
          </div>
        </header>

        <ol className="grid grid-cols-6 text-center">
          {data.hours.map((hour, index) => (
            <li
              key={hour.time}
              className="animate-in fade-in slide-in-from-bottom-1 fill-mode-both flex flex-col items-center gap-1.5 duration-500 ease-out motion-reduce:animate-none"
              style={{ animationDelay: `${index * HOUR_STAGGER_MS}ms` }}
            >
              <span className="text-xs leading-4 font-medium text-white/80">
                {formatHour(hour.time, data.timeZone)}
              </span>
              <WeatherIcon
                condition={hour.condition}
                isDay={hour.isDay}
                size={22}
                className="drop-shadow-sm"
              />
              <span className="font-mono text-[13px] leading-5 font-semibold tabular-nums">
                {formatTemperature(hour.temperature)}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </section>
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
      className={cn(CARD_FRAME, CARD_SURFACE, "flex flex-col gap-1", className)}
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
