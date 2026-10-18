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
The Slider is read-only here: it shows the chance and takes no input.
*/
function ignoreChange() {
  // Presses and arrow keys are stopped before the Slider sees them, so this never runs; Slider requires the handler.
}

/**
The keys the Slider would move its thumb with.
*/
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

/**
Stops a press or drag before it reaches the Slider, so the thumb can't move.
*/
function blockPress(event: PointerEvent<HTMLDivElement>) {
  event.preventDefault();
  event.stopPropagation();
}

/**
Stops the arrow keys and their kin, so a focused thumb can't move either.
*/
function blockMoveKeys(event: KeyboardEvent<HTMLDivElement>) {
  if (!MOVE_KEYS.has(event.key)) {
    return;
  }
  event.preventDefault();
  event.stopPropagation();
}

/**
Stops the pointer's movement from reaching the Slider, which would otherwise draw its preview of a change from the thumb to the cursor. Hovering still shows the percent over the thumb: that runs on pointer enter and leave.
*/
function blockPreview(event: MouseEvent<HTMLDivElement>) {
  event.stopPropagation();
}

const STEP_DOTS_EVERY = 10;

/**
The team's color, set on its row as --team, and the bar's shade of it, --team-bar: the color as it is on a light card, lighter on a dark one, or a black team's bar would vanish.
*/
const TEAM_SHADES =
  "[--team-bar:var(--team)] dark:[--team-bar:color-mix(in_oklab,var(--team)_60%,white)]";

/**
One of the logo's two images: the light one, or the one ESPN draws for dark backgrounds. The theme hides the other.
*/
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
          "flex size-10 shrink-0 items-center justify-center text-xs font-semibold"
        )}
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
One team: logo, then its name over Fluid's Slider filled to its chance, then what a win pays back.

The Slider is the steps design, read-only: a dot every 10% along the track, the fill in the team's color, and its white thumb, which shows the percent in a bubble while hovered. It isn't disabled, since a disabled slider ignores hover; instead the wrapper stops presses, drags and arrow keys before they reach it, so the thumb never moves. It moves on its own springs, so a live game's swings glide.
*/
const TeamRow = ({ team }: { readonly team: WinProbabilityTeam }) => (
  <li
    className={cn(TEAM_SHADES, "flex items-center gap-3")}
    style={{ "--team": team.color } as CSSProperties}
  >
    <TeamLogo team={team} />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <p className="truncate text-base">{team.name}</p>
      {/* -mt-3 takes back most of the room tooltip mode leaves above the track: the bubble floats over the name only while hovered. */}
      <div
        className="-mt-3"
        onPointerDownCapture={blockPress}
        onKeyDownCapture={blockMoveKeys}
        onMouseMoveCapture={blockPreview}
      >
        <Slider
          value={team.probability}
          onChange={ignoreChange}
          min={0}
          max={100}
          step={STEP_DOTS_EVERY}
          showSteps
          valuePosition="tooltip"
          formatValue={formatPercent}
          label={`${team.name}'s chance of winning`}
          fillStyle={{ backgroundColor: "var(--team-bar)" }}
        />
      </div>
    </div>
    <p className={cn(MUTED, "w-11 shrink-0 text-right text-sm tabular-nums")}>
      {formatMultiplier(team.probability)}
    </p>
  </li>
);

const Header = ({ data }: { readonly data: WinProbabilityData }) => (
  <header className="flex items-center justify-between gap-3 text-sm">
    <p className="min-w-0 truncate">
      <span className="text-blue-600 dark:text-blue-400">NBA</span>
      <span className={MUTED}> · {gameDayLabel(data)}</span>
    </p>
    <p className={cn(MUTED, "shrink-0 tabular-nums")}>{data.season}</p>
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
    <p className="text-sm font-semibold">
      {team
        ? `Couldn't load the ${team} game's win probability`
        : "Couldn't load the win probability"}
    </p>
    <p className={cn(MUTED, "text-xs")}>{message}</p>
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
          <div className="flex min-w-0 flex-1 flex-col gap-2">
            {index === 0 && team ? (
              <p className="truncate text-base">
                {team}
                {streaming ? <span className={MUTED}>…</span> : null}
              </p>
            ) : (
              <div className="flex h-6 items-center">
                <Bar className="h-4 w-36" />
              </div>
            )}
            <Bar className="h-1.5 w-full rounded-full" />
          </div>
          <Bar className="h-3.5 w-9" />
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
