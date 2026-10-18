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
  cupGroupName,
  summarizeCupGroup,
} from "@/features/nba-cup/nba-cup-schema";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type {
  CupGroup,
  CupGroupData,
  CupTeam,
} from "@/features/nba-cup/nba-cup-schema";

export type NbaCupCardState = "streaming" | "loading" | "ready" | "error";

export interface NbaCupCardProperties {
  readonly state: NbaCupCardState;
  /**
  The group from the props, shown before the data arrives.
  */
  readonly group?: CupGroup;
  readonly data?: CupGroupData;
  readonly error?: string;
  readonly className?: string;
}

/**
One plain surface for the whole card. The table scrolls sideways when the card is narrower than its columns.
*/
const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-[640px]`;

const MUTED = "text-muted-foreground";

const STAT = "text-center whitespace-nowrap tabular-nums";

/**
The stat columns after the team, left to right, as the NBA lays out a Cup group.
*/
const COLUMNS = [
  {
    label: "GP",
    title: "Games played",
    value: (team: CupTeam) => team.wins + team.losses,
  },
  { label: "W", title: "Wins", value: (team: CupTeam) => team.wins },
  { label: "L", title: "Losses", value: (team: CupTeam) => team.losses },
  {
    label: "Pts+",
    title: "Points scored",
    value: (team: CupTeam) => team.pointsFor,
  },
  {
    label: "Pts-",
    title: "Points allowed",
    value: (team: CupTeam) => team.pointsAgainst,
  },
  {
    label: "Diff",
    title: "Point difference",
    value: (team: CupTeam) => team.difference,
  },
] as const;

const TEAMS_PER_GROUP = 5;

/**
One of the logo's two images: the light one, or the one the NBA draws for dark backgrounds. The theme hides the other.
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
    width={24}
    height={24}
    loading="lazy"
    onError={onError}
    className={cn("size-6 object-contain", className)}
  />
);

const TeamLogo = ({ team }: { readonly team: CupTeam }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
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
        src={team.logoDark}
        onError={() => setFailed(true)}
        className="hidden dark:block"
      />
    </span>
  );
};

const Header = ({
  group,
  season,
}: {
  readonly group: CupGroup;
  readonly season?: string;
}) => (
  <header className="flex items-center justify-between gap-3 text-sm">
    <p className="min-w-0 truncate">
      <span className="text-blue-600 dark:text-blue-400">NBA Cup</span>
      <span className={MUTED}> · {cupGroupName(group)}</span>
    </p>
    {season ? (
      <p className={cn(MUTED, "shrink-0 tabular-nums")}>{season}</p>
    ) : null}
  </header>
);

const GroupTable = ({ data }: { readonly data: CupGroupData }) => (
  <ScrollArea orientation="horizontal" className="-mx-1">
    <Table className="min-w-[440px] text-sm">
      <caption className="sr-only">
        NBA Cup {cupGroupName(data.group)}, {data.season}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col">Team</TableHead>
          {COLUMNS.map((column) => (
            <TableHead key={column.label} scope="col" className={STAT}>
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
                <span className="truncate whitespace-nowrap">{team.name}</span>
              </span>
            </TableCell>
            {COLUMNS.map((column) => (
              <TableCell key={column.label} className={STAT}>
                {column.value(team)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

const NbaCupError = ({
  group,
  message = "The NBA's stats service didn't respond. Try again in a moment.",
}: {
  readonly group?: CupGroup;
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {group
        ? `Couldn't load NBA Cup ${cupGroupName(group)}`
        : "Couldn't load the NBA Cup"}
    </p>
    <p className={cn(MUTED, "text-xs")}>{message}</p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

const SKELETON_ROWS = Array.from(
  { length: TEAMS_PER_GROUP },
  (_, index) => `row-${index + 1}`
);

/**
The card while its data is on the way: the same header and one row per team at the table's height, so nothing moves when the table lands.
*/
export const NbaCupCardSkeleton = ({
  group,
  className,
}: {
  readonly group?: CupGroup;
  readonly className?: string;
}) => (
  <output className={cn(CARD_FRAME, "block", className)}>
    <span className="sr-only">
      {group ? `Loading NBA Cup ${cupGroupName(group)}` : "Loading the NBA Cup"}
    </span>
    <div aria-hidden className="flex flex-col gap-3">
      {group ? (
        <Header group={group} />
      ) : (
        <div className="flex h-5 items-center">
          <Bar className="h-3.5 w-40" />
        </div>
      )}
      <div className="flex flex-col">
        {/* The header row and each team row are 37px: 36 on the ladder plus a 1px rule. */}
        <div className="flex h-[37px] items-center px-3">
          <Bar className="h-3.5 w-12" />
        </div>
        {SKELETON_ROWS.map((row) => (
          <div key={row} className="flex h-[37px] items-center gap-3 px-3">
            <Bar className="size-6 rounded-full" />
            <Bar className="h-3.5 w-28" />
          </div>
        ))}
      </div>
    </div>
  </output>
);

export default function NbaCupCard({
  state,
  group,
  data,
  error,
  className,
}: NbaCupCardProperties) {
  if (state === "ready" && data) {
    return (
      <section
        aria-label={summarizeCupGroup(data)}
        className={cn(CARD_FRAME, "flex flex-col gap-3", className)}
      >
        <Header group={data.group} season={data.season} />
        <GroupTable data={data} />
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <NbaCupError group={group} message={error} />
      </div>
    );
  }
  return <NbaCupCardSkeleton group={group} className={className} />;
}
