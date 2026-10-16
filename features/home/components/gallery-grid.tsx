import Link from "next/link";
import { NAV_SECTIONS } from "@/components/sidebar-app/nav-data";
import GalleryQuote from "@/features/home/components/gallery-quote";
import { GALLERY_WEATHER } from "@/features/home/gallery-snapshot";
import { WeatherCard } from "@/features/weather/components/weather-card";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

type TileSize = "wide" | "narrow" | "tall";

const LAYOUT: readonly { id: string; size: TileSize }[] = [
  { id: "a", size: "wide" },
  { id: "b", size: "narrow" },
  { id: "c", size: "narrow" },
  { id: "d", size: "tall" },
  { id: "e", size: "narrow" },
  { id: "f", size: "wide" },
  { id: "g", size: "narrow" },
];

const SIZE_CLASS: Record<TileSize, string> = {
  narrow: "sm:col-span-1",
  tall: "sm:col-span-2 sm:row-span-2",
  wide: "sm:col-span-2",
};

const STAGE_CLASS: Record<TileSize, string> = {
  narrow: "pl-4 [mask-image:linear-gradient(to_right,#000_70%,transparent)]",
  tall: "justify-center-safe px-4",
  wide: "justify-center-safe px-4",
};

const SHIPPED = NAV_SECTIONS.flatMap((section) =>
  section.kind === "cards" ? section.items.filter((item) => item.href) : []
);

const PREVIEW: Record<string, ReactNode> = {
  "/docs/quote": <GalleryQuote />,
  "/docs/weather": <WeatherCard state="ready" data={GALLERY_WEATHER} />,
};

export default function GalleryGrid() {
  return (
    <div className="grid auto-rows-[300px] grid-cols-1 gap-3 sm:grid-cols-3">
      {LAYOUT.map((tile, index) => {
        const card = SHIPPED.at(index);
        const preview = card?.href ? PREVIEW[card.href] : null;
        return (
          <div
            key={tile.id}
            className={cn(
              "border-border flex flex-col justify-end overflow-hidden rounded-xl border-2 border-dotted",
              SIZE_CLASS[tile.size]
            )}
          >
            {preview ? (
              <div
                className={cn(
                  "flex min-h-0 flex-1 items-center-safe overflow-hidden",
                  STAGE_CLASS[tile.size]
                )}
              >
                <div className="w-sm shrink-0">{preview}</div>
              </div>
            ) : null}
            {card?.href ? (
              <Link
                href={card.href}
                className="text-muted-foreground hover:text-foreground p-4 text-sm transition-colors"
              >
                {card.label}
              </Link>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
