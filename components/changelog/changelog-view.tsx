"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  useFluidHover,
  useRegisterFluidHoverItem,
} from "@/hooks/use-fluid-hover";
import { FluidHoverHighlight } from "@/components/fluid-hover-highlight";
import { useRightRailNode } from "@/lib/right-rail";
import { useShape } from "@/lib/shape-context";
import { useIcons } from "@/lib/icon-context";
import { useSize } from "@/lib/size-context";
import { fontWeights } from "@/lib/font-weight";
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import type { RefObject } from "react";
import type { CardEntry, Inline, Release } from "@/lib/changelog/parse";

const FOCUS_RING =
  "outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]";

export interface ReleaseView extends Release {
  /**
  The release month for people, e.g. "October 2026".
  */
  label: string;
}

export const ChangelogView = ({
  releases,
}: {
  readonly releases: ReleaseView[];
}) => {
  const sectionsReference = useRef(new Map<string, HTMLElement>());
  const activeMonth = useScrollSpy(releases, sectionsReference);
  return (
    <>
      <div className="flex flex-col">
        {releases.map((release, index) => (
          <ReleaseSection
            key={release.month}
            release={release}
            latest={index === 0}
            sectionRef={(element) => {
              if (element) {
                sectionsReference.current.set(release.month, element);
              } else {
                sectionsReference.current.delete(release.month);
              }
            }}
          />
        ))}
      </div>
      <ReleaseIndex releases={releases} activeMonth={activeMonth} />
    </>
  );
};

const ReleaseSection = ({
  release,
  latest,
  sectionRef,
}: {
  readonly release: ReleaseView;
  readonly latest: boolean;
  readonly sectionRef: (element: HTMLElement | null) => void;
}) => {
  const { type } = useSize();
  return (
    <section
      ref={sectionRef}
      id={release.month}
      aria-labelledby={`${release.month}-title`}
      className={cn(
        "scroll-mt-16",
        !latest && "border-border mt-10 border-t pt-10"
      )}
    >
      <h2
        id={`${release.month}-title`}
        className={cn(type.title, "text-foreground")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        <time dateTime={release.month}>{release.label}</time>
      </h2>
      <ul className="mt-4 flex flex-col gap-6">
        {release.cards.map((card) => (
          <Card key={card.href} card={card} />
        ))}
      </ul>
    </section>
  );
};

const Card = ({ card }: { readonly card: CardEntry }) => {
  const { type } = useSize();
  const ArrowRight = useIcons()["arrow-right"];
  return (
    <li>
      <Link
        href={card.href}
        className={cn(
          type.body,
          "group/name text-foreground inline-flex items-center gap-1.5 rounded-md",
          FOCUS_RING
        )}
      >
        <span
          aria-hidden
          className={cn(
            "mr-1 size-1.5 shrink-0 rounded-full",
            card.isNew ? "bg-[var(--info)]" : "bg-border"
          )}
        />
        {card.name}
        <ArrowRight
          size={14}
          strokeWidth={1.5}
          className="text-muted-foreground group-hover/name:text-foreground transition-[color,translate] duration-80 group-hover/name:translate-x-0.5"
        />
      </Link>
      <p className={cn(type.body, "text-muted-foreground mt-1")}>
        <InlineText inline={card.text} />
      </p>
    </li>
  );
};

const InlineText = ({ inline }: { readonly inline: Inline[] }) =>
  inline.map((part, index) =>
    part.type === "code" ? (
      <code key={index} className="font-mono">
        {part.value}
      </code>
    ) : (
      <span key={index}>{part.value}</span>
    )
  );

/**
The element the docs page scrolls in. The site shell scrolls an inner column, not the window.
*/
function scrollParent(element: HTMLElement): HTMLElement {
  for (let node = element.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll") {
      return node;
    }
  }
  return document.documentElement;
}

function useScrollSpy(
  releases: ReleaseView[],
  sectionsReference: RefObject<Map<string, HTMLElement>>
) {
  const [active, setActive] = useState<string | null>(
    releases[0]?.month ?? null
  );

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const months = releases.map((release) => release.month);
      if (months.length === 0) {
        setActive(null);
        return;
      }
      const first = sectionsReference.current.get(months[0]);
      const scroller = first ? scrollParent(first) : document.documentElement;
      // A page short enough to start at the bottom still opens on the newest release.
      const isAtBottom =
        scroller.scrollTop > 0 &&
        scroller.clientHeight + scroller.scrollTop >= scroller.scrollHeight - 2;
      if (isAtBottom) {
        setActive(months.at(-1) ?? null);
        return;
      }
      const line = window.innerHeight * 0.25;
      let current = months[0];
      for (const month of months) {
        const element = sectionsReference.current.get(month);
        if (element && element.getBoundingClientRect().top <= line) {
          current = month;
        }
      }
      setActive(current);
    };
    const schedule = () => {
      if (!frame) {
        frame = requestAnimationFrame(update);
      }
    };
    update();
    document.addEventListener("scroll", schedule, {
      capture: true,
    });
    window.addEventListener("resize", schedule);
    return () => {
      if (frame) {
        cancelAnimationFrame(frame);
      }
      document.removeEventListener("scroll", schedule, { capture: true });
      window.removeEventListener("resize", schedule);
    };
  }, [releases, sectionsReference]);

  return active;
}

const ReleaseIndex = ({
  releases,
  activeMonth,
}: {
  readonly releases: ReleaseView[];
  readonly activeMonth: string | null;
}) => {
  const node = useRightRailNode();
  return node
    ? createPortal(
        <ReleaseIndexCard releases={releases} activeMonth={activeMonth} />,
        node
      )
    : null;
};

const ReleaseIndexCard = ({
  releases,
  activeMonth,
}: {
  readonly releases: ReleaseView[];
  readonly activeMonth: string | null;
}) => {
  const shape = useShape();
  const { type } = useSize();
  const reduceMotion = useReducedMotion() ?? false;
  const containerReference = useRef<HTMLDivElement>(null);
  const hover = useFluidHover(containerReference);

  const activeIndex = releases.findIndex(
    (release) => release.month === activeMonth
  );
  const activeRect =
    activeIndex !== -1 && hover.isMeasured
      ? hover.itemRects[activeIndex]
      : null;

  return (
    <section
      aria-label="Releases"
      className={cn("bg-muted p-4", shape.container)}
    >
      <h2
        className={cn(type.title, "text-foreground py-1")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        Releases
      </h2>
      <div
        ref={containerReference}
        className="relative -mx-2 mt-2 flex flex-col"
        {...hover.handlers}
      >
        {activeRect ? (
          <motion.div
            aria-hidden
            className={cn(
              "bg-active pointer-events-none absolute top-0 left-0",
              shape.bg
            )}
            initial={false}
            animate={{
              height: activeRect.height,
              width: activeRect.width,
              x: activeRect.left,
              y: activeRect.top,
            }}
            transition={reduceMotion ? { duration: 0 } : spring.moderate}
          />
        ) : null}
        <FluidHoverHighlight hover={hover} className={shape.bg} />
        {releases.map((release, index) => (
          <IndexRow
            key={release.month}
            release={release}
            index={index}
            active={release.month === activeMonth}
            registerItem={hover.registerItem}
          />
        ))}
      </div>
    </section>
  );
};

const IndexRow = ({
  release,
  index,
  active,
  registerItem,
}: {
  readonly release: ReleaseView;
  readonly index: number;
  readonly active: boolean;
  readonly registerItem: (index: number, element: HTMLElement | null) => void;
}) => {
  const reference = useRef<HTMLAnchorElement>(null);
  useRegisterFluidHoverItem(registerItem, index, reference);
  const reduceMotion = useReducedMotion() ?? false;
  const shape = useShape();
  const { type } = useSize();

  return (
    <a
      ref={reference}
      href={`#${release.month}`}
      aria-current={active ? "location" : undefined}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(release.month)?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.search}#${release.month}`
        );
      }}
      className={cn(
        type.body,
        "relative z-10 flex h-8 items-center px-2 transition-colors duration-80",
        FOCUS_RING,
        shape.item,
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <span className="inline-grid">
        <span
          aria-hidden
          className="invisible col-start-1 row-start-1"
          style={{ fontVariationSettings: fontWeights.semibold }}
        >
          {release.label}
        </span>
        <span
          className="col-start-1 row-start-1 transition-[font-variation-settings] duration-80"
          style={{
            fontVariationSettings: active
              ? fontWeights.semibold
              : fontWeights.normal,
          }}
        >
          {release.label}
        </span>
      </span>
    </a>
  );
};
