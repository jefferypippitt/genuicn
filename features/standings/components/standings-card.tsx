"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  CONFERENCE_NAMES,
  summarizeStandings,
} from "@/features/standings/standings-schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type {
  Conference,
  StandingsData,
  StandingsTeam,
} from "@/features/standings/standings-schema";

export type StandingsCardState = "streaming" | "loading" | "ready" | "error";

export interface StandingsCardProperties {
  readonly state: StandingsCardState;
  /**
  The conference from the props, shown before the data arrives.
  */
  readonly conference?: Conference;
  readonly data?: StandingsData;
  readonly error?: string;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-[720px]`;
const HEADER_ROW_HEIGHT = "h-[37px]";
const TEAM_ROW_HEIGHT = "h-[37px]";

const MUTED = "text-muted-foreground";

const STAT = "text-center whitespace-nowrap tabular-nums";

const COLUMNS = [
  { key: "wins", label: "W", title: "Wins" },
  { key: "losses", label: "L", title: "Losses" },
  { key: "winPercent", label: "Pct", title: "Win percentage" },
  { key: "gamesBehind", label: "GB", title: "Games behind" },
  { key: "conference", label: "Conf", title: "Conference record" },
  { key: "home", label: "Home", title: "Home record" },
  { key: "away", label: "Away", title: "Away record" },
  { key: "lastTen", label: "L10", title: "Last ten games" },
  { key: "streak", label: "Strk", title: "Streak" },
] as const satisfies readonly {
  key: keyof StandingsTeam;
  label: string;
  title: string;
}[];

const TEAMS_PER_CONFERENCE = 15;

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
    width={24}
    height={24}
    loading="lazy"
    onError={onError}
    className={cn("size-6 object-contain", className)}
  />
);

const TeamLogo = ({ team }: { readonly team: StandingsTeam }) => {
  const [failed, setFailed] = useState(false);
  if (failed || !team.logo) {
    return (
      <span
        aria-hidden
        className="flex size-6 shrink-0 items-center justify-center text-[10px]"
      >
        {team.abbreviation}
      </span>
    );
  }
  return (
    <span aria-hidden className="flex size-6 shrink-0">
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

const Header = ({
  conference,
  season,
}: {
  readonly conference: Conference;
  readonly season?: string;
}) => (
  <header className="flex items-center justify-between gap-3 text-sm">
    <p className="min-w-0 truncate">
      <span className="text-blue-600 dark:text-blue-400">NBA</span>
      <span className={MUTED}> · {CONFERENCE_NAMES[conference]}</span>
    </p>
    {season ? (
      <p className={cn(MUTED, "shrink-0 tabular-nums")}>{season}</p>
    ) : null}
  </header>
);

const StandingsTable = ({ data }: { readonly data: StandingsData }) => (
  <ScrollArea orientation="horizontal" className="-mx-1">
    <Table className="min-w-[560px] text-sm">
      <caption className="sr-only">
        {CONFERENCE_NAMES[data.conference]} standings, {data.season}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Team</TableHead>
          {COLUMNS.map((column) => (
            <TableHead key={column.key} scope="col" className={STAT}>
              <abbr title={column.title} className="no-underline">
                {column.label}
              </abbr>
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.teams.map((team, index) => (
          <TableRow key={team.abbreviation} index={index}>
            <TableCell>
              <span className="flex min-w-0 items-center gap-3">
                <span className="w-5 shrink-0 text-right tabular-nums">
                  {team.rank}
                </span>
                <TeamLogo team={team} />
                <span className="truncate whitespace-nowrap">
                  {team.shortName}
                </span>
              </span>
            </TableCell>
            {COLUMNS.map((column) => (
              <TableCell key={column.key} className={STAT}>
                {team[column.key]}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

const StandingsError = ({
  conference,
  message = "The standings service didn't respond. Try again in a moment.",
}: {
  readonly conference?: Conference;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {conference
        ? `Couldn't load the ${CONFERENCE_NAMES[conference]} standings`
        : "Couldn't load the standings"}
    </p>
    <p className={cn(MUTED, "text-xs")}>{message}</p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

const SKELETON_ROWS = Array.from(
  { length: TEAMS_PER_CONFERENCE },
  (_, index) => `row-${index + 1}`
);

/**
The card while its data is on the way: the same header and one row per team at the table's height, so nothing moves when the standings land.
*/
export const StandingsCardSkeleton = ({
  conference,
  className,
}: {
  readonly conference?: Conference;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "block", className)}>
    <span className="sr-only">
      {conference
        ? `Loading the ${CONFERENCE_NAMES[conference]} standings`
        : "Loading the standings"}
    </span>
    <div aria-hidden className="flex flex-col gap-3">
      {conference ? (
        <Header conference={conference} />
      ) : (
        <div className="flex h-5 items-center">
          <Bar className="h-3.5 w-44" />
        </div>
      )}
      <div className="flex flex-col">
        <div className={cn("flex items-center px-3", HEADER_ROW_HEIGHT)}>
          <Bar className="h-3.5 w-12" />
        </div>
        {SKELETON_ROWS.map((row) => (
          <div
            key={row}
            className={cn("flex items-center gap-3 px-3", TEAM_ROW_HEIGHT)}
          >
            <Bar className="size-6 rounded-full" />
            <Bar className="h-3.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  </output>
);

export default function StandingsCard({
  state,
  conference,
  data,
  error,
  className,
}: StandingsCardProperties) {
  if (state === "ready" && data) {
    return (
      <section
        aria-label={summarizeStandings(data)}
        className={cn(CARD_FRAME, "flex flex-col gap-3", className)}
      >
        <Header conference={data.conference} season={data.season} />
        <StandingsTable data={data} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <StandingsError conference={conference} message={error} />
      </div>
    );
  }
  return (
    <StandingsCardSkeleton conference={conference} className={className} />
  );
}
