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
import { ScrollArea } from "@/components/ui/scroll-area";
import { listOf } from "@/features/chat/lookup";
import {
  formatAverage,
  formatExperience,
  summarizePlayer,
} from "@/features/player/player-schema";
import { CARD_FRAME as SHARED_CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type { PlayerData, PlayerInfo } from "@/features/player/player-schema";

export type PlayerCardState = "streaming" | "loading" | "ready" | "error";

export interface PlayerCardProperties {
  readonly state: PlayerCardState;
  /**
  The players from the props, shown before the data arrives.
  */
  readonly players?: readonly string[];
  /**
  The players found, one row each, in the order asked.
  */
  readonly data?: readonly PlayerData[];
  /**
  Names that were asked for but not found, noted under the table.
  */
  readonly missing?: readonly string[];
  readonly error?: string;
  readonly className?: string;
}

const CARD_FRAME = `${SHARED_CARD_FRAME} w-full max-w-[720px]`;
const HEADER_ROW_HEIGHT = "h-[37px]";
const PLAYER_ROW_HEIGHT = "h-[73px]";

function streamingPlayerKey(name: string, index: number): string {
  return `${name}-${index}`;
}

const NO_NAMES: readonly string[] = [];

const MUTED = "text-muted-foreground";

const STAT = "text-center whitespace-nowrap tabular-nums";

const COLUMNS = [
  {
    label: "Ht",
    title: "Height",
    value: (player: PlayerInfo) => player.height ?? "–",
  },
  {
    label: "Age",
    title: "Age",
    value: (player: PlayerInfo) => player.age ?? "–",
  },
  {
    label: "Exp",
    title: "Seasons in the NBA before this one (R for a rookie)",
    value: (player: PlayerInfo) => formatExperience(player.experience),
  },
  {
    label: "PPG",
    title: "Points per game",
    value: (player: PlayerInfo) => formatAverage(player.points),
  },
  {
    label: "APG",
    title: "Assists per game",
    value: (player: PlayerInfo) => formatAverage(player.assists),
  },
  {
    label: "RPG",
    title: "Rebounds per game",
    value: (player: PlayerInfo) => formatAverage(player.rebounds),
  },
  {
    label: "SPG",
    title: "Steals per game",
    value: (player: PlayerInfo) => formatAverage(player.steals),
  },
] as const;

/**
ESPN frames every NBA headshot the same way: 600 by 436, the head centred a little left of the middle, its top about 15% down. Drawn at this size and offset in the 64px circle, a 300px square around the head fills it: head and shoulders rather than mostly jersey.
*/
const HEADSHOT_CROP = { height: 93, left: -31, top: -11, width: 128 };

const ESPN_IMAGES = "https://a.espncdn.com";

/**
The headshot at exactly the size it's drawn, for 1x, 2x and 3x screens, from ESPN's own resizer. Left to shrink the 600px original by itself, the browser takes a fast, soft filter. A photo from anywhere else is used as it is.
*/
function headshotSources(url: string): { src: string; srcSet?: string } {
  if (!url.startsWith(ESPN_IMAGES)) {
    return { src: url };
  }
  const path = url.slice(ESPN_IMAGES.length);
  const sized = (scale: number) => {
    const parameters = new URLSearchParams({
      h: String(HEADSHOT_CROP.height * scale),
      img: path,
      w: String(HEADSHOT_CROP.width * scale),
    });
    return `${ESPN_IMAGES}/combiner/i?${parameters}`;
  };
  return {
    src: sized(1),
    srcSet: `${sized(1)} 1x, ${sized(2)} 2x, ${sized(3)} 3x`,
  };
}

const Headshot = ({ player }: { readonly player: PlayerInfo }) => {
  const [failed, setFailed] = useState(false);
  const photo = player.headshot ? headshotSources(player.headshot) : null;
  return (
    <span
      aria-hidden
      className="bg-muted relative flex size-16 shrink-0 overflow-hidden rounded-full"
    >
      {!failed && photo ? (
        // eslint-disable-next-line @next/next/no-img-element, react-doctor/nextjs-no-img-element, jsx-a11y/no-noninteractive-element-interactions -- next/image would force the photo host into the installer's next.config; onError drops a broken photo, it is not a user interaction
        <img
          src={photo.src}
          srcSet={photo.srcSet}
          alt=""
          width={HEADSHOT_CROP.width}
          height={HEADSHOT_CROP.height}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute max-w-none"
          style={{
            height: HEADSHOT_CROP.height,
            left: HEADSHOT_CROP.left,
            top: HEADSHOT_CROP.top,
            width: HEADSHOT_CROP.width,
          }}
        />
      ) : null}
    </span>
  );
};

const Header = ({
  title,
  season,
}: {
  readonly title: string;
  readonly season?: string;
}) => (
  <header className="flex items-center justify-between gap-3 text-sm">
    <p className="min-w-0 truncate">
      <span className="text-blue-600 dark:text-blue-400">NBA</span>
      <span className={MUTED}> · {title}</span>
    </p>
    {season ? (
      <p className={cn(MUTED, "shrink-0 tabular-nums")}>{season}</p>
    ) : null}
  </header>
);

function sharedTeam(data: readonly PlayerData[]) {
  const [first] = data;
  return first && data.every((entry) => entry.team.name === first.team.name)
    ? first.team.name
    : null;
}

const PlayerTable = ({
  data,
  showTeam,
}: {
  readonly data: readonly PlayerData[];
  readonly showTeam: boolean;
}) => (
  <ScrollArea orientation="horizontal" className="-mx-1">
    <Table className="min-w-[620px] text-sm">
      <caption className="sr-only">
        {listOf(data.map(({ player }) => player.name))}, with per-game averages
        from {data[0]?.statsSeason}
      </caption>
      <TableHeader>
        <TableRow>
          <TableHead scope="col" className="w-0">
            <span className="sr-only">Photo</span>
          </TableHead>
          <TableHead scope="col" className={STAT}>
            #
          </TableHead>
          <TableHead scope="col">Player</TableHead>
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
        {data.map(({ player, team }, index) => (
          <TableRow
            key={player.id}
            index={index}
            className={cn(
              "[&>td]:text-foreground",
              index === data.length - 1 && "border-transparent"
            )}
          >
            <TableCell className="py-1 pr-0">
              <Headshot player={player} />
            </TableCell>
            <TableCell className={STAT}>{player.jersey ?? "–"}</TableCell>
            <TableCell className="whitespace-nowrap">
              <span className="flex flex-col">
                <span>{player.name}</span>
                {showTeam ? (
                  <span className={cn(MUTED, "text-xs")}>{team.name}</span>
                ) : null}
              </span>
            </TableCell>
            {COLUMNS.map((column) => (
              <TableCell key={column.label} className={STAT}>
                {column.value(player)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </ScrollArea>
);

const PlayerError = ({
  players,
  message = "The player service didn't respond. Try again in a moment.",
}: {
  readonly players?: readonly string[];
  readonly message?: string;
}) => (
  <div role="alert" className="flex flex-col gap-1">
    <p className="text-sm font-semibold">
      {players && players.length > 0
        ? `Couldn't load ${listOf(players)}`
        : "Couldn't load the player"}
    </p>
    <p className={cn(MUTED, "text-xs")}>{message}</p>
  </div>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <div className={cn("bg-muted animate-pulse rounded", className)} />
);

/**
The card while its data is on the way: the same header and a row per player at the table's height, so nothing moves when the players land. Shows the names as soon as they're known.
*/
export const PlayerCardSkeleton = ({
  players = NO_NAMES,
  className,
}: {
  readonly players?: readonly string[];
  readonly className?: string;
}) => {
  const rows = players.length > 0 ? players : [""];
  return (
    <output className={cn(CARD_FRAME, "block", className)}>
      <span className="sr-only">
        {players.length > 0 ? `Loading ${listOf(players)}` : "Loading a player"}
      </span>
      <div aria-hidden className="flex flex-col gap-3">
        <div className="flex h-5 items-center">
          <Bar className="h-3.5 w-44" />
        </div>
        <div className="flex flex-col">
          <div className={cn("flex items-center px-3", HEADER_ROW_HEIGHT)}>
            <Bar className="h-3.5 w-12" />
          </div>
          {rows.map((name, index) => (
            <div
              key={streamingPlayerKey(name, index)}
              className={cn("flex items-center gap-3 px-3", PLAYER_ROW_HEIGHT)}
            >
              <Bar className="size-16 rounded-full" />
              {name ? (
                <p className="text-sm">{name}</p>
              ) : (
                <Bar className="h-3.5 w-36" />
              )}
            </div>
          ))}
        </div>
      </div>
    </output>
  );
};

export default function PlayerCard({
  state,
  players,
  data,
  missing = NO_NAMES,
  error,
  className,
}: PlayerCardProperties) {
  if (state === "ready" && data && data.length > 0) {
    const team = sharedTeam(data);
    return (
      <section
        aria-label={data.map(summarizePlayer).join(" ")}
        className={cn(CARD_FRAME, "flex flex-col gap-3", className)}
      >
        <Header title={team ?? "Players"} season={data[0]?.season} />
        <PlayerTable data={data} showTeam={team === null} />
        {missing.length > 0 ? (
          <p className={cn(MUTED, "text-xs")}>
            Couldn&apos;t find {listOf(missing)}.
          </p>
        ) : null}
      </section>
    );
  }
  if (state === "error") {
    return (
      <div className={cn(CARD_FRAME, className)}>
        <PlayerError players={players} message={error} />
      </div>
    );
  }
  return <PlayerCardSkeleton players={players} className={className} />;
}
