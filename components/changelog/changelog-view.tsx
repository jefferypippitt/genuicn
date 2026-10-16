"use client";

import Link from "next/link";
import { createPortal } from "react-dom";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
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
import { KIND_LABEL } from "@/lib/changelog/parse";
import type { RefObject } from "react";
import type {
  ChangeEntry,
  ChangeKind,
  ChangeRef,
  Inline,
  Release,
} from "@/lib/changelog/parse";

const REPO = "https://github.com/jefferypippitt/genuicn";

const KIND_DOT: Record<ChangeKind, string> = {
  breaking: "bg-[var(--destructive)]",
  new: "bg-[var(--info)]",
  updated: "bg-border",
};

const FOCUS_RING =
  "outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]";

export interface ReleaseView extends Release {
  /**
  The release day for people, e.g. "October 16, 2026".
  */
  label: string;
}

const MONTH_PAD = "4rem";
const HAIRLINE = "1px";

export const ChangelogView = ({
  releases,
}: {
  readonly releases: ReleaseView[];
}) => {
  const sectionsReference = useRef(new Map<string, HTMLElement>());
  const activeMonth = useScrollSpy(releases, sectionsReference);
  const [latest] = releases;
  const latestNew =
    latest?.groups.find((group) => group.kind === "new")?.entries ?? [];
  return (
    <>
      {latest && latestNew.length > 0 ? (
        <LatestNew release={latest} entries={latestNew} />
      ) : null}
      <div className="flex flex-col">
        {releases.map((release, index) => (
          <div key={release.released} className="relative pl-6">
            <TimelineMark first={index === 0} />
            {index > 0 && (
              <div aria-hidden style={{ paddingTop: MONTH_PAD }}>
                <div
                  className="border-border -ml-[22px] border-solid"
                  style={{ borderTopWidth: HAIRLINE }}
                />
              </div>
            )}
            <ReleaseSection
              release={release}
              divided={index > 0}
              sectionRef={(element) => {
                if (element) {
                  sectionsReference.current.set(release.released, element);
                } else {
                  sectionsReference.current.delete(release.released);
                }
              }}
            />
          </div>
        ))}
      </div>
      <ReleaseIndex releases={releases} activeMonth={activeMonth} />
    </>
  );
};

/**
What the latest release added, above the history: the same entries the sidebar marks with a dot.
*/
const LatestNew = ({
  release,
  entries,
}: {
  readonly release: ReleaseView;
  readonly entries: ChangeEntry[];
}) => {
  const { type } = useSize();
  return (
    <section aria-labelledby="latest-new-title" className="pb-16">
      <h2
        id="latest-new-title"
        className={type.title}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        New
      </h2>
      <p className={cn(type.body, "text-muted-foreground mt-2")}>
        Added in the{" "}
        <a
          href={`#${release.released}`}
          className={cn(
            "text-foreground underline-offset-2 hover:underline",
            FOCUS_RING
          )}
        >
          {release.label}
        </a>{" "}
        release.
      </p>
      <div className="mt-2 flex flex-col pl-6">
        {entries.map((entry, index) => (
          <Entry
            key={entry.href ?? entry.name}
            entry={entry}
            first={index === 0}
          />
        ))}
      </div>
      <div aria-hidden className="border-border mt-16 border-t" />
    </section>
  );
};

const TimelineMark = ({ first }: { readonly first: boolean }) => {
  const { variant } = useSize();
  const half =
    variant === "compact"
      ? "var(--lh-title-compact, 20px) / 2"
      : "var(--lh-title, 22px) / 2";
  const dotY = first
    ? `calc(${half})`
    : `calc(${MONTH_PAD} + ${HAIRLINE} + ${MONTH_PAD} + ${half})`;
  return (
    <>
      <span
        aria-hidden
        className="bg-border absolute bottom-0 left-[2px] w-px"
        style={{ top: first ? dotY : 0 }}
      />
      <span
        aria-hidden
        className="bg-foreground ring-background absolute left-0 size-[5px] -translate-y-1/2 rounded-full ring-[3px]"
        style={{ top: dotY }}
      />
    </>
  );
};

const ReleaseSection = ({
  release,
  divided,
  sectionRef,
}: {
  readonly release: ReleaseView;
  readonly divided: boolean;
  readonly sectionRef: (element: HTMLElement | null) => void;
}) => {
  const { type } = useSize();
  return (
    <section
      ref={sectionRef}
      id={release.released}
      aria-labelledby={`${release.released}-title`}
      className="scroll-mt-16"
      style={divided ? { paddingTop: MONTH_PAD } : undefined}
    >
      <MonthHeading release={release} />
      <h3
        className={cn(type.subtitle, "text-foreground mt-2")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        {release.title}
      </h3>
      {release.intro ? (
        <p className={cn(type.body, "text-muted-foreground mt-2")}>
          <InlineText inline={release.intro} />
        </p>
      ) : null}
      {release.groups.map((group) => (
        <KindGroup key={group.kind} kind={group.kind} entries={group.entries} />
      ))}
    </section>
  );
};

const MonthHeading = ({ release }: { readonly release: ReleaseView }) => {
  const { type } = useSize();
  const icons = useIcons();
  const LinkIcon = icons.link;
  const CheckIcon = icons.check;
  const [copied, setCopied] = useState(false);
  const timeoutReference = useRef<ReturnType<typeof setTimeout>>(null);
  useEffect(
    () => () => {
      if (timeoutReference.current) {
        clearTimeout(timeoutReference.current);
      }
    },
    []
  );

  const copy = async () => {
    const url = `${window.location.origin}/changelog#${release.released}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      return;
    }
    setCopied(true);
    if (timeoutReference.current) {
      clearTimeout(timeoutReference.current);
    }
    timeoutReference.current = setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group/month flex items-center gap-2">
      <h2
        id={`${release.released}-title`}
        className={cn(type.title, "text-foreground")}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        <time dateTime={release.released}>{release.label}</time>
      </h2>
      <a
        href={`#${release.released}`}
        onClick={(event) => {
          event.preventDefault();
          window.history.replaceState(
            window.history.state,
            "",
            `${window.location.search}#${release.released}`
          );
          copy();
        }}
        aria-label={`Copy link to ${release.label}`}
        className={cn(
          "text-muted-foreground hover:text-foreground relative grid size-5 place-items-center rounded-md opacity-0 transition-opacity duration-80 group-hover/month:opacity-100 focus-visible:opacity-100 max-sm:opacity-100",
          FOCUS_RING
        )}
      >
        <AnimatePresence initial={false} mode="popLayout">
          <motion.span
            key={copied ? "check" : "link"}
            className="grid place-items-center"
            initial={{ filter: "blur(4px)", opacity: 0, scale: 0.6 }}
            animate={{
              filter: "blur(0px)",
              opacity: 1,
              scale: 1,
              transition: spring.fast,
            }}
            exit={{
              filter: "blur(4px)",
              opacity: 0,
              scale: 0.6,
              transition: spring.fast.exit,
            }}
          >
            {copied ? (
              <CheckIcon size={14} strokeWidth={1.5} />
            ) : (
              <LinkIcon size={14} strokeWidth={1.5} />
            )}
          </motion.span>
        </AnimatePresence>
        <span className="sr-only" aria-live="polite">
          {copied ? "Link copied" : ""}
        </span>
      </a>
    </div>
  );
};

const KindGroup = ({
  kind,
  entries,
}: {
  readonly kind: ChangeKind;
  readonly entries: ChangeEntry[];
}) => {
  const { type } = useSize();
  return (
    <div className="pt-10">
      <div aria-hidden className="border-border border-t" />
      <h4
        className={cn(
          type.subtitle,
          "text-foreground flex items-baseline gap-2 pt-10"
        )}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        {KIND_LABEL[kind]}
        <span
          className={cn(type.caption, "text-muted-foreground tabular-nums")}
          style={{ fontVariationSettings: fontWeights.normal }}
        >
          {entries.length}
        </span>
      </h4>
      <div className="mt-2 flex flex-col">
        {entries.map((entry, index) => (
          <Entry
            key={`${entry.name}-${index}`}
            entry={entry}
            first={index === 0}
          />
        ))}
      </div>
    </div>
  );
};

const KindDot = ({ kind }: { readonly kind: ChangeKind }) => (
  <span
    aria-hidden
    className="bg-background ring-background absolute top-1/2 -left-6 size-[5px] -translate-y-1/2 rounded-full ring-[3px]"
  >
    <span className={cn("block size-full rounded-full", KIND_DOT[kind])} />
  </span>
);

const Entry = ({
  entry,
  first,
}: {
  readonly entry: ChangeEntry;
  readonly first: boolean;
}) => {
  const { type } = useSize();
  const ArrowRight = useIcons()["arrow-right"];
  return (
    <article className={cn(!first && "pt-6")}>
      <div className="flex items-center justify-between gap-4 pt-2">
        <h5 className={cn(type.body, "text-foreground relative")}>
          <KindDot kind={entry.kind} />
          {entry.href ? (
            <Link
              href={entry.href}
              className={cn(
                "group/name inline-flex items-center gap-1.5 rounded-md",
                FOCUS_RING
              )}
            >
              {entry.name}
              <ArrowRight
                size={14}
                strokeWidth={1.5}
                className="text-muted-foreground group-hover/name:text-foreground transition-[color,translate] duration-80 group-hover/name:translate-x-0.5"
              />
            </Link>
          ) : (
            entry.name
          )}
        </h5>
        {entry.refs.length > 0 && (
          <div className="-mr-1.5 flex items-center">
            {entry.refs.map((reference) => (
              <RefChip
                key={reference.type === "pr" ? reference.number : reference.sha}
                gitRef={reference}
              />
            ))}
          </div>
        )}
      </div>
      <p className={cn(type.body, "text-muted-foreground mt-1")}>
        <InlineText inline={entry.text} />
      </p>
      {entry.diff ? <Diff diff={entry.diff} /> : null}
    </article>
  );
};

const RefChip = ({ gitRef }: { readonly gitRef: ChangeRef }) => {
  const { type } = useSize();
  const isPr = gitRef.type === "pr";
  return (
    <a
      href={
        isPr ? `${REPO}/pull/${gitRef.number}` : `${REPO}/commit/${gitRef.sha}`
      }
      target="_blank"
      rel="noopener noreferrer"
      aria-label={
        isPr
          ? `Pull request ${gitRef.number} on GitHub`
          : `Commit ${gitRef.sha} on GitHub`
      }
      className={cn(
        type.caption,
        "text-muted-foreground hover:bg-active hover:text-foreground flex h-5 items-center rounded-md px-1.5 font-mono tabular-nums transition-colors duration-80",
        FOCUS_RING
      )}
    >
      {isPr ? `#${gitRef.number}` : gitRef.sha.slice(0, 7)}
    </a>
  );
};

const Diff = ({ diff }: { readonly diff: string }) => {
  const { type } = useSize();
  return (
    <pre
      className={cn(
        type.caption,
        "border-border mt-3 overflow-x-auto rounded-lg border py-2 font-mono"
      )}
    >
      <code className="flex w-max min-w-full flex-col">
        {diff.split("\n").map((line, index) => (
          <span
            key={index}
            className={cn(
              "px-3 whitespace-pre",
              line.startsWith("+") &&
                "bg-[color-mix(in_oklab,var(--success)_12%,transparent)]",
              line.startsWith("-") &&
                "bg-[color-mix(in_oklab,var(--destructive)_12%,transparent)]"
            )}
          >
            {line || " "}
          </span>
        ))}
      </code>
    </pre>
  );
};

function useScrollSpy(
  releases: ReleaseView[],
  sectionsReference: RefObject<Map<string, HTMLElement>>
) {
  const [active, setActive] = useState<string | null>(
    releases[0]?.released ?? null
  );

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const months = releases.map((release) => release.released);
      if (months.length === 0) {
        setActive(null);
        return;
      }
      const isAtBottom =
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 2;
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
    (release) => release.released === activeMonth
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
            key={release.released}
            release={release}
            index={index}
            active={release.released === activeMonth}
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
      href={`#${release.released}`}
      aria-current={active ? "location" : undefined}
      onClick={(event) => {
        event.preventDefault();
        document.getElementById(release.released)?.scrollIntoView({
          behavior: reduceMotion ? "auto" : "smooth",
          block: "start",
        });
        window.history.replaceState(
          window.history.state,
          "",
          `${window.location.search}#${release.released}`
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
