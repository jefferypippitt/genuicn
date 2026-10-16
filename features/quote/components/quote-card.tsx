"use client";

import { useId, useState } from "react";
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
  /**
  Shows when the price was taken. Turn it off for saved data, where the time is the save date, not the reader's now.
  */
  readonly showAsOf?: boolean;
  readonly className?: string;
}

export const QuoteCard = ({
  state,
  ticker,
  data,
  error,
  loadRange,
  showAsOf = true,
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
  return (
    <div className={cn(CARD_FRAME, className)}>
      {state === "error" || !shown ? (
        <QuoteError ticker={ticker} message={error} />
      ) : (
        <QuoteReady
          data={shown}
          pendingRange={pendingRange}
          rangeError={rangeError}
          showAsOf={showAsOf}
          onSelectRange={loadRange ? selectRange : undefined}
        />
      )}
    </div>
  );
};

const CARD_FRAME =
  "bg-card text-card-foreground w-full max-w-sm rounded-xl border p-4";

const QuoteReady = ({
  data,
  pendingRange,
  rangeError,
  showAsOf,
  onSelectRange,
}: {
  readonly data: QuoteData;
  readonly pendingRange: QuoteRange | null;
  readonly rangeError: string | null;
  readonly showAsOf: boolean;
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
          <span className="text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px]">
            Demo data
          </span>
        ) : null}
      </header>

      <div className="flex items-baseline gap-2">
        <p className="text-2xl font-semibold tabular-nums">
          {formatPrice(data.price, data.currency)}
        </p>
        <p className={cn("text-sm font-medium tabular-nums", tone)}>
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
          {rangeError ?? (showAsOf ? `As of ${formatTime(data.asOf)}` : null)}
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
  const gradientId = useId();
  const [active, setActive] = useState<number | null>(null);
  const width = 300;
  const height = 64;
  const { points } = data;
  if (points.length < 2) {
    return <div className="h-16" />;
  }
  const prices = points.map((point) => point.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const span = max - min || 1;
  const coords = prices.map((price, index) => {
    return [
      (index / (prices.length - 1)) * width,
      height - 2 - ((price - min) / span) * (height - 4),
    ];
  });
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
  const yPercent = active === null ? 0 : (coords[active][1] / height) * 100;
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
        "focus-visible:ring-ring relative h-16 w-full cursor-crosshair touch-pan-y rounded outline-none focus-visible:ring-2",
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
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity={0.18} />
            <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
          </linearGradient>
        </defs>
        <path
          d={`${line} L${width},${height} L0,${height} Z`}
          fill={`url(#${gradientId})`}
        />
        <path
          d={line}
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>

      {point ? (
        <>
          <div
            aria-hidden
            className="bg-border pointer-events-none absolute inset-y-0 w-px"
            style={{ left: `${xPercent}%` }}
          />
          <div
            aria-hidden
            className="ring-card pointer-events-none absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-current ring-2"
            style={{ left: `${xPercent}%`, top: `${yPercent}%` }}
          />
          <div
            aria-hidden
            className={cn(
              "bg-popover text-popover-foreground pointer-events-none absolute top-0 rounded-md border px-2 py-1 text-xs whitespace-nowrap shadow-sm",
              labelAlign
            )}
            style={{ left: `${xPercent}%` }}
          >
            <span className="font-semibold tabular-nums">
              {formatPrice(point.price, data.currency)}
            </span>
            <span className="text-muted-foreground ml-2 tabular-nums">
              {formatPointTime(point.time, data.range)}
            </span>
          </div>
        </>
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

function formatTime(time: number) {
  return new Date(time).toLocaleString("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
  });
}

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
    <div aria-hidden className="bg-muted h-8 w-40 animate-pulse rounded" />
    <div aria-hidden className="bg-muted h-16 w-full animate-pulse rounded" />
    <div aria-hidden className="bg-muted h-6 w-36 animate-pulse rounded-lg" />
  </div>
);
