"use client";

import { useState } from "react";
import { brandOf } from "@/features/flights/airline-brands";
import {
  WORLD_MAP_PATH,
  WORLD_MAP_VIEW_BOX,
} from "@/features/flights/components/world-map";
import {
  airlineLogoUrl,
  seatPositionOf,
  summarizeBoardingPass,
} from "@/features/flights/flight-schema";
import { CARD_FRAME } from "@/lib/card-frame";
import { cn } from "@/lib/utils";
import type { AirlineBrand } from "@/features/flights/airline-brands";
import type { BoardingPassData } from "@/features/flights/flight-schema";
import type { CSSProperties, ReactNode } from "react";

export type BoardingPassCardState = "streaming" | "loading" | "ready" | "error";

/**
"map" draws the world map behind the ticket on the theme's card color. "brand" paints the whole ticket in the airline's color with no map, and falls back to "map" for an airline with no color in AIRLINE_BRANDS.
*/
export type BoardingPassVariant = "map" | "brand";

export interface BoardingPassCardProperties {
  readonly state: BoardingPassCardState;
  /**
  The flight number from the props, shown before the pass arrives.
  */
  readonly flight?: string;
  readonly data?: BoardingPassData;
  readonly error?: string;
  /**
  @default "map"
  */
  readonly variant?: BoardingPassVariant;
  readonly className?: string;
}

/**
The ticket's outline: a 1px ring in the theme's border color, drawn with drop-shadow so it follows the notches the mask cuts. A brand ticket sets --ticket-edge to its own color, since the color already marks the edge.
*/
const TICKET_OUTLINE =
  "[filter:drop-shadow(1px_0_0_var(--ticket-edge,var(--border)))_drop-shadow(-1px_0_0_var(--ticket-edge,var(--border)))_drop-shadow(0_1px_0_var(--ticket-edge,var(--border)))_drop-shadow(0_-1px_0_var(--ticket-edge,var(--border)))]";

const BRAND_TEXT = { dark: "#111111", light: "#FFFFFF" } as const;

/**
A brand ticket re-points the theme's tokens at the airline's color, so every bg-card, text-muted-foreground and border-border inside it follows without a second set of classes.
*/
function brandStyle({ color, text }: AirlineBrand): CSSProperties {
  const ink = BRAND_TEXT[text];
  return {
    "--background": color,
    "--border": `color-mix(in oklab, ${ink} 30%, transparent)`,
    "--card": color,
    "--card-foreground": ink,
    "--foreground": ink,
    "--muted": `color-mix(in oklab, ${ink} 18%, transparent)`,
    "--muted-foreground": `color-mix(in oklab, ${ink} 72%, transparent)`,
    "--ticket-edge": color,
  } as CSSProperties;
}

/**
Two half-circle notches where the stub tears off, 7rem from the right edge (the stub's width), cut only when the ticket is wide enough to have a stub.
*/
const TICKET_NOTCHES =
  "@xl:[mask:radial-gradient(circle_9px_at_calc(100%_-_7rem)_0,#0000_97%,#000)_top/100%_51%_no-repeat,radial-gradient(circle_9px_at_calc(100%_-_7rem)_100%,#0000_97%,#000)_bottom/100%_51%_no-repeat]";

const TICKET =
  "bg-card text-card-foreground relative isolate flex overflow-hidden rounded-2xl";

const LABEL =
  "text-muted-foreground text-[10px] leading-4 font-medium tracking-[0.08em] uppercase";

const BIG = "text-2xl leading-8 font-bold tabular-nums";

const SMALL = "text-muted-foreground text-xs leading-4";

const POSITION_TITLES = {
  aisle: "Aisle",
  middle: "Middle",
  window: "Window",
} as const;

const LONG_DATE = new Intl.DateTimeFormat("en-US", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
  weekday: "short",
  year: "numeric",
});

const WHITESPACE = /\s+/u;

/**
"2026-11-03" reads "Tue, Nov 3, 2026".
*/
function longDate(date: string) {
  const parsed = new Date(`${date}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? date : LONG_DATE.format(parsed);
}

/**
"Jon Doe" reads "DOE/JON", the way a pass prints a name.
*/
function passName(passenger: string) {
  const parts = passenger.trim().split(WHITESPACE);
  const last = parts.pop() ?? "";
  return (parts.length > 0 ? `${last}/${parts.join(" ")}` : last).toUpperCase();
}

const WorldMap = () => (
  <svg
    viewBox={WORLD_MAP_VIEW_BOX}
    preserveAspectRatio="xMidYMid slice"
    aria-hidden
    className="text-foreground/[0.06] pointer-events-none absolute inset-0 -z-10 size-full"
  >
    <path d={WORLD_MAP_PATH} fill="currentColor" />
  </svg>
);

const Bar = ({ className }: { readonly className?: string }) => (
  <span
    aria-hidden
    className={cn("bg-muted block animate-pulse rounded", className)}
  />
);

const LOGO_TILE = "size-8 shrink-0 rounded-lg";

const AirlineLogo = ({
  airlineCode,
  isOnBrand = false,
}: {
  readonly airlineCode: string;
  /**
  On a brand ticket the logo sits on a white tile, so a logo in the airline's own color stays visible.
  */
  readonly isOnBrand?: boolean;
}) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span
        aria-hidden
        className={cn(
          LOGO_TILE,
          "bg-muted text-muted-foreground flex items-center justify-center font-mono text-xs uppercase"
        )}
      >
        {airlineCode}
      </span>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element, react-doctor/nextjs-no-img-element, jsx-a11y/no-noninteractive-element-interactions -- next/image would force the logo host into the installer's next.config; onError swaps in the letter tile, it is not a user interaction
    <img
      src={airlineLogoUrl(airlineCode)}
      alt=""
      width={32}
      height={32}
      loading="lazy"
      onError={() => setFailed(true)}
      className={cn(
        LOGO_TILE,
        isOnBrand
          ? "bg-white object-contain p-0.5"
          : "object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
      )}
    />
  );
};

/**
The ticket frame: the main part with the world map behind it (or the airline's color, with a brand), and from @xl a perforation and the stub on the right.
*/
const Ticket = ({
  label,
  stub,
  brand = null,
  className,
  children,
}: {
  readonly label?: string;
  readonly stub: ReactNode;
  readonly brand?: AirlineBrand | null;
  readonly className?: string;
  readonly children: ReactNode;
}) => (
  <article
    aria-label={label}
    style={brand ? brandStyle(brand) : undefined}
    className={cn("@container w-full max-w-2xl", className)}
  >
    <div className={TICKET_OUTLINE}>
      <div className={cn(TICKET, TICKET_NOTCHES)}>
        <div className="relative isolate min-w-0 flex-1 p-4">
          {brand ? null : <WorldMap />}
          {children}
        </div>
        <div
          aria-hidden
          className="border-border my-3 hidden border-l border-dashed @xl:block"
        />
        <div
          aria-hidden
          className="hidden w-28 shrink-0 flex-col items-center justify-between gap-3 p-4 @xl:flex"
        >
          {stub}
        </div>
      </div>
    </div>
  </article>
);

const NO_NOTES: readonly string[] = [];

const Column = ({
  label,
  value,
  notes = NO_NOTES,
  className,
}: {
  readonly label: string;
  readonly value: string;
  readonly notes?: readonly string[];
  readonly className?: string;
}) => (
  <div className={cn("flex min-w-0 flex-col", className)}>
    <dt className={LABEL}>{label}</dt>
    <dd className={cn(BIG, "truncate")}>{value}</dd>
    {notes.map((note) => (
      <dd key={note} className={cn(SMALL, "truncate")}>
        {note}
      </dd>
    ))}
  </div>
);

const GroupBox = ({ group = "–" }: { readonly group?: string }) => (
  <div className="border-foreground flex size-20 flex-col items-center justify-center rounded-md border-2 text-center">
    <span className={cn(LABEL, "text-foreground leading-3")}>
      Boarding
      <br />
      group
    </span>
    <span className="text-3xl leading-9 font-bold tabular-nums">{group}</span>
  </div>
);

const COLUMNS =
  "grid grid-cols-2 gap-x-4 gap-y-3 @xl:grid-cols-[1.3fr_1fr_1.2fr_1fr]";

function seatNotes({ seat, cabin }: BoardingPassData) {
  const position = seatPositionOf(seat);
  return position ? [POSITION_TITLES[position], cabin] : [cabin];
}

/**
The line under the name: the booking reference and the extras, when the pass has them.
*/
function detailsOf({ reference, perks = [] }: BoardingPassData) {
  const details = reference ? [`Booking ${reference}`, ...perks] : perks;
  return details.join(", ");
}

const BoardingPassReady = ({
  data,
  variant,
  className,
}: {
  readonly data: BoardingPassData;
  readonly variant: BoardingPassVariant;
  readonly className?: string;
}) => {
  const perks = data.perks ?? [];
  const details = detailsOf(data);
  const brand = variant === "brand" ? brandOf(data.airlineCode) : null;
  return (
    <Ticket
      label={summarizeBoardingPass(data)}
      brand={brand}
      className={className}
      stub={
        <>
          <div className="flex w-full flex-col items-end text-right">
            <span className="font-mono text-xs leading-4 font-semibold">
              {data.reference ?? data.flight}
            </span>
            <span className={SMALL}>
              {data.reference ? data.flight : `Seat ${data.seat}`}
            </span>
          </div>
          <GroupBox group={data.group} />
        </>
      }
    >
      <div aria-hidden className="flex flex-col gap-3">
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <AirlineLogo
              key={data.airlineCode}
              airlineCode={data.airlineCode}
              isOnBrand={brand !== null}
            />
            <span className="truncate text-base leading-6 font-bold tracking-[0.06em] uppercase @xl:text-lg @xl:tracking-[0.12em]">
              {data.airline}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {perks.length > 0 ? (
              <span className="hidden text-sm leading-5 @xl:inline">
                {perks[0]}
              </span>
            ) : null}
            <span className="bg-foreground text-background rounded px-2 text-xs leading-5 font-bold uppercase">
              {data.cabin}
            </span>
          </div>
        </header>
        <div>
          <p className="truncate text-base leading-6 font-bold">
            {passName(data.passenger)}
          </p>
          {details ? <p className={cn(SMALL, "truncate")}>{details}</p> : null}
        </div>
        <p className="border-border truncate border-b pb-1.5 text-sm leading-5 font-semibold">
          {data.from.city} to {data.to.city}
        </p>
        <dl className={COLUMNS}>
          <Column
            label={data.flight}
            value={`${data.from.code}–${data.to.code}`}
            notes={[longDate(data.date)]}
          />
          <Column
            label="Gate"
            value={data.gate}
            notes={[
              data.terminal ? `Terminal ${data.terminal}` : "Gate may change",
            ]}
          />
          <Column
            label="Boarding begins"
            value={data.boardingTime}
            notes={
              data.departureTime ? [`Flight departs ${data.departureTime}`] : []
            }
          />
          <Column label="Seat" value={data.seat} notes={seatNotes(data)} />
          <Column
            label="Group"
            value={data.group ?? "–"}
            className="@xl:hidden"
          />
        </dl>
      </div>
    </Ticket>
  );
};

const SkeletonColumn = ({ label }: { readonly label: string }) => (
  <span className="flex flex-col">
    <span className={LABEL}>{label}</span>
    <span className="flex h-8 items-center">
      <Bar className="h-5 w-16" />
    </span>
    <span className="flex h-4 items-center">
      <Bar className="h-2.5 w-20" />
    </span>
  </span>
);

/**
The pass while its data is on the way: the same ticket and rows as the ready pass, so nothing moves when it lands. The flight number shows as soon as the model has written it (with "…" while it's still writing).
*/
export const BoardingPassCardSkeleton = ({
  flight,
  streaming = false,
  className,
}: {
  readonly flight?: string;
  readonly streaming?: boolean;
  readonly className?: string;
}) => (
  <Ticket
    className={className}
    stub={
      <>
        <span className="flex h-8 w-full justify-end">
          <Bar className="h-3 w-12" />
        </span>
        <span className="border-muted size-20 animate-pulse rounded-md border-2" />
      </>
    }
  >
    <output className="flex flex-col gap-3">
      <span className="sr-only">
        {flight
          ? `Loading the boarding pass for ${flight}`
          : "Loading a boarding pass"}
      </span>
      <span aria-hidden className="flex h-8 items-center justify-between">
        <span className="flex items-center gap-2.5">
          <Bar className={LOGO_TILE} />
          <Bar className="h-4 w-32" />
        </span>
        {flight ? (
          <span className="font-mono text-sm uppercase tabular-nums">
            {flight}
            {streaming ? (
              <span className="text-muted-foreground">…</span>
            ) : null}
          </span>
        ) : (
          <Bar className="h-4 w-14" />
        )}
      </span>
      <span aria-hidden className="flex h-6 items-center">
        <Bar className="h-4 w-36" />
      </span>
      <span aria-hidden className="border-border flex h-7 border-b">
        <Bar className="mt-0.5 h-3.5 w-40" />
      </span>
      <span aria-hidden className={COLUMNS}>
        <SkeletonColumn label="Flight" />
        <SkeletonColumn label="Gate" />
        <SkeletonColumn label="Boarding begins" />
        <SkeletonColumn label="Seat" />
      </span>
    </output>
  </Ticket>
);

const BoardingPassError = ({
  flight,
  message = "The flight service didn't respond. Try again in a moment.",
  className,
}: {
  readonly flight?: string;
  readonly message?: string;
  readonly className?: string;
}) => (
  <div
    role="alert"
    className={cn(
      CARD_FRAME,
      "flex w-full max-w-2xl flex-col gap-1",
      className
    )}
  >
    <p className="text-sm font-semibold">
      {flight
        ? `Couldn't load the boarding pass for ${flight.toUpperCase()}`
        : "Couldn't load the boarding pass"}
    </p>
    <p className="text-muted-foreground text-xs">{message}</p>
  </div>
);

/**
A boarding pass shaped like a ticket, over a world map or in the airline's color (variant): the airline, passenger and route, then the flight, gate, boarding time and seat in columns, with the boarding group on a stub that tears off along a perforation. Narrower than @xl, the stub folds away and the group joins the columns.
*/
export const BoardingPassCard = ({
  state,
  flight,
  data,
  error,
  variant = "map",
  className,
}: BoardingPassCardProperties) => {
  if (state === "ready" && data) {
    return (
      <BoardingPassReady data={data} variant={variant} className={className} />
    );
  }
  if (state === "error") {
    return (
      <BoardingPassError
        flight={flight}
        message={error}
        className={className}
      />
    );
  }
  return (
    <BoardingPassCardSkeleton
      flight={flight}
      streaming={state === "streaming"}
      className={className}
    />
  );
};
