"use client";

// eslint-disable-next-line react-doctor/use-lazy-motion -- the app imports motion directly everywhere, so LazyMotion here would save nothing
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  BoardingPassCard,
  BoardingPassCardSkeleton,
} from "@/features/flights/components/boarding-pass-card";
import {
  GALLERY_BOARDING_PASS,
  GALLERY_QUOTES,
  GALLERY_WEATHER,
} from "@/features/home/gallery-snapshot";
import { QuoteCard } from "@/features/quote/components/quote-card";
import { WeatherCard } from "@/features/weather/components/weather-card";
import { spring } from "@/lib/springs";
import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";
import type { ReactNode } from "react";

const showSavedRange = (_ticker: string, range: QuoteRange) =>
  Promise.resolve<QuoteData>(GALLERY_QUOTES[range]);

const quote = (range: QuoteRange) => (
  <QuoteCard
    state="ready"
    data={GALLERY_QUOTES[range]}
    loadRange={showSavedRange}
    showAsOf={false}
  />
);

const pass = <BoardingPassCard state="ready" data={GALLERY_BOARDING_PASS} />;

const weather = <WeatherCard state="ready" data={GALLERY_WEATHER} />;

interface Tile {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly card: ReactNode;
}

const QUOTE = { href: "/docs/quote", label: "Quote" } as const;
const WEATHER = { href: "/docs/weather", label: "Weather" } as const;
const FLIGHTS = { href: "/docs/flights", label: "Flights" } as const;

/**
Four columns of cards laid on a table, each set at its own height, like a print run photographed from above. Each card appears more than once, in a different range or state, so the table reads full.
*/
const COLUMNS: readonly (readonly Tile[])[] = [
  [
    { ...QUOTE, card: quote("1d"), id: "quote-1d" },
    { ...FLIGHTS, card: pass, id: "pass" },
    { ...WEATHER, card: weather, id: "weather" },
    { ...QUOTE, card: quote("1w"), id: "quote-1w-2" },
  ],
  [
    { ...WEATHER, card: weather, id: "weather-2" },
    { ...QUOTE, card: quote("1y"), id: "quote-1y" },
    {
      ...FLIGHTS,
      card: <BoardingPassCardSkeleton flight="UA 837" streaming />,
      id: "pass-streaming",
    },
    { ...WEATHER, card: weather, id: "weather-5" },
  ],
  [
    { ...FLIGHTS, card: pass, id: "pass-2" },
    { ...WEATHER, card: weather, id: "weather-3" },
    { ...QUOTE, card: quote("1m"), id: "quote-1m" },
    { ...FLIGHTS, card: pass, id: "pass-4" },
  ],
  [
    { ...QUOTE, card: quote("1w"), id: "quote-1w" },
    { ...FLIGHTS, card: pass, id: "pass-3" },
    { ...WEATHER, card: weather, id: "weather-4" },
    { ...QUOTE, card: quote("1d"), id: "quote-1d-2" },
  ],
];

const COLUMN_OFFSETS = ["-80px", "60px", "-160px", "0px"] as const;

/**
The table's natural width: four 384px cards and three 40px gaps. It scales to the stage so about three columns show across, and the stage crops the rest.
*/
const COLUMN_COUNT = 4;
const TABLE_WIDTH = COLUMN_COUNT * 384 + (COLUMN_COUNT - 1) * 40;
const VISIBLE_WIDTH = 1150;
const MAX_SCALE = 0.72;
/**
On a phone the table stops shrinking here, so fewer, bigger cards show and the stage crops the rest.
*/
const MIN_SCALE = 0.42;
const STAGE_RATIO = 0.6;
const MIN_STAGE_HEIGHT = 380;
const LIFT = -14;
const STAGGER_SECONDS = 0.045;
const DIMMED = 0.45;

/**
The one link per card kind that keyboards and screen readers get; the repeats are pointer-only.
*/
const FIRST_IDS = new Set(
  [QUOTE, WEATHER, FLIGHTS].flatMap(
    ({ href }) => COLUMNS.flat().find((tile) => tile.href === href)?.id ?? []
  )
);

const TableTile = ({
  tile,
  order,
  isShown,
  hoveredId,
  onHover,
}: {
  readonly tile: Tile;
  readonly order: number;
  readonly isShown: boolean;
  readonly hoveredId: string | null;
  readonly onHover: (id: string | null) => void;
}) => {
  const isReduced = useReducedMotion();
  const isHovered = hoveredId === tile.id;
  const isDimmed = hoveredId !== null && !isHovered;
  const isFirst = FIRST_IDS.has(tile.id);
  return (
    <div
      className="relative"
      onPointerEnter={() => onHover(tile.id)}
      onPointerLeave={() => onHover(null)}
    >
      <motion.div
        initial={{ opacity: 0, y: isReduced ? 0 : 40 }}
        animate={
          isShown
            ? {
                opacity: isDimmed ? DIMMED : 1,
                y: isHovered && !isReduced ? LIFT : 0,
              }
            : { opacity: 0, y: isReduced ? 0 : 40 }
        }
        transition={
          hoveredId === null && isShown
            ? { ...spring.slow, delay: order * STAGGER_SECONDS }
            : spring.moderate
        }
        className="rounded-xl"
      >
        <div inert className="[&>*]:max-w-none">
          {tile.card}
        </div>
      </motion.div>
      <Link
        href={tile.href}
        aria-label={`${tile.label} card`}
        tabIndex={isFirst ? undefined : -1}
        aria-hidden={isFirst ? undefined : true}
        onFocus={() => onHover(tile.id)}
        onBlur={() => onHover(null)}
        className="absolute inset-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
      />
    </div>
  );
};

/**
The home page's gallery: every live card laid out on a tilted table. Pointing at a card lifts it and dims the rest; clicking opens its docs. The table is measured and scaled to fit, and stays hidden until it is, so it never jumps.
*/
export default function GalleryFlatlay() {
  const stageReference = useRef<HTMLDivElement>(null);
  const [stageWidth, setStageWidth] = useState<number | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  useEffect(() => {
    const observer = new ResizeObserver(([entry]) => {
      setStageWidth(entry.contentRect.width);
    });
    if (stageReference.current) {
      observer.observe(stageReference.current);
    }
    return () => observer.disconnect();
  }, []);

  const scale = stageWidth
    ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, stageWidth / VISIBLE_WIDTH))
    : MAX_SCALE;
  const height = stageWidth
    ? Math.max(MIN_STAGE_HEIGHT, stageWidth * STAGE_RATIO)
    : undefined;

  return (
    <div
      ref={stageReference}
      className="bg-muted relative isolate min-h-[380px] overflow-hidden rounded-xl"
      style={{ height }}
    >
      <div
        className="absolute top-1/2 left-1/2 flex items-start gap-10"
        style={{
          transform: `translate(-50%, -50%) scale(${scale}) rotateX(32deg) rotateZ(-30deg)`,
          width: TABLE_WIDTH,
        }}
      >
        {COLUMNS.map((column, columnIndex) => (
          <div
            key={column[0].id}
            className="flex w-sm shrink-0 flex-col gap-10"
            style={{ marginTop: COLUMN_OFFSETS[columnIndex] }}
          >
            {column.map((tile, rowIndex) => (
              <TableTile
                key={tile.id}
                tile={tile}
                order={rowIndex * COLUMN_COUNT + columnIndex}
                isShown={stageWidth !== null}
                hoveredId={hoveredId}
                onHover={setHoveredId}
              />
            ))}
          </div>
        ))}
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,var(--color-muted)_100%)]"
      />
    </div>
  );
}
