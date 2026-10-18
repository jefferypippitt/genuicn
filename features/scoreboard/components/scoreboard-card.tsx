"use client";

import { useState } from "react";
import {
  gameDayLabel,
  periodLabels,
  summarizeScoreboard,
} from "@/features/scoreboard/scoreboard-schema";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type {
  ScoreboardData,
  ScoreboardTeam,
} from "@/features/scoreboard/scoreboard-schema";

export type ScoreboardCardState = "streaming" | "loading" | "ready" | "error";

export interface ScoreboardCardProperties {
  readonly state: ScoreboardCardState;
  /**
  The team from the props, shown before the data arrives.
  */
  readonly team?: string;
  readonly data?: ScoreboardData;
  readonly error?: string;
  readonly className?: string;
}

/**
One plain surface for the whole card.
*/
const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-[500px]`;

const MUTED = "text-muted-foreground";

/**
Away team, score, home team in one row. Each team is a column (logo, name, record) as wide as its name, and only truncates when the card runs out of room.
*/
const MATCHUP = "flex items-start justify-between gap-3";

const TEAM_COLUMN = "flex min-w-0 flex-col items-stretch gap-1 text-center";

/**
The score sits level with the logos.
*/
const MIDDLE = "flex h-14 shrink-0 items-center justify-center";

const PRE_GAME_SEPARATOR = " - ";

/**
ESPN writes an upcoming game as "10/17 - 7:30 PM EDT": the time goes in the middle of the card.
*/
function startTime(status: string) {
  const [, ...rest] = status.split(PRE_GAME_SEPARATOR);
  return rest.join(PRE_GAME_SEPARATOR) || status;
}

/**
"3-2" reads "(3 - 2)", as on a scoreboard.
*/
function formatRecord(record: string) {
  return `(${record.replaceAll("-", " - ")})`;
}

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
  // eslint-disable-next-line @next/next/no-img-element, react-doctor/nextjs-no-img-element, jsx-a11y/no-noninteractive-element-interactions -- next/image would force the logo host into the installer's next.config; onError swaps in the letter tile, it is not a user interaction
  <img
    src={src}
    alt=""
    width={56}
    height={56}
    loading="lazy"
    onError={onError}
    className={cn("size-14 object-contain", className)}
  />
);

const TeamLogo = ({ team }: { readonly team: ScoreboardTeam }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !team.logo) {
    return (
      <div
        aria-hidden
        className={cn(
          MUTED,
          "flex size-14 items-center justify-center text-sm font-semibold"
        )}
      >
        {team.abbreviation}
      </div>
    );
  }
  return (
    <div aria-hidden className="flex justify-center">
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
    </div>
  );
};

const LiveDot = () => (
  <span aria-hidden className="relative flex size-1.5">
    <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:animate-none" />
    <span className="relative size-1.5 rounded-full bg-red-500" />
  </span>
);

/**
The top right: "Final", the live clock, or nothing before the game (its time is in the middle).
*/
const Status = ({ data }: { readonly data: ScoreboardData }) => {
  if (data.state === "pre") {
    return data.broadcast ? (
      <p className={cn(MUTED, "shrink-0 text-sm")}>{data.broadcast}</p>
    ) : null;
  }
  return (
    <p className="flex shrink-0 items-center gap-1.5 text-sm font-semibold tabular-nums">
      {data.state === "in" ? <LiveDot /> : null}
      {data.state === "in" ? <span className="sr-only">Live, </span> : null}
      {data.status}
    </p>
  );
};

/**
The middle of the card: the score once the game starts, the start time before it.
*/
const Middle = ({ data }: { readonly data: ScoreboardData }) => {
  if (data.state === "pre") {
    return (
      <p className="text-center text-xl whitespace-nowrap tabular-nums">
        {startTime(data.status)}
      </p>
    );
  }
  return (
    <p className="flex items-center justify-center gap-3 text-[2rem] whitespace-nowrap tabular-nums">
      <span>{data.away.score}</span>
      <span aria-hidden className={MUTED}>
        -
      </span>
      <span>{data.home.score}</span>
    </p>
  );
};

const TeamName = ({ team }: { readonly team: ScoreboardTeam }) => (
  <div className="flex min-w-0 flex-col items-center gap-0.5 text-center">
    <p className="text-base text-balance">{team.name}</p>
    {team.record ? (
      <p className={cn(MUTED, "text-xs tabular-nums")}>
        {formatRecord(team.record)}
      </p>
    ) : null}
  </div>
);

const LINE_CELL = "w-9 py-1 text-right tabular-nums";

/**
The score of each quarter played so far, as on a box score: one column per period (overtimes after the fourth) and the total. A game in progress only shows the quarters started, and the current one counts up.
*/
const LineScore = ({ data }: { readonly data: ScoreboardData }) => {
  const count = Math.max(data.away.periods.length, data.home.periods.length);
  if (count === 0) {
    return null;
  }
  const labels = periodLabels(count);
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">Score by quarter</caption>
      <thead>
        <tr className={MUTED}>
          <th scope="col" className="py-1 text-left font-normal">
            Team
          </th>
          {labels.map((label) => (
            <th
              key={label}
              scope="col"
              className={cn(LINE_CELL, "font-normal")}
            >
              {label}
            </th>
          ))}
          <th scope="col" className={cn(LINE_CELL, "font-normal")}>
            T
          </th>
        </tr>
      </thead>
      <tbody>
        {[data.away, data.home].map((team) => (
          <tr key={team.abbreviation}>
            <th scope="row" className="truncate py-1 text-left font-normal">
              {team.name}
            </th>
            {labels.map((label, index) => (
              <td key={label} className={LINE_CELL}>
                {team.periods[index] ?? "–"}
              </td>
            ))}
            <td className={LINE_CELL}>{team.score ?? "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

/**
"NBA" and the day. A Finals game says "NBA Finals" and its game number instead.
*/
const Title = ({ data }: { readonly data: ScoreboardData }) => {
  const { series } = data;
  const game = series?.isFinals && series.game ? ` · Game ${series.game}` : "";
  return (
    <p className="min-w-0 truncate">
      <span className="text-blue-600 dark:text-blue-400">
        {series?.isFinals ? "NBA Finals" : "NBA"}
      </span>
      <span className={MUTED}>
        {game} · {gameDayLabel(data)}
      </span>
    </p>
  );
};

/**
The line under the score. The Finals header already says the stage and game, so a Finals game only shows the series.
*/
function stageLine(data: ScoreboardData) {
  return data.series?.isFinals ? data.series.summary : data.stage;
}

const ScoreboardReady = ({ data }: { readonly data: ScoreboardData }) => (
  <div className="flex flex-col gap-3">
    <header className="flex items-center justify-between gap-3 text-sm">
      <Title data={data} />
      <Status data={data} />
    </header>
    <div className={MATCHUP}>
      <div className={TEAM_COLUMN}>
        <TeamLogo team={data.away} />
        <TeamName team={data.away} />
      </div>
      <div className={MIDDLE}>
        <Middle data={data} />
      </div>
      <div className={TEAM_COLUMN}>
        <TeamLogo team={data.home} />
        <TeamName team={data.home} />
      </div>
    </div>
    <LineScore data={data} />
    {stageLine(data) ? (
      <p className={cn(MUTED, "text-center text-sm")}>{stageLine(data)}</p>
    ) : null}
  </div>
);

const ScoreboardError = ({
  team,
  message = "The scores service didn't respond. Try again in a moment.",
}: {
  readonly team?: string;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {team ? `Couldn't load the ${team} score` : "Couldn't load the score"}
    </p>
    <p className={cn(MUTED, "text-xs")}>{message}</p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

const SkeletonName = ({
  team,
  streaming,
}: {
  readonly team?: string;
  readonly streaming?: boolean;
}) => (
  <div className="flex min-w-0 flex-col items-center gap-0.5">
    {team ? (
      <p className="w-full truncate text-center text-base">
        {team}
        {streaming ? <span className={MUTED}>…</span> : null}
      </p>
    ) : (
      <div className="flex h-6 items-center">
        <Bar className="h-4 w-28" />
      </div>
    )}
    <div className="flex h-4 items-center">
      <Bar className="h-3 w-12" />
    </div>
  </div>
);

/**
The card while its data is on the way: the same frame and rows as the ready card, so nothing moves when the score lands. Shows the team as soon as it's known (with "…" while the model is still writing it).
*/
export const ScoreboardCardSkeleton = ({
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
      {team ? `Loading the ${team} score` : "Loading a score"}
    </span>
    <div aria-hidden className="flex flex-col gap-3">
      <div className="flex h-5 items-center justify-between">
        <Bar className="h-3.5 w-28" />
        <Bar className="h-3.5 w-10" />
      </div>
      <div className={MATCHUP}>
        <div className={TEAM_COLUMN}>
          <Bar className="size-14 rounded-full" />
          <SkeletonName team={team} streaming={streaming} />
        </div>
        <div className={MIDDLE}>
          <Bar className="h-10 w-36" />
        </div>
        <div className={TEAM_COLUMN}>
          <Bar className="size-14 rounded-full" />
          <SkeletonName />
        </div>
      </div>
    </div>
  </output>
);

export default function ScoreboardCard({
  state,
  team,
  data,
  error,
  className,
}: ScoreboardCardProperties) {
  if (state === "ready" && data) {
    return (
      <section
        aria-label={summarizeScoreboard(data)}
        className={cn(CARD_FRAME, className)}
      >
        <ScoreboardReady data={data} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <ScoreboardError team={team} message={error} />
      </div>
    );
  }
  return (
    <ScoreboardCardSkeleton
      team={team}
      streaming={state === "streaming"}
      className={className}
    />
  );
}
