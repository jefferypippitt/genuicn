"use client";

import { useId, useState } from "react";
import { ArrowUpDown, PlaneLanding, PlaneTakeoff } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import {
  CITIES,
  destinationsFrom,
  findCity,
} from "@/features/flights/flight-network";
import { fontWeights } from "@/lib/font-weight";
import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { cn } from "@/lib/utils";
import type { NetworkCity } from "@/features/flights/flight-network";

export interface Route {
  from: string;
  to: string;
}

interface CityItem {
  value: string;
  label: string;
}

const itemOf = (city: NetworkCity): CityItem => ({
  label: city.city,
  value: city.city,
});

/**
Only cities with a flight out of them can be a starting point.
*/
const ORIGINS = CITIES.flatMap((city) =>
  destinationsFrom(city).length > 0 ? [itemOf(city)] : []
);

/**
A city matches its name, any alias, or any airport code, so "nyc", "jfk", and "new" all find New York.
*/
function matches(item: CityItem, query: string) {
  const typed = query.trim().toLowerCase();
  const city = findCity(item.value);
  if (!typed || !city) {
    return true;
  }
  const isNamed = city.city.toLowerCase().includes(typed);
  const isAliased = city.aliases.some((alias) => alias.startsWith(typed));
  return (
    isNamed ||
    isAliased ||
    city.codes.some((code) => code.toLowerCase().startsWith(typed))
  );
}

/**
Whether the demo has a flight from the first city to the second.
*/
function hasFlight(start: string, end: string) {
  const city = findCity(start);
  return city
    ? destinationsFrom(city).some((entry) => entry.city === end)
    : false;
}

/**
One searchable city field: a caption label over a Fluid Combobox whose rows show the city and its airport codes.
*/
function CityField({
  label,
  icon,
  items,
  value,
  placeholder,
  isDisabled,
  onChange,
}: {
  readonly label: string;
  readonly icon: typeof PlaneTakeoff;
  readonly items: readonly CityItem[];
  readonly value: string;
  readonly placeholder: string;
  readonly isDisabled: boolean;
  readonly onChange: (city: string) => void;
}) {
  const id = useId();
  const sizes = useSize();
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className={cn(sizes.type.caption, "text-muted-foreground")}
      >
        {label}
      </label>
      <Combobox
        items={items}
        value={value}
        onValueChange={onChange}
        filter={matches}
        disabled={isDisabled}
      >
        <ComboboxInput id={id} icon={icon} placeholder={placeholder} />
        <ComboboxContent>
          <ComboboxEmpty>No flights to that city in this demo.</ComboboxEmpty>
          <ComboboxList>
            {(item) => {
              const city = findCity(
                typeof item === "string" ? item : item.value
              );
              return city ? (
                <ComboboxItem key={city.city} value={city.city}>
                  {city.city}{" "}
                  <span className="text-muted-foreground">
                    {city.codes.join(", ")}
                  </span>
                </ComboboxItem>
              ) : null;
            }}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}

/**
A card for picking a route in a chat, the way the calendar picks a date: two Fluid Combobox fields that search cities by name or airport code, a swap button, and a confirm button. To only lists cities with a flight from the picked From city, so every route it offers exists. The confirm button calls onConfirm once and locks the card with the route showing.
*/
export default function RoutePicker({
  confirmLabel = "Pick a date",
  onConfirm,
  className,
}: {
  readonly confirmLabel?: string;
  readonly onConfirm?: (route: Route) => void;
  readonly className?: string;
}) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [isLocked, setIsLocked] = useState(false);
  const sizes = useSize();
  const shape = useShape();

  const fromCity = findCity(from);
  const destinations = fromCity ? destinationsFrom(fromCity).map(itemOf) : [];
  const canSwap = Boolean(from && to) && hasFlight(to, from) && !isLocked;
  const isReady = Boolean(from && to);
  const iconSize = sizes.variant === "compact" ? "icon-compact" : "icon";

  const pickFrom = (city: string) => {
    setFrom(city);
    if (!hasFlight(city, to)) {
      setTo("");
    }
  };

  return (
    <section
      aria-label="Route"
      className={cn(
        "bg-card text-card-foreground flex w-full max-w-sm flex-col gap-2 border p-3",
        shape.container,
        className
      )}
    >
      <div className="flex items-center gap-2">
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <CityField
            label="From"
            icon={PlaneTakeoff}
            items={ORIGINS}
            value={from}
            placeholder="City or airport"
            isDisabled={isLocked}
            onChange={pickFrom}
          />
          <CityField
            label="To"
            icon={PlaneLanding}
            items={destinations}
            value={to}
            placeholder={fromCity ? "City or airport" : "Pick From first"}
            isDisabled={isLocked || !fromCity}
            onChange={setTo}
          />
        </div>
        <Button
          variant="ghost"
          size={iconSize}
          aria-label="Swap From and To"
          disabled={!canSwap}
          onClick={() => {
            setFrom(to);
            setTo(from);
          }}
        >
          <ArrowUpDown />
        </Button>
      </div>
      <div className="border-border flex items-center justify-between gap-3 border-t pt-3">
        <p
          aria-live="polite"
          className={cn(
            sizes.type.body,
            "min-w-0 truncate",
            isReady ? "text-foreground" : "text-muted-foreground"
          )}
          style={{
            fontVariationSettings: isReady
              ? fontWeights.semibold
              : fontWeights.normal,
          }}
        >
          {isReady ? `${from} to ${to}` : "Pick both cities"}
        </p>
        {isLocked ? (
          <span
            className={cn(sizes.type.caption, "text-muted-foreground shrink-0")}
          >
            Picked
          </span>
        ) : (
          <Button
            disabled={!isReady}
            onClick={() => {
              setIsLocked(true);
              onConfirm?.({ from, to });
            }}
          >
            {confirmLabel}
          </Button>
        )}
      </div>
    </section>
  );
}
