"use client";

// eslint-disable-next-line react-doctor/use-lazy-motion -- the app imports motion directly everywhere, so LazyMotion here would save nothing
import { motion, useReducedMotion } from "motion/react";
import Link from "next/link";
import { useRef, useState } from "react";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { NAV_SECTIONS } from "@/components/sidebar-app/nav-data";
import { BoardingPassCard } from "@/features/flights/components/boarding-pass-card";
import GalleryQuote from "@/features/home/components/gallery-quote";
import {
  GALLERY_BOARDING_PASS,
  GALLERY_WEATHER,
} from "@/features/home/gallery-snapshot";
import { WeatherCard } from "@/features/weather/components/weather-card";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import { useIcons } from "@/lib/icon-context";
import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { NavItem } from "@/components/sidebar-app/nav-data";
import type { ReactNode } from "react";

const FOCUS_RING =
  "outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]";

const PREVIEW: Record<string, ReactNode> = {
  "/docs/flights": (
    <BoardingPassCard state="ready" data={GALLERY_BOARDING_PASS} />
  ),
  "/docs/quote": <GalleryQuote />,
  "/docs/weather": <WeatherCard state="ready" data={GALLERY_WEATHER} />,
};

const CARD_ITEMS = NAV_SECTIONS.flatMap((section) =>
  section.kind === "cards" ? section.items : []
);

const SHIPPED = CARD_ITEMS.filter((item): item is NavItem & { href: string } =>
  Boolean(item.href && Object.hasOwn(PREVIEW, item.href))
);

const PLANNED_COUNT = CARD_ITEMS.filter((item) => !item.href).length;

const IndexRow = ({
  item,
  index,
  registerItem,
  onShow,
}: {
  readonly item: NavItem & { href: string };
  readonly index: number;
  readonly registerItem: (index: number, element: HTMLElement | null) => void;
  readonly onShow: () => void;
}) => {
  const reference = useRef<HTMLAnchorElement>(null);
  useRegisterFluidHoverItem(registerItem, index, reference);
  const { type } = useSize();
  return (
    <li className="flex flex-col gap-3">
      <Link
        ref={reference}
        href={item.href}
        onFocus={onShow}
        className={cn(
          "relative z-10 flex flex-col gap-0.5 px-3 py-2.5",
          FOCUS_RING
        )}
      >
        <span className={cn(type.subtitle, "text-foreground")}>
          {item.label}
        </span>
        {item.description ? (
          <span className={cn(type.body, "text-muted-foreground")}>
            {item.description}
          </span>
        ) : null}
      </Link>
      <div className="px-3 pb-3 md:hidden">{PREVIEW[item.href]}</div>
    </li>
  );
};

/**
Every live card is shown as it is when it's ready, one at a time, where it never moves.
*/
const Stage = ({ shownHref }: { readonly shownHref?: string }) => {
  const shape = useShape();
  const isReduced = useReducedMotion();
  return (
    <div
      className={cn(
        "bg-muted sticky top-6 hidden min-h-[22rem] place-items-center p-4 md:grid",
        shape.container
      )}
    >
      {SHIPPED.map(({ href }) => {
        const isShown = href === shownHref;
        return (
          <motion.div
            key={href}
            inert={!isShown}
            aria-hidden={!isShown}
            initial={false}
            animate={{
              opacity: isShown ? 1 : 0,
              y: isShown || isReduced ? 0 : 6,
            }}
            transition={isShown ? spring.moderate : spring.moderate.exit}
            className={cn(
              "w-sm max-w-full [grid-area:1/1]",
              !isShown && "pointer-events-none"
            )}
          >
            {PREVIEW[href]}
          </motion.div>
        );
      })}
    </div>
  );
};

/**
The home page's gallery: an index of the live cards on the left, the card itself on a fixed stage on the right. Pointing at or focusing a row shows its card; the stage keeps the last one shown when the pointer leaves, and nothing in the list ever moves. On a phone each card sits under its row instead.
*/
export default function GalleryShowcase() {
  const shape = useShape();
  const { type } = useSize();
  const ArrowRight = useIcons()["arrow-right"];
  const isReduced = useReducedMotion() ?? false;
  const listReference = useRef<HTMLUListElement>(null);
  const hover = useFluidHover(listReference);
  const [shownIndex, setShownIndex] = useState(0);

  if (hover.activeIndex !== null && hover.activeIndex !== shownIndex) {
    setShownIndex(hover.activeIndex);
  }

  const shownRect = hover.isMeasured ? hover.itemRects[shownIndex] : null;

  return (
    <div className="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_26rem]">
      <div className="flex flex-col gap-4">
        <ul
          ref={listReference}
          aria-label="Live cards"
          className="relative -mx-3 flex flex-col"
          {...hover.handlers}
        >
          {shownRect ? (
            <motion.div
              aria-hidden
              className={cn(
                "bg-active pointer-events-none absolute top-0 left-0 hidden md:block",
                shape.bg
              )}
              style={{ height: shownRect.height, width: shownRect.width }}
              initial={false}
              animate={{ x: shownRect.left, y: shownRect.top }}
              transition={isReduced ? { duration: 0 } : spring.moderate}
            />
          ) : null}
          <FluidHoverHighlight hover={hover} className={shape.bg} />
          {SHIPPED.map((item, index) => (
            <IndexRow
              key={item.href}
              item={item}
              index={index}
              registerItem={hover.registerItem}
              onShow={() => setShownIndex(index)}
            />
          ))}
        </ul>
        {PLANNED_COUNT > 0 ? (
          <Link
            href="/roadmap"
            className={cn(
              type.body,
              "text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 transition-colors",
              FOCUS_RING
            )}
          >
            {PLANNED_COUNT} more cards on the roadmap
            <ArrowRight className="size-3.5" />
          </Link>
        ) : null}
      </div>
      <Stage shownHref={SHIPPED.at(shownIndex)?.href} />
    </div>
  );
}
