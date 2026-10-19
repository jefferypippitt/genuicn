"use client";

import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import {
  formatMultiplier,
  formatPercent,
  gameDayLabel,
  summarizeWinProbability,
} from "@/features/win-probability/win-probability-schema";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { fontWeights } from "@/lib/font-weight";
import { typeClass } from "@/lib/type-scale";
import { cn } from "@/lib/utils";
import type {
  WinProbabilityData,
  WinProbabilityTeam,
} from "@/features/win-probability/win-probability-schema";
import type {
  CSSProperties,
  KeyboardEvent,
  MouseEvent,
  PointerEvent,
} from "react";

const TYPE_SUBTITLE = typeClass("subtitle", "default");
const TYPE_CAPTION = typeClass("caption", "default");
const TYPE_MICRO = typeClass("micro", "default");

export type WinProbabilityCardState =
  "streaming" | "loading" | "ready" | "error";

export interface WinProbabilityCardProperties {
  readonly state: WinProbabilityCardState;
  /**
  The team from the props, shown before the data arrives.
  */
  readonly team?: string;
  readonly data?: WinProbabilityData;
  readonly error?: string;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-[500px]`;

const MUTED = "text-muted-foreground";

/**
The Slider requires onChange; presses are stopped before it sees them, so this never runs.
*/
function ignoreChange() {
  // Nothing to do: the card shows a chance, it doesn't take one.
}

const MOVE_KEYS = new Set([
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

function blockPress(event: PointerEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
}

function blockMoveKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (!MOVE_KEYS.has(event.key)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

function blockPreview(event: MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
}

/**
The team's color as --team, and --team-bar for the scrubber fill (via --active on the Slider: Fluid's scrubber paints with that token). Lighter on a dark card so a black team's bar still shows.
*/
const TEAM_SHADES =
  "[--team-bar:var(--team)] dark:[--team-bar:color-mix(in_oklab,var(--team)_60%,white)]";

const LogoImage = ({
  src,
  onError,
  className,
}: {
  readonly src: string;
  readonly onError: () => void;
  readonly className: string;
}) => (
  // eslint-disable-next-line @next/next/no-img-element, react-doctor/nextjs-no-img-element, jsx-a11y/no-noninteractive-element-interactions -- next/image would force the logo host into the installer's next.config; onError swaps in the letters, it is not a user interaction
  <img
    src={src}
    alt=""
    width={40}
    height={40}
    loading="lazy"
    onError={onError}
    className={cn("size-10 object-contain", className)}
  />
);

const TeamLogo = ({ team }: { readonly team: WinProbabilityTeam }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !team.logo) {
    return (
      <span
        aria-hidden
        className={cn(
          MUTED,
          TYPE_MICRO,
          "flex size-10 shrink-0 items-center justify-center"
        )}
        style={{ fontVariationSettings: fontWeights.semibold }}
      >
        {team.abbreviation}
      </span>
    );
  }
  return (
    <span aria-hidden className="flex size-10 shrink-0">
      <LogoImage
        src={team.logo}
        onError={() => setFailed(true)}
        className="dark:hidden"
      />
      <LogoImage
        src={team.logoDark ?? team.logo}
        onError={() => setFailed(true)}
        className="hidden dark:block"
      />
    </span>
  );
};

/**
The app's FluidProvider is size="compact", which would pick the other Slider engine and ignore scrubber — so size is pinned to "default". Not `disabled`: that greys the fill.
*/
const TeamRow = ({ team }: { readonly team: WinProbabilityTeam }) => (
  <li
    className={cn(TEAM_SHADES, "flex items-center gap-3")}
    style={{ "--team": team.color } as CSSProperties}
  >
    <TeamLogo team={team} />
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <p
          className={cn(TYPE_SUBTITLE, "min-w-0 truncate")}
          style={{ fontVariationSettings: fontWeights.normal }}
        >
          {team.name}
        </p>
        <p
          className={cn(
            MUTED,
            TYPE_CAPTION,
            "shrink-0 text-right tabular-nums"
          )}
          style={{ fontVariationSettings: fontWeights.normal }}
        >
          {formatMultiplier(team.probability)}
        </p>
      </div>
      <div
        onPointerDownCapture={blockPress}
        onKeyDownCapture={blockMoveKeys}
        onMouseMoveCapture={blockPreview}
      >
        <Slider
          size="default"
          variant="scrubber"
          value={team.probability}
          onChange={ignoreChange}
          min={0}
          max={100}
          formatValue={formatPercent}
          style={{ "--active": "var(--team-bar)" } as CSSProperties}
          className={cn(
            "cursor-default [&_.cursor-ew-resize]:cursor-default",
            "[&>span]:text-[length:var(--fs-subtitle,14px)] [&>span]:leading-[var(--lh-subtitle,20px)]"
          )}
        />
      </div>
    </div>
  </li>
);

const Header = ({ data }: { readonly data: WinProbabilityData }) => (
  <header
    className={cn(TYPE_CAPTION, "flex items-center justify-between gap-3")}
  >
    <p
      className="min-w-0 truncate"
      style={{ fontVariationSettings: fontWeights.normal }}
    >
      <span className="text-blue-600 dark:text-blue-400">NBA</span>
      <span className={MUTED}> · {gameDayLabel(data)}</span>
    </p>
    <p
      className={cn(MUTED, "shrink-0 tabular-nums")}
      style={{ fontVariationSettings: fontWeights.normal }}
    >
      {data.season}
    </p>
  </header>
);

const WinProbabilityError = ({
  team,
  message = "The scores service didn't respond. Try again in a moment.",
}: {
  readonly team?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p
      className={TYPE_SUBTITLE}
      style={{ fontVariationSettings: fontWeights.semibold }}
    >
      {team
        ? `Couldn't load the ${team} game's win probability`
        : "Couldn't load the win probability"}
    </p>
    <p
      className={cn(MUTED, TYPE_CAPTION)}
      style={{ fontVariationSettings: fontWeights.normal }}
    >
      {message}
    </p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

const SKELETON_ROWS = ["away", "home"] as const;

/**
The card while its data is on the way: the same header and two rows, so nothing moves when the chances land. Shows the team as soon as it's known (with "…" while the model is still writing it).
*/
export const WinProbabilityCardSkeleton = ({
  team,
  streaming = false,
  className,
}: {
  readonly team?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "block", className)}>
    <span className="sr-only">
      {team
        ? `Loading the ${team} game's win probability`
        : "Loading a win probability"}
    </span>
    <div aria-hidden className="flex flex-col gap-4">
      <div className="flex h-5 items-center justify-between">
        <Bar className="h-3.5 w-28" />
        <Bar className="h-3.5 w-14" />
      </div>
      {SKELETON_ROWS.map((side, index) => (
        <div key={side} className="flex items-center gap-3">
          <Bar className="size-10 rounded-full" />
          <div className="flex min-w-0 flex-1 flex-col gap-1.5">
            <div className="flex items-center justify-between gap-3">
              {index === 0 && team ? (
                <p
                  className={cn(TYPE_SUBTITLE, "min-w-0 truncate")}
                  style={{ fontVariationSettings: fontWeights.normal }}
                >
                  {team}
                  {streaming ? <span className={MUTED}>…</span> : null}
                </p>
              ) : (
                <Bar className="h-5 w-36" />
              )}
              <Bar className="h-3.5 w-9 shrink-0" />
            </div>
            <Bar className="h-8 w-full rounded-md" />
          </div>
        </div>
      ))}
    </div>
  </output>
);

export default function WinProbabilityCard({
  state,
  team,
  data,
  error,
  className,
}: WinProbabilityCardProperties) {
  if (state === "ready" && data) {
    return (
      <section
        aria-label={summarizeWinProbability(data)}
        className={cn(CARD_FRAME, "flex flex-col gap-4", className)}
      >
        <Header data={data} />
        <ul className="flex flex-col gap-4">
          {data.teams.map((side) => (
            <TeamRow key={side.abbreviation} team={side} />
          ))}
        </ul>
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <WinProbabilityError team={team} message={error} />
      </div>
    );
  }
  return (
    <WinProbabilityCardSkeleton
      team={team}
      streaming={state === "streaming"}
      className={className}
    />
  );
}
