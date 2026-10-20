"use client";

import { useId, useState } from "react";
import {
  CANDLE_SPAN,
  CANDLESTICK_RANGE_LABEL,
  CANDLESTICK_RANGES,
  formatAxisPrice,
  formatExchangeTime,
  formatPrice,
  spanOf,
  summarizeCandlestick,
} from "@/features/candlestick/candlestick-schema";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { fontWeights } from "@/lib/font-weight";
import { typeClass } from "@/lib/type-scale";
import { cn } from "@/lib/utils";
import type {
  Candle,
  CandlestickData,
  CandlestickRange,
} from "@/features/candlestick/candlestick-schema";

export type CandlestickCardState = "streaming" | "loading" | "ready" | "error";

export interface CandlestickCardProperties {
  readonly state: CandlestickCardState;
  /**
  The ticker from the props, shown before the data arrives.
  */
  readonly ticker?: string;
  readonly data?: CandlestickData;
  readonly error?: string;
  /**
  Loads another range when the reader switches it. Without it, the switch is hidden and the card shows the range it was given.
  */
  readonly loadRange?: (
    ticker: string,
    range: CandlestickRange
  ) => Promise<CandlestickData>;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-md`;

const TYPE_DISPLAY = typeClass("display", "default");
const TYPE_TITLE = typeClass("title", "default");
const TYPE_SUBTITLE = typeClass("subtitle", "default");
const TYPE_CAPTION = typeClass("caption", "default");
const TYPE_MICRO = typeClass("micro", "default");
const MUTED = "text-muted-foreground";

const NORMAL = { fontVariationSettings: fontWeights.normal };
const SEMIBOLD = { fontVariationSettings: fontWeights.semibold };
const BOLD = { fontVariationSettings: fontWeights.bold };

/**
Faint rules at each quarter of the chart's height, the print-chart grid the area and bar charts share.
*/
const GRIDLINES =
  "bg-[image:repeating-linear-gradient(to_bottom,var(--border)_0_1px,transparent_1px_25%)]";

/**
Spacing of the diagonal hatching inside a rising candle, in chart units. Tighter than the line cards' hatching, so even a thin candle shows a stroke or two.
*/
const HATCH_GAP = 3;

const UP = "text-emerald-600 dark:text-emerald-400";
const DOWN = "text-red-600 dark:text-red-400";

/**
The candle plot's drawing box, close to its size on screen so the hatching stays square.
*/
const CHART_WIDTH = 400;
const CHART_HEIGHT = 128;
const VOLUME_HEIGHT = 24;
/**
Room above the highest wick and below the lowest one, in chart units.
*/
const CHART_PAD = 8;
/**
How much of each candle's slot its body fills.
*/
const BODY_SHARE = 0.62;
const LABEL_EDGE_PERCENT = 22;

/**
How the time under the pointer reads for each range: the time of day while candles cover minutes or hours, the date for daily candles, the week for weekly ones.
*/
const CANDLE_TIME: Record<CandlestickRange, Intl.DateTimeFormatOptions> = {
  "1d": { hour: "numeric", minute: "2-digit" },
  "1m": { day: "numeric", month: "short", weekday: "short" },
  "1w": { hour: "numeric", minute: "2-digit", weekday: "short" },
  "1y": { day: "numeric", month: "short", year: "numeric" },
  "6m": { day: "numeric", month: "short" },
};

function formatCandleTime(data: CandlestickData, candle: Candle) {
  const label = formatExchangeTime(
    candle.time,
    data.timeZone,
    CANDLE_TIME[data.range]
  );
  return data.range === "6m" || data.range === "1y"
    ? `Week of ${label}`
    : label;
}

function labelAlignment(xPercent: number) {
  if (xPercent < LABEL_EDGE_PERCENT) {
    return "translate-x-0";
  }
  return xPercent > 100 - LABEL_EDGE_PERCENT
    ? "-translate-x-full"
    : "-translate-x-1/2";
}

function capitalize(text: string) {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

/**
The price and its change over the range, set against the ticker on the other side of the header. The ticker carries the header, so the price stays a step smaller than it does on the Quote card.
*/
const PriceBlock = ({ data }: { readonly data: CandlestickData }) => {
  const isUp = data.change >= 0;
  const sign = isUp ? "+" : "−";
  return (
    <div className="flex shrink-0 flex-col items-end">
      <p className={cn(TYPE_TITLE, "tabular-nums")} style={SEMIBOLD}>
        {formatPrice(data.price, data.currency)}
      </p>
      <p
        className={cn(
          TYPE_CAPTION,
          "flex items-center gap-1 tabular-nums",
          isUp ? UP : DOWN
        )}
        style={NORMAL}
      >
        <span aria-hidden>{isUp ? "▲" : "▼"}</span>
        <span className="sr-only">{isUp ? "Up" : "Down"}</span>
        {sign}
        {formatPrice(Math.abs(data.change), data.currency)} ({sign}
        {Math.abs(data.changePercent).toFixed(2)}%)
      </p>
    </div>
  );
};

/**
One candle: a wick from high to low, and a body from open to close. A rising body is outlined and hatched, a falling one solid, so the two read apart without their color.
*/
const CandleMark = ({
  candle,
  x,
  bodyWidth,
  yOf,
  hatch,
  isDimmed,
}: {
  readonly candle: Candle;
  readonly x: number;
  readonly bodyWidth: number;
  readonly yOf: (price: number) => number;
  readonly hatch: string;
  readonly isDimmed: boolean;
}) => {
  const isUp = candle.close >= candle.open;
  const top = yOf(Math.max(candle.open, candle.close));
  const bottom = yOf(Math.min(candle.open, candle.close));
  const height = Math.max(bottom - top, 1);
  const left = x - bodyWidth / 2;
  return (
    <g
      className={cn(
        "transition-opacity duration-150",
        isUp ? UP : DOWN,
        isDimmed && "opacity-35"
      )}
    >
      <line
        x1={x}
        x2={x}
        y1={yOf(candle.high)}
        y2={top}
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
      />
      <line
        x1={x}
        x2={x}
        y1={top + height}
        y2={yOf(candle.low)}
        stroke="currentColor"
        vectorEffect="non-scaling-stroke"
      />
      {isUp ? (
        <>
          <rect
            x={left}
            y={top}
            width={bodyWidth}
            height={height}
            fill="currentColor"
            fillOpacity={0.12}
          />
          <rect
            x={left}
            y={top}
            width={bodyWidth}
            height={height}
            fill={`url(#${hatch})`}
            stroke="currentColor"
            vectorEffect="non-scaling-stroke"
          />
        </>
      ) : (
        <rect
          x={left}
          y={top}
          width={bodyWidth}
          height={height}
          fill="currentColor"
        />
      )}
    </g>
  );
};

/**
Shares traded per candle, a quiet strip under the plot in each candle's color.
*/
const VolumeStrip = ({
  candles,
  active,
}: {
  readonly candles: readonly Candle[];
  readonly active: number | null;
}) => {
  const slot = CHART_WIDTH / candles.length;
  const most = Math.max(...candles.map((candle) => candle.volume));
  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${VOLUME_HEIGHT}`}
      preserveAspectRatio="none"
      aria-hidden
      className="h-6 w-full"
    >
      {candles.map((candle, index) => {
        const height = (candle.volume / most) * VOLUME_HEIGHT;
        return (
          <rect
            key={candle.time}
            x={slot * index + (slot * (1 - BODY_SHARE)) / 2}
            y={VOLUME_HEIGHT - height}
            width={slot * BODY_SHARE}
            height={height}
            fill="currentColor"
            className={cn(
              "transition-[fill-opacity] duration-150",
              candle.close >= candle.open ? UP : DOWN
            )}
            fillOpacity={active === index ? 0.7 : 0.3}
          />
        );
      })}
    </svg>
  );
};

/**
The candles over the chosen range, with volume under them and the range's high and low beside them. Point at a candle, drag across them, or focus the chart and use the arrow keys to read each one.
*/
const CandleChart = ({ data }: { readonly data: CandlestickData }) => {
  const hatchId = useId();
  const [active, setActive] = useState<number | null>(null);
  const { candles } = data;
  const span = spanOf(candles);
  if (!span || candles.length < 2) {
    return <div className="h-39" />;
  }

  const count = candles.length;
  const last = count - 1;
  const slot = CHART_WIDTH / count;
  const priceSpan = span.high - span.low || 1;
  const yOf = (price: number) =>
    CHART_PAD +
    ((span.high - price) / priceSpan) * (CHART_HEIGHT - CHART_PAD * 2);
  const xPercentOf = (index: number) => ((index + 0.5) / count) * 100;
  const indexAt = (clientX: number, box: DOMRect) =>
    Math.min(
      Math.max(Math.floor(((clientX - box.left) / box.width) * count), 0),
      last
    );

  const candle = active === null ? null : candles[active];
  const xPercent = active === null ? 0 : xPercentOf(active);
  const hasVolume = span.volume > 0;

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2">
      {/* eslint-disable-next-line jsx-a11y/prefer-tag-over-role -- a native range input can't follow the pointer on hover, which is how the chart is read; this keeps the slider semantics and arrow keys */}
      <div
        tabIndex={0}
        role="slider"
        aria-label={`${capitalize(CANDLE_SPAN[data.range])} candles`}
        aria-valuemin={0}
        aria-valuemax={last}
        aria-valuenow={active ?? last}
        aria-valuetext={
          candle
            ? `${formatCandleTime(data, candle)}: open ${formatPrice(candle.open, data.currency)}, high ${formatPrice(candle.high, data.currency)}, low ${formatPrice(candle.low, data.currency)}, close ${formatPrice(candle.close, data.currency)}`
            : summarizeCandlestick(data)
        }
        onPointerMove={(event) =>
          setActive(
            indexAt(event.clientX, event.currentTarget.getBoundingClientRect())
          )
        }
        onPointerDown={(event) =>
          setActive(
            indexAt(event.clientX, event.currentTarget.getBoundingClientRect())
          )
        }
        onPointerLeave={() => setActive(null)}
        onFocus={() => setActive((current) => current ?? last)}
        onBlur={() => setActive(null)}
        onKeyDown={(event) => {
          const moves: Record<string, number> = {
            ArrowLeft: (active ?? last) - 1,
            ArrowRight: (active ?? last) + 1,
            End: last,
            Home: 0,
          };
          const next = moves[event.key];
          if (next === undefined) {
            return;
          }
          event.preventDefault();
          setActive(Math.min(Math.max(next, 0), last));
        }}
        className="focus-visible:ring-ring relative cursor-crosshair touch-pan-y outline-none focus-visible:ring-2"
      >
        <div
          className={cn(
            "border-foreground/25 relative h-32 border-b",
            GRIDLINES
          )}
        >
          <svg
            viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
            preserveAspectRatio="none"
            aria-hidden
            className="size-full overflow-visible"
          >
            <defs>
              <pattern
                id={hatchId}
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
                  className={UP}
                />
              </pattern>
            </defs>
            {candles.map((item, index) => (
              <CandleMark
                key={item.time}
                candle={item}
                x={slot * (index + 0.5)}
                bodyWidth={slot * BODY_SHARE}
                yOf={yOf}
                hatch={hatchId}
                isDimmed={active !== null && active !== index}
              />
            ))}
          </svg>
        </div>
        {hasVolume ? (
          <div className="pt-1">
            <VolumeStrip candles={candles} active={active} />
          </div>
        ) : (
          <div className="h-7" />
        )}

        {/* A card-colored sheet that slides off to the right, so the candles
            draw in left to right; keyed so a new range redraws. */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
        >
          <div
            key={`${data.ticker}:${data.range}`}
            className="bg-background animate-out slide-out-to-right-full fill-mode-forwards size-full duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
          />
        </div>

        {candle ? (
          <>
            <div
              aria-hidden
              className="border-foreground/40 pointer-events-none absolute inset-y-0 border-l border-dashed"
              style={{ left: `${xPercent}%` }}
            />
            {/* On the baseline between candles and volume, clear of the
                header above. */}
            <div
              aria-hidden
              className={cn(
                TYPE_CAPTION,
                "bg-popover text-popover-foreground pointer-events-none absolute top-32 flex -translate-y-1/2 items-baseline gap-2 rounded-sm border px-2 py-1 whitespace-nowrap shadow-sm",
                labelAlignment(xPercent)
              )}
              style={{ left: `${xPercent}%` }}
            >
              <span className="tabular-nums" style={SEMIBOLD}>
                {formatPrice(candle.close, data.currency)}
              </span>
              <span className={cn(MUTED, "tabular-nums")} style={NORMAL}>
                {formatCandleTime(data, candle)}
              </span>
            </div>
          </>
        ) : null}
      </div>
      <div
        aria-hidden
        className={cn(
          MUTED,
          TYPE_MICRO,
          "flex h-32 flex-col justify-between py-0.5 text-right tabular-nums"
        )}
        style={NORMAL}
      >
        <span>{formatAxisPrice(span.high)}</span>
        <span>{formatAxisPrice(span.low)}</span>
      </div>
    </div>
  );
};

/**
The same switch the Quote and Crypto cards use, at the same size, so the finance cards sit side by side without one looking larger.
*/
const RangeSwitch = ({
  shown,
  onSelect,
}: {
  readonly shown: CandlestickRange;
  readonly onSelect: (range: CandlestickRange) => void;
}) => (
  <fieldset className="bg-muted flex min-w-0 gap-0.5 rounded-lg p-0.5">
    <legend className="sr-only">Range</legend>
    {CANDLESTICK_RANGES.map((range) => {
      const isSelected = shown === range;
      return (
        <button
          key={range}
          type="button"
          aria-pressed={isSelected}
          onClick={() => onSelect(range)}
          className={cn(
            "focus-visible:ring-ring rounded-md px-2 py-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
            isSelected
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {CANDLESTICK_RANGE_LABEL[range]}
        </button>
      );
    })}
  </fieldset>
);

const CandlestickReady = ({
  data,
  pendingRange,
  rangeError,
  onSelectRange,
}: {
  readonly data: CandlestickData;
  readonly pendingRange: CandlestickRange | null;
  readonly rangeError: string | null;
  readonly onSelectRange?: (range: CandlestickRange) => void;
}) => (
  <div className="flex flex-col gap-5">
    {/* No logo: the ticker, set large, is the card's mark. */}
    <header className="flex items-end justify-between gap-3">
      <div className="min-w-0">
        <p className={TYPE_DISPLAY} style={BOLD}>
          {data.ticker}
        </p>
        <p className={cn(MUTED, TYPE_CAPTION, "truncate")} style={NORMAL}>
          {data.name}
        </p>
      </div>
      <PriceBlock data={data} />
    </header>

    <div
      className={cn(
        "transition-opacity duration-150",
        pendingRange && "opacity-40"
      )}
    >
      <CandleChart data={data} />
    </div>

    <div className="flex items-center justify-between gap-3">
      {onSelectRange ? (
        <RangeSwitch
          shown={pendingRange ?? data.range}
          onSelect={onSelectRange}
        />
      ) : (
        <span className={cn(MUTED, TYPE_CAPTION)} style={NORMAL}>
          {CANDLESTICK_RANGE_LABEL[data.range]}
        </span>
      )}
      <p
        className={cn(MUTED, TYPE_CAPTION, "min-w-0 truncate")}
        style={NORMAL}
        aria-live="polite"
      >
        {rangeError ?? `${capitalize(CANDLE_SPAN[data.range])} candles`}
      </p>
    </div>
  </div>
);

const CandlestickError = ({
  ticker,
  message = "The chart service didn't respond. Try again in a moment.",
}: {
  readonly ticker?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className={TYPE_SUBTITLE} style={SEMIBOLD}>
      {ticker
        ? `Couldn't load ${ticker.toUpperCase()}`
        : "Couldn't load the chart"}
    </p>
    <p className={cn(MUTED, TYPE_CAPTION)} style={NORMAL}>
      {message}
    </p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

/**
The card while its data is on the way: the same frame and rows as the ready card, so nothing moves when the candles land. Shows the ticker as soon as it's known (with "…" while the model is still writing it).
*/
export const CandlestickCardSkeleton = ({
  ticker,
  streaming = false,
  className,
}: {
  readonly ticker?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "block", className)}>
    <span className="sr-only">
      {ticker
        ? `Loading the candlestick chart for ${ticker}`
        : "Loading a candlestick chart"}
    </span>
    <div aria-hidden className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-3">
        <div className="flex flex-col">
          {ticker ? (
            <p className={TYPE_DISPLAY} style={BOLD}>
              {ticker.toUpperCase()}
              {streaming ? <span className={MUTED}>…</span> : null}
            </p>
          ) : (
            <div className="flex h-8.5 items-center">
              <Bar className="h-7 w-24" />
            </div>
          )}
          <div className="flex h-4 items-center">
            <Bar className="h-3 w-32" />
          </div>
        </div>
        <div className="flex flex-col items-end">
          <div className="flex h-5.5 items-center">
            <Bar className="h-4 w-20" />
          </div>
          <div className="flex h-4 items-center">
            <Bar className="h-3 w-24" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-2">
        <div>
          <div
            className={cn(
              "border-foreground/10 h-32 animate-pulse border-b",
              GRIDLINES
            )}
          />
          <div className="h-7" />
        </div>
        <div className="w-10" />
      </div>
      <Bar className="h-6 w-44 rounded-lg" />
    </div>
  </output>
);

export const CandlestickCard = ({
  state,
  ticker,
  data,
  error,
  loadRange,
  className,
}: CandlestickCardProperties) => {
  const [override, setOverride] = useState<CandlestickData | null>(null);
  const [pendingRange, setPendingRange] = useState<CandlestickRange | null>(
    null
  );
  const [rangeError, setRangeError] = useState<string | null>(null);
  const shown = override ?? data;

  const selectRange = async (range: CandlestickRange) => {
    if (!(loadRange && shown) || range === shown.range) {
      return;
    }
    setPendingRange(range);
    setRangeError(null);
    try {
      setOverride(await loadRange(shown.ticker, range));
    } catch {
      setRangeError("Couldn't load that range.");
    }
    setPendingRange(null);
  };

  if (state === "ready" && shown) {
    return (
      <section
        aria-label={summarizeCandlestick(shown)}
        className={cn(CARD_FRAME, className)}
      >
        <CandlestickReady
          data={shown}
          pendingRange={pendingRange}
          rangeError={rangeError}
          onSelectRange={loadRange ? selectRange : undefined}
        />
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <CandlestickError ticker={ticker} message={error} />
      </div>
    );
  }
  return (
    <CandlestickCardSkeleton
      ticker={ticker}
      streaming={state === "streaming"}
      className={className}
    />
  );
};
