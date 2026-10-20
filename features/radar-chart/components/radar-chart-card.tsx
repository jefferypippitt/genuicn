"use client";

import { useId, useState } from "react";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { CHART_THEMES } from "@/lib/chart-themes";
import { cn } from "@/lib/utils";
import {
  formatRadarValue,
  radarCeiling,
  summarizeRadarChart,
} from "@/features/radar-chart/radar-chart-schema";
import type { RadarChartData } from "@/features/radar-chart/radar-chart-schema";

export type RadarChartCardState = "streaming" | "loading" | "ready" | "error";

export interface RadarChartCardProperties {
  readonly state: RadarChartCardState;
  /**
  The topic from the tool input, shown before the data arrives.
  */
  readonly topic?: string;
  readonly data?: RadarChartData;
  readonly error?: string;
  /**
  Shows when the figures were looked up. Turn it off for saved data, where the time is the save date, not the reader's now.
  */
  readonly showAsOf?: boolean;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-md`;

const AS_OF_FORMAT = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  // Fixed, so the server render and the browser agree on the date.
  timeZone: "UTC",
  year: "numeric",
});

function formatAsOf(time: number) {
  return AS_OF_FORMAT.format(time);
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/\s+/u)
    .map((word) => (word ? word.charAt(0).toUpperCase() + word.slice(1) : word))
    .join(" ");
}

/**
The web in chart units: the center, and the radius of its outer ring. The labels sit outside it, so it leaves room round the edge.
*/
const VIEW = 200;
const CENTER = VIEW / 2;
const RADIUS = 72;
const LABEL_RADIUS = RADIUS + 10;

/**
The rings drawn inside the web, as fractions of the outer one.
*/
const RINGS = [0.25, 0.5, 0.75, 1] as const;
const HATCH_GAP = 4;

/**
How each subject's shape is drawn. The first is the subject of the question, in the card's own teal (every chart card has its own color) with hatching; the others are outlines in ink, dashed and dotted like a printed chart, so they stay apart without more colors.
*/
const SERIES_STYLES = [
  { dash: null, tone: CHART_THEMES.radar.solid },
  { dash: "5 3", tone: "text-foreground/75" },
  { dash: "1 3.5", tone: "text-muted-foreground" },
] as const;

/**
How long each subject's shape waits after the one before it to grow out of the center.
*/
const SERIES_STAGGER_MS = 160;

function angleOf(index: number, count: number) {
  return -Math.PI / 2 + (index / count) * Math.PI * 2;
}

function pointAt(index: number, count: number, radius: number) {
  const angle = angleOf(index, count);
  return [
    CENTER + Math.cos(angle) * radius,
    CENTER + Math.sin(angle) * radius,
  ] as const;
}

function polygon(radii: readonly number[]) {
  return radii
    .map((radius, index) => pointAt(index, radii.length, radius).join(","))
    .join(" ");
}

/**
How a label hangs off its spoke's end: centered over the top and bottom spokes, pushed out to the side on the others, so no label crosses the web.
*/
function labelPlacement(index: number, count: number) {
  const angle = angleOf(index, count);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const SIDEWAYS = 0.2;
  const UPRIGHT = 0.5;
  return cn(
    Math.abs(cos) < SIDEWAYS && "-translate-x-1/2 items-center text-center",
    cos >= SIDEWAYS && "items-start text-left",
    cos <= -SIDEWAYS && "-translate-x-full items-end text-right",
    sin < -UPRIGHT && "-translate-y-full",
    Math.abs(sin) <= UPRIGHT && "-translate-y-1/2"
  );
}

function formatAxisValue(
  data: RadarChartData,
  seriesIndex: number,
  axisIndex: number
) {
  const value = data.series[seriesIndex]?.values[axisIndex];
  return value === null || value === undefined
    ? "—"
    : formatRadarValue(value, data.scale);
}

const SeriesShape = ({
  data,
  seriesIndex,
  ceiling,
  isDimmed,
  hatchId,
}: {
  readonly data: RadarChartData;
  readonly seriesIndex: number;
  readonly ceiling: number;
  readonly isDimmed: boolean;
  readonly hatchId: string;
}) => {
  const series = data.series[seriesIndex];
  const style = SERIES_STYLES[seriesIndex] ?? SERIES_STYLES[0];
  const count = data.axes.length;
  const radii = data.axes.map(
    (_, index) =>
      (Math.min(series.values[index] ?? 0, ceiling) / ceiling) * RADIUS
  );
  const shape = polygon(radii);
  const isLead = seriesIndex === 0;
  return (
    <g
      className={cn(
        "animate-in fade-in zoom-in-0 fill-mode-both origin-center transition-opacity duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:animate-none",
        style.tone,
        isDimmed && "opacity-20"
      )}
      style={{ animationDelay: `${seriesIndex * SERIES_STAGGER_MS}ms` }}
    >
      {isLead ? (
        <>
          <polygon points={shape} fill="currentColor" fillOpacity={0.1} />
          <polygon points={shape} fill={`url(#${hatchId})`} opacity={0.5} />
        </>
      ) : (
        <polygon points={shape} fill="currentColor" fillOpacity={0.04} />
      )}
      <polygon
        points={shape}
        fill="none"
        stroke="currentColor"
        strokeWidth={isLead ? 2 : 1.5}
        strokeDasharray={style.dash ?? undefined}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {radii.map((radius, index) => {
        if (series.values[index] === null) {
          return null;
        }
        const [x, y] = pointAt(index, count, radius);
        return (
          <circle
            // One dot per axis, in the axes' fixed order.
            key={data.axes[index]}
            cx={x}
            cy={y}
            r={isLead ? 3 : 2.25}
            fill="currentColor"
            className="stroke-background"
            strokeWidth={1.5}
          />
        );
      })}
    </g>
  );
};

const Web = ({
  data,
  activeSeries,
}: {
  readonly data: RadarChartData;
  readonly activeSeries: number | null;
}) => {
  const hatchId = useId();
  const [activeAxis, setActiveAxis] = useState<number | null>(null);
  const ceiling = radarCeiling(data);
  const count = data.axes.length;
  const isSingle = data.series.length === 1;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-64">
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="size-full overflow-visible"
      >
        <defs>
          {/* A pattern takes its color from where it is defined, not from the
              shape that uses it, so it carries the lead subject's color. */}
          <pattern
            id={hatchId}
            className={SERIES_STYLES[0].tone}
            width={HATCH_GAP}
            height={HATCH_GAP}
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(45)"
          >
            <line
              x1={0}
              y1={0}
              x2={0}
              y2={HATCH_GAP}
              stroke="currentColor"
              strokeWidth={1}
            />
          </pattern>
        </defs>
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon(data.axes.map(() => ring * RADIUS))}
            fill="none"
            className={ring === 1 ? "stroke-foreground/25" : "stroke-border"}
            strokeDasharray={ring === 1 ? undefined : "2 3"}
          />
        ))}
        {data.axes.map((axis, index) => {
          const [x, y] = pointAt(index, count, RADIUS);
          return (
            <line
              key={axis}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              className={cn(
                "transition-colors duration-200",
                activeAxis === index ? "stroke-foreground/60" : "stroke-border"
              )}
            />
          );
        })}
        {data.series.map((series, seriesIndex) => (
          <SeriesShape
            key={series.name}
            data={data}
            seriesIndex={seriesIndex}
            ceiling={ceiling}
            hatchId={hatchId}
            isDimmed={activeSeries !== null && activeSeries !== seriesIndex}
          />
        ))}
      </svg>

      {/* The scale up the top spoke: half and full. */}
      {[0.5, 1].map((ring) => (
        <span
          key={ring}
          aria-hidden
          className="text-muted-foreground bg-background pointer-events-none absolute translate-x-1.5 -translate-y-1/2 rounded-[2px] px-0.5 font-mono text-[10px] leading-3 tabular-nums"
          style={{
            left: "50%",
            top: `${((CENTER - ring * RADIUS) / VIEW) * 100}%`,
          }}
        >
          {formatRadarValue(ring * ceiling, data.scale)}
        </span>
      ))}

      {data.axes.map((axis, index) => {
        const [x, y] = pointAt(index, count, LABEL_RADIUS);
        const isTop = y < CENTER;
        return (
          <div
            key={axis}
            aria-hidden
            className={cn(
              "group/axis absolute flex flex-col",
              labelPlacement(index, count)
            )}
            style={{
              left: `${(x / VIEW) * 100}%`,
              top: `${(y / VIEW) * 100}%`,
            }}
            onMouseEnter={() => setActiveAxis(index)}
            onMouseLeave={() => setActiveAxis(null)}
          >
            <span className="text-muted-foreground group-hover/axis:text-foreground max-w-24 truncate text-xs leading-4 transition-colors">
              {axis}
            </span>
            {isSingle ? (
              <span className="font-mono text-xs leading-4 font-medium tabular-nums">
                {formatAxisValue(data, 0, index)}
              </span>
            ) : (
              <span
                className={cn(
                  "bg-popover text-popover-foreground pointer-events-none absolute left-1/2 z-10 hidden min-w-max -translate-x-1/2 flex-col gap-0.5 rounded-sm border px-2 py-1 text-xs shadow-sm group-hover/axis:flex",
                  isTop ? "bottom-full mb-1" : "top-full mt-1"
                )}
              >
                {data.series.map((series, seriesIndex) => (
                  <span key={series.name} className="flex items-center gap-2">
                    <span
                      className={cn(
                        "size-1.5 rounded-full bg-current",
                        SERIES_STYLES[seriesIndex]?.tone
                      )}
                    />
                    <span className="text-muted-foreground">{series.name}</span>
                    <span className="ml-auto pl-2 font-mono font-semibold tabular-nums">
                      {formatAxisValue(data, seriesIndex, index)}
                    </span>
                  </span>
                ))}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
The key: each subject with a sample of its line. Hovering one brings its shape forward.
*/
const Legend = ({
  data,
  onActive,
}: {
  readonly data: RadarChartData;
  readonly onActive: (index: number | null) => void;
}) => (
  <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
    {data.series.map((series, index) => {
      const style = SERIES_STYLES[index] ?? SERIES_STYLES[0];
      return (
        <li key={series.name}>
          <button
            type="button"
            className="focus-visible:ring-ring flex h-5 cursor-default items-center gap-1.5 rounded-sm text-xs outline-none focus-visible:ring-2"
            onMouseEnter={() => onActive(index)}
            onMouseLeave={() => onActive(null)}
            onFocus={() => onActive(index)}
            onBlur={() => onActive(null)}
          >
            <svg
              aria-hidden
              viewBox="0 0 16 4"
              className={cn("h-1 w-4", style.tone)}
            >
              <line
                x1={1}
                y1={2}
                x2={15}
                y2={2}
                stroke="currentColor"
                strokeWidth={2}
                strokeDasharray={style.dash ?? undefined}
                strokeLinecap="round"
              />
            </svg>
            <span className={cn(index === 0 && "font-semibold")}>
              {series.name}
            </span>
          </button>
        </li>
      );
    })}
  </ul>
);

/**
The figures as a table for screen readers, since the web itself is a picture.
*/
const DataTable = ({ data }: { readonly data: RadarChartData }) => (
  <table className="sr-only">
    <caption>{data.label}</caption>
    <thead>
      <tr>
        <th scope="col">Measure</th>
        {data.series.map((series) => (
          <th key={series.name} scope="col">
            {series.name}
          </th>
        ))}
      </tr>
    </thead>
    <tbody>
      {data.axes.map((axis, axisIndex) => (
        <tr key={axis}>
          <th scope="row">{axis}</th>
          {data.series.map((series, seriesIndex) => (
            <td key={series.name}>
              {formatAxisValue(data, seriesIndex, axisIndex)}
            </td>
          ))}
        </tr>
      ))}
    </tbody>
  </table>
);

const RadarChartReady = ({
  data,
  showAsOf,
}: {
  readonly data: RadarChartData;
  readonly showAsOf: boolean;
}) => {
  const [activeSeries, setActiveSeries] = useState<number | null>(null);
  return (
    <div className="flex flex-col gap-3">
      <header className="flex h-5 min-w-0 items-center">
        <p className="truncate text-sm font-semibold">
          {titleCase(data.topic)}
        </p>
      </header>

      <div className="px-10 py-6">
        <Web data={data} activeSeries={activeSeries} />
      </div>

      {data.series.length > 1 ? (
        <Legend data={data} onActive={setActiveSeries} />
      ) : null}

      <DataTable data={data} />

      <footer className="flex items-center justify-between gap-2">
        <p className="text-muted-foreground min-w-0 truncate text-xs">
          {data.label}
        </p>
        {showAsOf ? (
          <p className="text-muted-foreground shrink-0 text-xs">
            As of {formatAsOf(data.asOf)}
          </p>
        ) : null}
      </footer>
    </div>
  );
};

const RadarChartError = ({
  topic,
  message = "The figures service didn't respond. Try again in a moment.",
}: {
  readonly topic?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {topic
        ? `Couldn't load a comparison of ${titleCase(topic)}`
        : "Couldn't load the radar chart"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

const SKELETON_AXES = 6;

/**
The card while its data is on the way: an empty web the size of the ready one, so the card holds its place while the figures are found. Shows the topic as soon as it's known (with "…" while the model is still writing it).
*/
export const RadarChartCardSkeleton = ({
  topic,
  streaming = false,
  className,
}: {
  readonly topic?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "flex flex-col gap-3", className)}>
    <span className="sr-only">
      {topic ? `Loading a comparison of ${topic}` : "Loading a radar chart"}
    </span>
    <div aria-hidden className="flex h-5 items-center">
      {topic ? (
        <p className="truncate text-sm font-semibold">
          {titleCase(topic)}
          {streaming ? <span className="text-muted-foreground">…</span> : null}
        </p>
      ) : (
        <div className="bg-muted h-3.5 w-24 animate-pulse rounded" />
      )}
    </div>
    <div aria-hidden className="px-10 py-6">
      <svg
        aria-hidden
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="mx-auto aspect-square w-full max-w-64 animate-pulse"
      >
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={polygon(
              Array.from({ length: SKELETON_AXES }, () => ring * RADIUS)
            )}
            fill="none"
            className="stroke-muted"
            strokeWidth={ring === 1 ? 2 : 1}
          />
        ))}
      </svg>
    </div>
    <div aria-hidden className="flex h-4 items-center">
      <div className="bg-muted h-3 w-24 animate-pulse rounded" />
    </div>
  </output>
);

export const RadarChartCard = ({
  state,
  topic,
  data,
  error,
  showAsOf = true,
  className,
}: RadarChartCardProperties) => {
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <RadarChartError topic={topic} message={error} />
      </div>
    );
  }
  if (state !== "ready" || !data) {
    return (
      <RadarChartCardSkeleton
        topic={topic}
        streaming={state === "streaming"}
        className={className}
      />
    );
  }
  return (
    <section
      aria-label={summarizeRadarChart(data)}
      className={cn(CARD_FRAME, className)}
    >
      <RadarChartReady data={data} showAsOf={showAsOf} />
    </section>
  );
};
