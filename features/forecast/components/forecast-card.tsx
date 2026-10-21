"use client";

import { useState } from "react";
import {
  FORECAST_VIEW_LABEL,
  FORECAST_VIEWS,
  formatForecastDay,
  formatForecastHour,
  RAIN_SHOWN_FROM,
  shownHours,
  summarizeForecast,
} from "@/features/forecast/forecast-schema";
import { WeatherIcon } from "@/features/weather/components/weather-icon";
import { formatTemperature } from "@/features/weather/weather-schema";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { fontWeights } from "@/lib/font-weight";
import { typeClass } from "@/lib/type-scale";
import { cn } from "@/lib/utils";
import type {
  ForecastData,
  ForecastDay,
  ForecastView,
} from "@/features/forecast/forecast-schema";

export type ForecastCardState = "streaming" | "loading" | "ready" | "error";

export interface ForecastCardProperties {
  readonly state: ForecastCardState;
  /**
  The place from the props, shown before the data arrives.
  */
  readonly location?: string;
  readonly data?: ForecastData;
  /**
  The view the card opens on. The switch changes it without a new request.
  */
  readonly view?: ForecastView;
  readonly error?: string;
  readonly className?: string;
}

/**
The icons draw white clouds for the Weather card's sky. On this plain surface they take a grey that reads in both themes.
*/
const ICON_TONES =
  "[--weather-cloud:#a1a1aa] [--weather-moon:#a1a1aa] dark:[--weather-cloud:#e4e4e7] dark:[--weather-moon:#f5f3ff]";

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-md ${ICON_TONES}`;

const TYPE_TITLE = typeClass("title", "default");
const TYPE_SUBTITLE = typeClass("subtitle", "default");
const TYPE_CAPTION = typeClass("caption", "default");
const MUTED = "text-muted-foreground";
const TABULAR = "tabular-nums";
const RAIN = "text-sky-600 dark:text-sky-400";

const NORMAL = { fontVariationSettings: fontWeights.normal };
const SEMIBOLD = { fontVariationSettings: fontWeights.semibold };

const HOUR_ICON_SIZE = 28;
const DAY_ICON_SIZE = 22;
const HEADER_ICON_SIZE = 24;
const PERCENT = 100;

/**
Day, icon, rain chance, low, range bar, high. Fixed tracks keep every row's bar starting at the same x.
*/
const DAY_ROW =
  "grid grid-cols-[2.75rem_1.5rem_2.25rem_2.25rem_minmax(0,1fr)_2.25rem] items-center gap-x-2";

const NOTE: Record<ForecastView, string> = {
  daily: "Daily highs and lows",
  hourly: "Every 2 hours",
};

/**
Cold to warm, the colors a range bar runs through across the ten days' lowest low to highest high.
*/
const TEMPERATURE_GRADIENT =
  "linear-gradient(to right, #38bdf8, #34d399, #facc15, #fb923c)";

function rainLabel(precipitation: number) {
  return precipitation >= RAIN_SHOWN_FROM ? `${precipitation}%` : "";
}

const RainChance = ({ precipitation }: { readonly precipitation: number }) => (
  <span className={cn(TYPE_CAPTION, RAIN, TABULAR)} style={NORMAL} aria-hidden>
    {/* A non-breaking space holds the line when there is no chance to show. */}
    {rainLabel(precipitation) || " "}
  </span>
);

const Header = ({ data }: { readonly data: ForecastData }) => (
  <header className="flex items-end justify-between gap-3">
    <div className="min-w-0">
      <h3 className={cn(TYPE_TITLE, "truncate")} style={SEMIBOLD}>
        {data.location}
      </h3>
      <p className={cn(MUTED, TYPE_CAPTION, "truncate")} style={NORMAL}>
        {data.region}
      </p>
    </div>
    <div className="flex shrink-0 items-center gap-2">
      <WeatherIcon
        condition={data.current.condition}
        isDay={data.current.isDay}
        size={HEADER_ICON_SIZE}
      />
      <div className="text-right">
        <p className={cn(TYPE_TITLE, TABULAR)} style={SEMIBOLD}>
          {formatTemperature(data.current.temperature)}
        </p>
        <p className={cn(MUTED, TYPE_CAPTION)} style={NORMAL}>
          {data.current.label}
        </p>
      </div>
    </div>
  </header>
);

const HourlyView = ({ data }: { readonly data: ForecastData }) => (
  <ol className="grid grid-cols-6 gap-y-4 text-center">
    {shownHours(data).map((hour, index) => {
      const time = formatForecastHour(hour, index, data.timeZone);
      return (
        <li key={hour.time} className="flex flex-col items-center gap-1">
          <span className="sr-only">
            {`${time}: ${formatTemperature(hour.temperature)}, ${hour.condition.replace("-", " ")}, ${hour.precipitation}% chance of rain`}
          </span>
          <span className={cn(MUTED, TYPE_CAPTION)} style={NORMAL} aria-hidden>
            {time}
          </span>
          <WeatherIcon
            condition={hour.condition}
            isDay={hour.isDay}
            size={HOUR_ICON_SIZE}
          />
          <span
            className={cn(TYPE_SUBTITLE, TABULAR)}
            style={SEMIBOLD}
            aria-hidden
          >
            {formatTemperature(hour.temperature)}
          </span>
          <RainChance precipitation={hour.precipitation} />
        </li>
      );
    })}
  </ol>
);

/**
A day's low-to-high bar on the ten days' shared scale. The gradient spans the whole scale, so a warm day's bar shows warm colors and a cool day's cool ones.
*/
const RangeBar = ({
  day,
  min,
  max,
  now,
}: {
  readonly day: ForecastDay;
  readonly min: number;
  readonly max: number;
  /**
  Today's current temperature, marked on the bar.
  */
  readonly now?: number;
}) => {
  const span = Math.max(max - min, 1);
  const left = ((day.low - min) / span) * PERCENT;
  const width = Math.max(((day.high - day.low) / span) * PERCENT, 2);
  const position = width >= PERCENT ? 0 : (left / (PERCENT - width)) * PERCENT;
  const nowAt =
    now === undefined
      ? null
      : ((Math.min(Math.max(now, day.low), day.high) - min) / span) * PERCENT;
  return (
    <div className="bg-muted relative h-1 rounded-full">
      <div
        className="absolute inset-y-0 rounded-full"
        style={{
          backgroundImage: TEMPERATURE_GRADIENT,
          backgroundPosition: `${position}% 0`,
          backgroundSize: `${(PERCENT / width) * PERCENT}% 100%`,
          left: `${left}%`,
          width: `${width}%`,
        }}
      />
      {nowAt === null ? null : (
        <div
          className="bg-foreground ring-background absolute top-1/2 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2"
          style={{ left: `${nowAt}%` }}
        />
      )}
    </div>
  );
};

const DailyView = ({ data }: { readonly data: ForecastData }) => {
  const min = Math.min(...data.days.map((day) => day.low));
  const max = Math.max(...data.days.map((day) => day.high));
  return (
    <ol className="flex flex-col">
      {data.days.map((day, index) => {
        const label = formatForecastDay(day, index, data.timeZone);
        return (
          <li key={day.time} className={cn(DAY_ROW, "h-8")}>
            <span className="sr-only">
              {`${label}: ${day.condition.replace("-", " ")}, low ${formatTemperature(day.low)}, high ${formatTemperature(day.high)}, ${day.precipitation}% chance of rain`}
            </span>
            <span className={TYPE_SUBTITLE} style={NORMAL} aria-hidden>
              {label}
            </span>
            <WeatherIcon condition={day.condition} size={DAY_ICON_SIZE} />
            <RainChance precipitation={day.precipitation} />
            <span
              className={cn(MUTED, TYPE_SUBTITLE, "text-right", TABULAR)}
              style={NORMAL}
              aria-hidden
            >
              {formatTemperature(day.low)}
            </span>
            <div aria-hidden>
              <RangeBar
                day={day}
                min={min}
                max={max}
                now={index === 0 ? data.current.temperature : undefined}
              />
            </div>
            <span
              className={cn(TYPE_SUBTITLE, "text-right", TABULAR)}
              style={SEMIBOLD}
              aria-hidden
            >
              {formatTemperature(day.high)}
            </span>
          </li>
        );
      })}
    </ol>
  );
};

const ViewSwitch = ({
  shown,
  onSelect,
}: {
  readonly shown: ForecastView;
  readonly onSelect: (view: ForecastView) => void;
}) => (
  <fieldset className="bg-muted flex min-w-0 gap-0.5 rounded-lg p-0.5">
    <legend className="sr-only">View</legend>
    {FORECAST_VIEWS.map((view) => {
      const isSelected = shown === view;
      return (
        <button
          key={view}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(view)}
          className={cn(
            "focus-visible:ring-ring rounded-md px-2 py-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
            isSelected
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {FORECAST_VIEW_LABEL[view]}
        </button>
      );
    })}
  </fieldset>
);

const ForecastReady = ({
  data,
  initialView,
  className,
}: {
  readonly data: ForecastData;
  readonly initialView: ForecastView;
  readonly className?: string;
}) => {
  const [view, setView] = useState(initialView);
  return (
    <section
      aria-label={summarizeForecast(data, view)}
      className={cn(CARD_FRAME, "flex flex-col gap-5", className)}
    >
      <Header data={data} />
      {view === "hourly" ? (
        <HourlyView data={data} />
      ) : (
        <DailyView data={data} />
      )}
      <div className="flex items-center justify-between gap-3">
        <ViewSwitch shown={view} onSelect={setView} />
        <p className={cn(MUTED, TYPE_CAPTION, "truncate")} style={NORMAL}>
          {NOTE[view]}
        </p>
      </div>
    </section>
  );
};

const ForecastError = ({
  location,
  message = "The weather service didn't respond. Try again in a moment.",
}: {
  readonly location?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className={TYPE_SUBTITLE} style={SEMIBOLD}>
      {location
        ? `Couldn't load the forecast for ${location}`
        : "Couldn't load the forecast"}
    </p>
    <p className={cn(MUTED, TYPE_CAPTION)} style={NORMAL}>
      {message}
    </p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

const HOUR_SLOTS = Array.from({ length: 12 }, (_, index) => `hour-${index}`);
const DAY_SLOTS = Array.from({ length: 10 }, (_, index) => `day-${index}`);

/**
The card while its data is on the way: the same frame and rows as the view it opens on, so nothing moves when the forecast lands. Shows the place as soon as it's known (with "…" while the model is still writing it).
*/
export const ForecastCardSkeleton = ({
  location,
  view = "daily",
  streaming = false,
  className,
}: {
  readonly location?: string;
  readonly view?: ForecastView;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "block", className)}>
    <span className="sr-only">
      {location ? `Loading the forecast for ${location}` : "Loading a forecast"}
    </span>
    <div aria-hidden className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col">
          {location ? (
            <p className={cn(TYPE_TITLE, "truncate")} style={SEMIBOLD}>
              {location}
              {streaming ? <span className={MUTED}>…</span> : null}
            </p>
          ) : (
            <div className="flex h-5.5 items-center">
              <Bar className="h-4 w-28" />
            </div>
          )}
          <div className="flex h-4 items-center">
            <Bar className="h-3 w-36" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Bar className="size-6 rounded-full" />
          <div className="flex flex-col items-end">
            <div className="flex h-5.5 items-center">
              <Bar className="h-4 w-10" />
            </div>
            <div className="flex h-4 items-center">
              <Bar className="h-3 w-14" />
            </div>
          </div>
        </div>
      </div>
      {view === "hourly" ? (
        <div className="grid grid-cols-6 gap-y-4">
          {HOUR_SLOTS.map((key) => (
            <div key={key} className="flex flex-col items-center gap-1">
              <Bar className="my-0.5 h-3 w-8" />
              <Bar className="size-7 rounded-full" />
              <Bar className="my-0.5 h-4 w-7" />
              <div className="h-4" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col">
          {DAY_SLOTS.map((key) => (
            <div key={key} className={cn(DAY_ROW, "h-8")}>
              <Bar className="h-3.5 w-9" />
              <Bar className="size-5 rounded-full" />
              <div />
              <Bar className="ml-auto h-3.5 w-6" />
              <Bar className="h-1 rounded-full" />
              <Bar className="ml-auto h-3.5 w-6" />
            </div>
          ))}
        </div>
      )}
      <Bar className="h-6 w-32 rounded-lg" />
    </div>
  </output>
);

export const ForecastCard = ({
  state,
  location,
  data,
  view = "daily",
  error,
  className,
}: ForecastCardProperties) => {
  if (state === "ready" && data) {
    return (
      <ForecastReady data={data} initialView={view} className={className} />
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <ForecastError location={location} message={error} />
      </div>
    );
  }
  return (
    <ForecastCardSkeleton
      location={location}
      view={view}
      streaming={state === "streaming"}
      className={className}
    />
  );
};
