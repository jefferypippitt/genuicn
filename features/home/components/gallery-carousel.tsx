"use client";

// eslint-disable-next-line react-doctor/use-lazy-motion -- the app imports motion directly everywhere, so LazyMotion here would save nothing
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useState } from "react";
import { CarouselDots } from "@/components/ui/carousel-dots";
import { AreaChartCard } from "@/features/area-chart/components/area-chart-card";
import { CryptoCard } from "@/features/crypto/components/crypto-card";
import { BoardingPassCard } from "@/features/flights/components/boarding-pass-card";
import GalleryQuote from "@/features/home/components/gallery-quote";
import {
  GALLERY_AREA_CHART,
  GALLERY_BITCOIN,
  GALLERY_BOARDING_PASS,
  GALLERY_SCOREBOARD,
  GALLERY_WEATHER,
} from "@/features/home/gallery-snapshot";
import ScoreboardCard from "@/features/scoreboard/components/scoreboard-card";
import { WeatherCard } from "@/features/weather/components/weather-card";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
How long each card stays up before the next: long enough to read one.
*/
const SLIDE_MS = 5000;

const SLIDE_WIDTH = {
  scoreboard: "max-w-[500px]",
  ticket: "max-w-2xl",
  tile: "max-w-sm",
} as const;

/**
The shipped cards, in nav order, each in the one version the gallery shows.
*/
const SLIDES: readonly {
  href: string;
  label: string;
  card: ReactNode;
  /**
  Omitted, the slide is a tile.
  */
  width?: keyof typeof SLIDE_WIDTH;
}[] = [
  { card: <GalleryQuote />, href: "/docs/quote", label: "Quote" },
  {
    card: <CryptoCard state="ready" data={GALLERY_BITCOIN} />,
    href: "/docs/crypto",
    label: "Crypto",
  },
  {
    card: <ScoreboardCard state="ready" data={GALLERY_SCOREBOARD} />,
    href: "/docs/scoreboard",
    label: "NBA scoreboard",
    width: "scoreboard",
  },
  {
    card: <WeatherCard state="ready" data={GALLERY_WEATHER} />,
    href: "/docs/weather",
    label: "Weather",
  },
  {
    card: <BoardingPassCard state="ready" data={GALLERY_BOARDING_PASS} />,
    href: "/docs/flights",
    label: "Flights",
    width: "ticket",
  },
  {
    card: (
      <AreaChartCard state="ready" data={GALLERY_AREA_CHART} showAsOf={false} />
    ),
    href: "/docs/area-chart",
    label: "Area Chart",
  },
];

/**
The home page's gallery: one card at a time on a single stage, changing on its own. The dots show which card is up and fill while it plays; the stage pauses while the pointer or focus is in it, so a chart can be read without the card moving away. Every card stays mounted and crossfades in place, so the stage never changes size.
*/
export default function GalleryCarousel() {
  const [current, setCurrent] = useState(0);
  const [isHeld, setIsHeld] = useState(false);
  const isReduced = useReducedMotion();
  const shown = SLIDES[current];

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions -- pointer and focus here only pause the autoplay; the dots and links are the controls
    <section
      aria-roledescription="carousel"
      aria-label="Cards"
      onPointerEnter={() => setIsHeld(true)}
      onPointerLeave={() => setIsHeld(false)}
      onFocus={() => setIsHeld(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsHeld(false);
        }
      }}
      className="border-border flex flex-col items-center gap-6 rounded-xl border-2 border-dotted px-4 py-10"
    >
      <div className="grid w-full place-items-center">
        {SLIDES.map((slide, index) => {
          const isShown = index === current;
          return (
            <motion.div
              key={slide.href}
              inert={!isShown}
              aria-hidden={!isShown}
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${SLIDES.length}: ${slide.label}`}
              initial={false}
              animate={{
                opacity: isShown ? 1 : 0,
                y: isShown || isReduced ? 0 : 8,
              }}
              transition={isShown ? spring.slow : spring.slow.exit}
              className={cn(
                "w-full [grid-area:1/1]",
                SLIDE_WIDTH[slide.width ?? "tile"],
                !isShown && "pointer-events-none"
              )}
            >
              {slide.card}
            </motion.div>
          );
        })}
      </div>
      <div className="flex flex-col items-center gap-3">
        <Link
          href={shown.href}
          className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        >
          {shown.label}
        </Link>
        <CarouselDots
          count={SLIDES.length}
          value={current}
          onValueChange={setCurrent}
          autoplay={{ duration: SLIDE_MS, paused: isHeld }}
          getLabel={(index) => `Show the ${SLIDES[index].label} card`}
        />
      </div>
    </section>
  );
}
