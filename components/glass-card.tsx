"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

/**
The frame every glass card shares: a 1rem radius held in a variable so the clip and the rim follow it. A card's plain states (loading, error) match it with rounded-2xl, the same 1rem.
*/
const GLASS_FRAME =
  "relative isolate w-full max-w-sm rounded-(--glass-radius) p-4 [--glass-radius:1rem]";

const GLASS_CLIP =
  "pointer-events-none absolute inset-0 rounded-[inherit] [clip-path:inset(0_round_var(--glass-radius))]";

/**
The glass slab: shading and, when the card has no border of its own, a rim of light, over the backdrop and under the text. Its highlights scale with --glass-light (1 by default), so a dark surface can take a softer glass than a bright sky.
*/
export function GlassSurface({ rim = true }: { readonly rim?: boolean }) {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: [
            "inset 0 12px 24px -16px rgb(255 255 255 / calc(0.35 * var(--glass-light, 1)))",
            "inset 0 -18px 30px -18px rgb(0 0 0 / 0.35)",
            "inset 14px 0 28px -24px rgb(255 255 255 / calc(0.25 * var(--glass-light, 1)))",
          ].join(", "),
        }}
      />
      {rim ? (
        <div
          className="absolute inset-0 rounded-[inherit] p-px"
          style={{
            WebkitMask:
              "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
            WebkitMaskComposite: "xor",
            background:
              "linear-gradient(150deg, rgb(255 255 255 / calc(0.7 * var(--glass-light, 1))), rgb(255 255 255 / calc(0.12 * var(--glass-light, 1))) 35%, rgb(255 255 255 / calc(0.05 * var(--glass-light, 1))) 60%, rgb(255 255 255 / calc(0.4 * var(--glass-light, 1))))",
            mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          }}
        />
      ) : null}
    </div>
  );
}

const SURFACE = {
  card: "bg-card text-card-foreground border dark:[--glass-light:0.25]",
  scene:
    "text-white [--glass-light:0.25] [text-shadow:0_1px_2px_rgb(0_0_0/0.2)] dark:[--glass-light:1]",
} as const;

/**
A card under a slab of glass: light along the top, shade along the bottom, and one edge.

- "scene" (the weather card): the glass sits over a picture, the sky, and the text is white. Its edge is the glass rim. On a light page its highlights drop to a quarter, since a white rim against a white page reads as a puffy halo rather than glass.
- "card": the glass sits over the card's own themed surface, so it keeps its colors in light and dark. Its edge is the themed border, so it skips the rim rather than drawing a second line inside it. In dark mode its highlights drop to a quarter.
*/
export function GlassCard({
  surface = "card",
  backdrop,
  label,
  className,
  children,
}: {
  readonly surface?: keyof typeof SURFACE;
  /**
  Anything drawn under the glass: the sky, or a faint map.
  */
  readonly backdrop?: ReactNode;
  /**
  What a screen reader hears for the whole card.
  */
  readonly label: string;
  readonly className?: string;
  readonly children: ReactNode;
}) {
  return (
    <section
      aria-label={label}
      className={cn(GLASS_FRAME, SURFACE[surface], className)}
    >
      <div className={GLASS_CLIP}>
        {backdrop}
        <GlassSurface rim={surface === "scene"} />
      </div>
      <div className="relative">{children}</div>
    </section>
  );
}
