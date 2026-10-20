"use client";

import { useId, useState } from "react";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import {
  QUOTE_RANGES,
  RANGE_LABEL,
  formatPrice,
  quoteLogoUrl,
  summarizeQuote,
} from "@/features/quote/quote-schema";
import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";

export type QuoteCardState = "streaming" | "loading" | "ready" | "error";

export interface QuoteCardProps {
  readonly state: QuoteCardState;
  /**
  The ticker from the tool input, shown before the data arrives.
  */
  readonly ticker?: string;
  readonly data?: QuoteData;
  readonly error?: string;
  /**
  Loads another range when the reader switches it. Without it, the switch is hidden and the card shows the range it was given.
  */
  readonly loadRange?: (
    ticker: string,
    range: QuoteRange
  ) => Promise<QuoteData>;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-md`;

/**
Faint rules at each quarter of the chart's height, the print-chart grid the area and bar charts share.
*/
const GRIDLINES =
  "bg-[image:repeating-linear-gradient(to_bottom,var(--border)_0_1px,transparent_1px_25%)]";

/**
Spacing of the diagonal hatching under the line, in chart units.
*/
const HATCH_GAP = 4;

export const QuoteCard = ({
  state,
  ticker,
  data,
  error,
  loadRange,
  className,
}: QuoteCardProps) => {
  const [override, setOverride] = useState<QuoteData | null>(null);
  const [pendingRange, setPendingRange] = useState<QuoteRange | null>(null);
  const [rangeError, setRangeError] = useState<string | null>(null);
  const shown = override ?? data;

  const selectRange = async (range: QuoteRange) => {
    if (!(loadRange && shown) || range === shown.range) {
      return;
    }
    setPendingRange(range);
    setRangeError(null);
    try {
      setOverride(await loadRange(shown.ticker, range));
    } catch {
      setRangeError("Couldn't load that range.");
    } finally {
      setPendingRange(null);
    }
  };

  if (!(state === "error" || (state === "ready" && shown))) {
    return (
      <QuoteCardSkeleton
        ticker={ticker}
        streaming={state === "streaming"}
        className={className}
      />
    );
  }
  if (state === "error" || !shown) {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <QuoteError ticker={ticker} message={error} />
      </div>
    );
  }
  return (
    <section
      aria-label={summarizeQuote(shown)}
      className={cn(CARD_FRAME, className)}
    >
      <QuoteReady
        data={shown}
        pendingRange={pendingRange}
        rangeError={rangeError}
        onSelectRange={loadRange ? selectRange : undefined}
      />
    </section>
  );
};

const QuoteReady = ({
  data,
  pendingRange,
  rangeError,
  onSelectRange,
}: {
  readonly data: QuoteData;
  readonly pendingRange: QuoteRange | null;
  readonly rangeError: string | null;
  readonly onSelectRange?: (range: QuoteRange) => void;
}) => {
  const isUp = data.change >= 0;
  const sign = isUp ? "+" : "−";
  const tone = isUp
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400";

  return (
    <div className="flex flex-col gap-3">
      <header className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <QuoteLogo ticker={data.ticker} />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{data.ticker}</p>
            <p className="text-muted-foreground truncate text-xs">
              {data.name}
              {data.exchange ? ` · ${data.exchange}` : ""}
            </p>
          </div>
        </div>
        {data.fake ? (
          <span className="text-muted-foreground rounded-sm border px-1.5 py-0.5 text-xs tracking-wide uppercase">
            Demo data
          </span>
        ) : null}
      </header>

      <div className="flex h-9 items-baseline gap-2.5">
        <p className="font-mono text-3xl font-semibold tracking-tighter tabular-nums">
          {formatPrice(data.price, data.currency)}
        </p>
        <p
          className={cn(
            "flex items-center gap-1 font-mono text-sm font-medium tabular-nums",
            tone
          )}
        >
          <span aria-hidden className="text-xs">
            {isUp ? "▲" : "▼"}
          </span>
          {sign}
          {formatPrice(Math.abs(data.change), data.currency)} ({sign}
          {Math.abs(data.changePercent).toFixed(2)}%)
        </p>
      </div>

      <div
        className={cn(
          "transition-opacity duration-150",
          pendingRange && "opacity-40"
        )}
      >
        <Sparkline data={data} className={tone} />
      </div>

      <div className="flex items-center justify-between gap-2">
        {onSelectRange ? (
          <div
            role="group"
            aria-label="Range"
            className="bg-muted flex gap-0.5 rounded-lg p-0.5"
          >
            {QUOTE_RANGES.map((range) => {
              const isSelected = (pendingRange ?? data.range) === range;
              return (
                <button
                  key={range}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectRange(range)}
                  className={cn(
                    "focus-visible:ring-ring rounded-md px-2 py-0.5 text-xs font-medium transition-colors outline-none focus-visible:ring-2",
                    isSelected
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {RANGE_LABEL[range]}
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-muted-foreground text-xs">
            {RANGE_LABEL[data.range]}
          </span>
        )}
        <p className="text-muted-foreground text-xs" aria-live="polite">
          {rangeError}
        </p>
      </div>
    </div>
  );
};

const Sparkline = ({
  data,
  className,
}: {
  readonly data: QuoteData;
  readonly className?: string;
}) => {
  const fillId = useId();
  const hatchId = useId();
  const fadeId = useId();
  const [active, setActive] = useState<number | null>(null);
  const width = 300;
  const height = 80;
  const { points } = data;
  if (points.length < 2) {
    return <div className="h-20" />;
  }
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const coords = prices.map((price, index) => [
    (index / (prices.length - 1)) * width,
    height - 2 - ((price - min) / span) * (height - 4),
  ]);
  const line = coords
    .map(
      ([x, y], index) =>
        `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`
    )
    .join(" ");

  const last = points.length - 1;
  const indexAt = (clientX: number, box: DOMRect) =>
    Math.round(
      Math.min(Math.max((clientX - box.left) / box.width, 0), 1) * last
    );

  const point = active === null ? null : points[active];
  const xPercent = active === null ? 0 : (active / last) * 100;
  const marker = active ?? last;
  const area = `${line} L${width},${height} L0,${height} Z`;
  const labelAlign =
    xPercent < 20
      ? "translate-x-0"
      : xPercent > 80
        ? "-translate-x-full"
        : "-translate-x-1/2";

  return (
    <div
      tabIndex={0}
      role="img"
      aria-label={
        point
          ? `${formatPrice(point.price, data.currency)} at ${formatPointTime(point.time, data.range)}`
          : summarizeQuote(data)
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
        if (!(event.key === "ArrowLeft" || event.key === "ArrowRight")) {
          return;
        }

        event.preventDefault();
        const step = event.key === "ArrowLeft" ? -1 : 1;
        setActive((current) =>
          Math.min(Math.max((current ?? last) + step, 0), last)
        );
      }}
      className={cn(
        "focus-visible:ring-ring border-foreground/25 relative h-20 w-full cursor-crosshair touch-pan-y border-b outline-none focus-visible:ring-2",
        GRIDLINES,
        className
      )}
    >
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden
        className="size-full"
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
              strokeWidth={1.25}
            />
          </pattern>
          <linearGradient id={fadeId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="white" stopOpacity={0.7} />
            <stop offset="100%" stopColor="white" stopOpacity={0.1} />
          </linearGradient>
          <mask id={fillId}>
            <rect width={width} height={height} fill={`url(#${fadeId})`} />
          </mask>
        </defs>
        <g mask={`url(#${fillId})`}>
          <path d={area} fill="currentColor" fillOpacity={0.12} />
          <path d={area} fill={`url(#${hatchId})`} />
        </g>
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {/* A card-colored sheet that slides off to the right, so the line
          draws in left to right; keyed so a new range redraws. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden motion-reduce:hidden"
      >
        <div
          key={data.range}
          className="bg-background animate-out slide-out-to-right-full fill-mode-forwards size-full duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)]"
        />
      </div>

      {point ? (
        <div
          aria-hidden
          className="border-foreground/40 pointer-events-none absolute inset-y-0 border-l border-dashed"
          style={{ left: `${xPercent}%` }}
        />
      ) : null}
      <div
        aria-hidden
        className="ring-background pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2"
        style={{
          left: `${(marker / last) * 100}%`,
          top: `${(coords[marker][1] / height) * 100}%`,
        }}
      />
      {point ? (
        <div
          aria-hidden
          className={cn(
            "bg-popover text-popover-foreground pointer-events-none absolute -top-1 rounded-sm border px-2 py-1 text-xs whitespace-nowrap shadow-sm",
            labelAlign
          )}
          style={{ left: `${xPercent}%` }}
        >
          <span className="font-mono font-semibold tabular-nums">
            {formatPrice(point.price, data.currency)}
          </span>
          <span className="text-muted-foreground ml-2 tabular-nums">
            {formatPointTime(point.time, data.range)}
          </span>
        </div>
      ) : null}
    </div>
  );
};

function formatPointTime(time: number, range: QuoteRange) {
  const date = new Date(time);
  if (range === "1d") {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }
  if (range === "1w") {
    return date.toLocaleString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      weekday: "short",
    });
  }
  return date.toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    ...(range === "1y" && { year: "numeric" }),
  });
}

const QuoteLogo = ({ ticker }: { readonly ticker: string }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div
        aria-hidden
        className="bg-muted text-muted-foreground flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold"
      >
        {ticker.charAt(0)}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- next/image would force the logo host into the installer's next.config
    <img
      src={quoteLogoUrl(ticker)}
      alt=""
      width={36}
      height={36}
      loading="lazy"
      onError={() => setFailed(true)}
      className="size-9 shrink-0 rounded-lg object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
    />
  );
};

const QuoteError = ({
  ticker,
  message,
}: {
  readonly ticker?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {ticker
        ? `Couldn't load ${ticker.toUpperCase()}`
        : "Couldn't load the quote"}
    </p>
    <p className="text-muted-foreground text-xs">
      {message ?? "The quote service didn't respond. Try again in a moment."}
    </p>
  </div>
);

/** The card while its data is on the way: the same frame and rows as the
 *  ready card, so nothing moves when the quote lands. Shows the ticker as
 *  soon as it's known (with "…" while the model is still writing it). */
export const QuoteCardSkeleton = ({
  ticker,
  streaming = false,
  className,
}: {
  readonly ticker?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <div
    className={cn(CARD_FRAME, "flex flex-col gap-3", className)}
    role="status"
  >
    <span className="sr-only">
      {ticker ? `Loading the quote for ${ticker}` : "Loading a quote"}
    </span>
    <div aria-hidden className="flex items-center gap-3">
      <div className="bg-muted size-9 shrink-0 animate-pulse rounded-lg" />
      <div className="flex flex-col">
        {ticker ? (
          <p className="text-sm font-semibold">
            {ticker.toUpperCase()}
            {streaming ? (
              <span className="text-muted-foreground">…</span>
            ) : null}
          </p>
        ) : (
          <div className="flex h-5 items-center">
            <div className="bg-muted h-3.5 w-14 animate-pulse rounded" />
          </div>
        )}
        <div className="flex h-4 items-center">
          <div className="bg-muted h-3 w-32 animate-pulse rounded" />
        </div>
      </div>
    </div>
    <div aria-hidden className="flex h-9 items-center">
      <div className="bg-muted h-8 w-40 animate-pulse rounded" />
    </div>
    <div
      aria-hidden
      className={cn(
        "border-foreground/10 h-20 w-full animate-pulse border-b",
        GRIDLINES
      )}
    />
    <div aria-hidden className="bg-muted h-6 w-36 animate-pulse rounded-lg" />
  </div>
);
