"use client";

import { useId, useState } from "react";
import { Plane } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPrice } from "@/features/flights/check-in-questions";
import { airlineLogoUrl } from "@/features/flights/flight-schema";
import { cn } from "@/lib/utils";
import type { FlightOffer } from "@/features/flights/flight-schema";

const MINUTES_PER_HOUR = 60;

/**
545 reads "9h 5m".
*/
function duration(minutes: number) {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const rest = minutes % MINUTES_PER_HOUR;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

function describe(offer: FlightOffer) {
  const nextDay = offer.arrivalDays > 0 ? ` (+${offer.arrivalDays} day)` : "";
  return `${offer.airline} ${offer.flight}, leaves ${offer.from.code} ${offer.departureTime}, arrives ${offer.to.code} ${offer.arrivalTime}${nextDay}, ${duration(offer.minutes)}, ${offer.cabin}, ${formatPrice(offer.price)}`;
}

function Logo({ airlineCode }: { readonly airlineCode: string }) {
  const [isFailed, setIsFailed] = useState(false);
  if (isFailed) {
    return (
      <span className="bg-muted text-muted-foreground flex size-8 shrink-0 items-center justify-center rounded-lg font-mono text-xs">
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
      onError={() => setIsFailed(true)}
      className="size-8 shrink-0 rounded-lg object-cover outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10"
    />
  );
}

/**
One flight as a radio row: the airline, times with the flight time between them, and the fare.
*/
function OfferRow({
  name,
  offer,
  isPicked,
  onPick,
}: {
  readonly name: string;
  readonly offer: FlightOffer;
  readonly isPicked: boolean;
  readonly onPick: (flight: string) => void;
}) {
  return (
    <label className="relative block cursor-pointer">
      <input
        type="radio"
        name={name}
        value={offer.flight}
        aria-label={describe(offer)}
        checked={isPicked}
        onChange={() => onPick(offer.flight)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={cn(
          "grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border p-3 transition-colors",
          "peer-focus-visible:ring-ring peer-focus-visible:ring-2 peer-focus-visible:ring-offset-1",
          isPicked
            ? "border-primary bg-primary/5"
            : "border-border peer-hover:bg-foreground/5"
        )}
      >
        <Logo airlineCode={offer.airlineCode} />
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex items-center gap-2 text-sm leading-5 font-semibold tabular-nums">
            {offer.departureTime}
            <span className="text-muted-foreground flex min-w-6 flex-1 items-center gap-1">
              <span className="border-border h-px flex-1 border-t border-dashed" />
              <Plane className="size-3.5 rotate-45" />
              <span className="border-border h-px flex-1 border-t border-dashed" />
            </span>
            {offer.arrivalTime}
            {offer.arrivalDays > 0 ? (
              <sup className="text-muted-foreground text-[10px]">
                +{offer.arrivalDays}
              </sup>
            ) : null}
          </span>
          <span className="text-muted-foreground truncate text-xs leading-4">
            {offer.flight} · {offer.from.code}–{offer.to.code} ·{" "}
            {duration(offer.minutes)} · {offer.cabin}
          </span>
        </span>
        <span className="text-base leading-6 font-bold tabular-nums">
          {formatPrice(offer.price)}
        </span>
      </span>
    </label>
  );
}

/**
Search results for picking a flight in a chat: one row per flight, earliest first. "Select flight" calls onConfirm once with the flight number and locks the list with the pick showing.
*/
export default function FlightResults({
  offers,
  onConfirm,
  className,
}: {
  readonly offers: readonly FlightOffer[];
  readonly onConfirm?: (flight: string) => void;
  readonly className?: string;
}) {
  const name = useId();
  const [picked, setPicked] = useState(offers[0]?.flight ?? "");
  const [isLocked, setIsLocked] = useState(false);
  const pick = offers.find((offer) => offer.flight === picked);
  const [first] = offers;

  return (
    <section
      aria-label="Flights"
      className={cn(
        "bg-card text-card-foreground flex w-full max-w-md flex-col gap-3 rounded-2xl border p-4",
        className
      )}
    >
      {first ? (
        <header className="text-sm leading-5 font-semibold">
          {first.from.city} to {first.to.city}
        </header>
      ) : null}
      <fieldset disabled={isLocked} className="flex min-w-0 flex-col gap-2">
        <legend className="sr-only">Flight</legend>
        {offers.map((offer) => (
          <OfferRow
            key={offer.flight}
            name={name}
            offer={offer}
            isPicked={offer.flight === picked}
            onPick={setPicked}
          />
        ))}
      </fieldset>
      <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
        <p aria-live="polite" className="min-w-0 truncate text-sm leading-5">
          {pick ? (
            <>
              <span className="font-semibold">{pick.flight}</span> ·{" "}
              {formatPrice(pick.price)}
            </>
          ) : null}
        </p>
        {isLocked ? (
          <span className="text-muted-foreground shrink-0 text-xs">
            Selected
          </span>
        ) : (
          <Button
            disabled={!pick}
            onClick={() => {
              setIsLocked(true);
              onConfirm?.(picked);
            }}
          >
            Select flight
          </Button>
        )}
      </div>
    </section>
  );
}
