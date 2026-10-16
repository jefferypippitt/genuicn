"use client";

import { useId, useState } from "react";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/flights/check-in-questions";
import { seatOptionOf } from "@/features/flights/flight-schema";
import { cn } from "@/lib/utils";
import type {
  SeatMap,
  SeatMapSeat,
  SeatOption,
} from "@/features/flights/flight-schema";
import type { CSSProperties } from "react";

const AISLE = "0.5rem";
const ROW_LABEL = "1.5rem";
const SEAT_SIZE = "1.75rem";

const POSITION_TITLES = {
  aisle: "Aisle",
  middle: "Middle",
  window: "Window",
} as const;

type SeatState = "taken" | "picked" | "booked" | "legroom" | "free";

/**
How each seat looks: taken seats are darker and crossed out, the pick is filled in, the booked seat is outlined, and the legroom row has a dashed edge.
*/
const SEAT_STATES: Record<SeatState, string> = {
  booked: "bg-foreground/10 border-primary/60 border-2",
  free: "bg-foreground/10 peer-hover:bg-foreground/20",
  legroom:
    "bg-foreground/10 peer-hover:bg-foreground/20 border-foreground/40 border border-dashed",
  picked: "bg-primary text-primary-foreground",
  taken: "bg-foreground/30 text-foreground/60",
};

/**
The grid's columns: the row number, then each block's seats with an aisle between blocks.
*/
function gridOf(blocks: readonly string[][]): CSSProperties {
  const columns = blocks.flatMap((block, index) => [
    ...(index > 0 ? [AISLE] : []),
    ...block.map(() => SEAT_SIZE),
  ]);
  return { gridTemplateColumns: [ROW_LABEL, ...columns].join(" ") };
}

/**
"Aisle, $14" for a seat to switch to, "Window, your seat now" for the booked one.
*/
function describe(option: SeatOption) {
  const parts: string[] = [POSITION_TITLES[option.position]];
  if (option.legroom) {
    parts.push("extra legroom");
  }
  parts.push(option.current ? "your seat now" : formatPrice(option.price));
  return parts.join(", ");
}

function stateOf(
  seat: SeatMapSeat,
  picked: string,
  map: SeatMap,
  isLegroom: boolean
): SeatState {
  if (seat.taken) {
    return "taken";
  }
  if (seat.seat === picked) {
    return "picked";
  }
  if (seat.seat === map.current) {
    return "booked";
  }
  return isLegroom ? "legroom" : "free";
}

/**
One seat: a radio input under a square, so the browser's arrow keys move through the free seats.
*/
function Seat({
  name,
  seat,
  state,
  label,
  isLocked,
  onPick,
}: {
  readonly name: string;
  readonly seat: string;
  readonly state: SeatState;
  readonly label: string;
  readonly isLocked: boolean;
  readonly onPick: (seat: string) => void;
}) {
  const isTaken = state === "taken";
  return (
    <label
      className={cn(
        "relative block size-7",
        isTaken || isLocked ? "cursor-not-allowed" : "cursor-pointer"
      )}
    >
      <input
        type="radio"
        name={name}
        value={seat}
        aria-label={label}
        checked={state === "picked"}
        disabled={isTaken || isLocked}
        onChange={() => onPick(seat)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "flex size-7 items-center justify-center rounded-md text-[10px] leading-none font-semibold tabular-nums transition-colors",
          "peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1",
          SEAT_STATES[state],
          isLocked && state !== "picked" && !isTaken && "opacity-60"
        )}
      >
        {isTaken ? <X className="size-3.5" /> : null}
        {state === "picked" ? seat : null}
      </span>
    </label>
  );
}

const Legend = () => (
  <ul className="text-muted-foreground flex flex-wrap justify-center gap-x-3 gap-y-1 text-xs leading-4">
    <li className="flex items-center gap-1.5">
      <span className="bg-foreground/10 size-3 rounded-sm" /> Available
    </li>
    <li className="flex items-center gap-1.5">
      <span className="bg-foreground/10 border-foreground/40 size-3 rounded-sm border border-dashed" />{" "}
      Extra legroom
    </li>
    <li className="flex items-center gap-1.5">
      <span className="bg-foreground/30 size-3 rounded-sm" /> Taken
    </li>
    <li className="flex items-center gap-1.5">
      <span className="bg-primary size-3 rounded-sm" /> Yours
    </li>
  </ul>
);

/**
A seat map for picking a seat in a chat: the cabin front to back in a plane's outline, column letters across the top and row numbers down the side, taken seats crossed out and the pick filled in with its seat number. "Confirm" calls onConfirm once and locks the map with the pick showing.
*/
export default function SeatMapPicker({
  map,
  flight,
  defaultSeat,
  onConfirm,
  className,
}: {
  readonly map: SeatMap;
  /**
  e.g. "BA 117", for the map's label.
  */
  readonly flight: string;
  /**
  The seat picked when the map opens; the booked seat when left out.
  */
  readonly defaultSeat?: string;
  readonly onConfirm?: (seat: string) => void;
  readonly className?: string;
}) {
  const name = useId();
  const [picked, setPicked] = useState(defaultSeat ?? map.current);
  const [isLocked, setIsLocked] = useState(false);
  const option = seatOptionOf(map, picked);
  const letters = map.blocks.flat();
  const blockEnds = new Set(
    map.blocks.slice(0, -1).map((block) => block.at(-1))
  );

  return (
    <section
      aria-label={`Seat map for ${flight}`}
      className={cn(
        "bg-card text-card-foreground flex w-full max-w-sm flex-col items-center gap-3 rounded-t-[7rem] rounded-b-[2rem] border px-4 pt-7 pb-4",
        className
      )}
    >
      <p className="text-muted-foreground flex flex-col items-center text-xs leading-4">
        <ChevronUp aria-hidden className="size-4" />
        Front of plane
      </p>
      <fieldset disabled={isLocked} className="min-w-0">
        <legend className="sr-only">Seats</legend>
        <div className="grid items-center gap-1" style={gridOf(map.blocks)}>
          <span />
          {letters.map((letter) => [
            <span
              key={letter}
              aria-hidden
              className="text-muted-foreground text-center text-xs leading-6"
            >
              {letter}
            </span>,
            blockEnds.has(letter) ? <span key={`${letter}-aisle`} /> : null,
          ])}
          {map.rows.map((row) => [
            <span
              key={row.row}
              aria-hidden
              className="text-muted-foreground text-xs tabular-nums"
            >
              {row.row}
            </span>,
            ...row.seats.map((seat, index) => {
              const state = stateOf(seat, picked, map, row.legroom);
              const seatOption = seatOptionOf(map, seat.seat);
              const details = seatOption ? `, ${describe(seatOption)}` : "";
              const label = seat.taken
                ? `Seat ${seat.seat}, taken`
                : `Seat ${seat.seat}${details}`;
              return [
                <Seat
                  key={seat.seat}
                  name={name}
                  seat={seat.seat}
                  state={state}
                  label={label}
                  isLocked={isLocked}
                  onPick={setPicked}
                />,
                blockEnds.has(letters[index]) ? (
                  <span key={`${seat.seat}-aisle`} />
                ) : null,
              ];
            }),
          ])}
        </div>
      </fieldset>
      <p className="text-muted-foreground flex flex-col items-center text-xs leading-4">
        Back of plane
        <ChevronDown aria-hidden className="size-4" />
      </p>
      <Legend />
      <div className="border-border flex w-full items-center justify-between gap-3 border-t pt-3">
        <p aria-live="polite" className="min-w-0 text-sm leading-5">
          <span className="font-semibold">Seat {picked}</span>
          {option ? (
            <span className="text-muted-foreground block truncate text-xs leading-4">
              {describe(option)}
            </span>
          ) : null}
        </p>
        {isLocked ? (
          <span className="text-muted-foreground shrink-0 text-xs">
            Confirmed
          </span>
        ) : (
          <Button
            onClick={() => {
              setIsLocked(true);
              onConfirm?.(picked);
            }}
          >
            {picked === map.current ? "Keep seat" : "Confirm seat"}
          </Button>
        )}
      </div>
    </section>
  );
}
