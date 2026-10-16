"use client";

import type { PointerEvent } from "react";

const SHEEN_REST = { x: "28%", y: "-10%" } as const;

/**
Moves the sheen with the pointer, through CSS variables on the card, so nothing re-renders.
*/
export function trackSheen(event: PointerEvent<HTMLElement>) {
  const box = event.currentTarget.getBoundingClientRect();
  const x = ((event.clientX - box.left) / box.width) * 100;
  const y = ((event.clientY - box.top) / box.height) * 100;
  event.currentTarget.style.setProperty("--glass-x", `${x.toFixed(1)}%`);
  event.currentTarget.style.setProperty("--glass-y", `${y.toFixed(1)}%`);
}

export function resetSheen(event: PointerEvent<HTMLElement>) {
  event.currentTarget.style.setProperty("--glass-x", SHEEN_REST.x);
  event.currentTarget.style.setProperty("--glass-y", SHEEN_REST.y);
}

/**
The glass slab: shading, rim and sheen, over the sky and under the text.
*/
export function GlassSurface() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 rounded-[inherit]"
    >
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          boxShadow: [
            "inset 0 1px 0 rgb(255 255 255 / 0.45)",
            "inset 0 -1px 0 rgb(255 255 255 / 0.12)",
            "inset 0 12px 24px -16px rgb(255 255 255 / 0.35)",
            "inset 0 -18px 30px -18px rgb(0 0 0 / 0.35)",
            "inset 14px 0 28px -24px rgb(255 255 255 / 0.25)",
          ].join(", "),
        }}
      />
      <div
        className="absolute inset-0 rounded-[inherit] transition-[background-position] duration-300"
        style={{
          background: `radial-gradient(120% 90% at var(--glass-x, ${SHEEN_REST.x}) var(--glass-y, ${SHEEN_REST.y}), rgb(255 255 255 / 0.22) 0%, rgb(255 255 255 / 0.06) 35%, transparent 60%)`,
          mixBlendMode: "soft-light",
        }}
      />
      <div
        className="absolute inset-0 rounded-[inherit]"
        style={{
          background:
            "linear-gradient(115deg, transparent 30%, rgb(255 255 255 / 0.08) 42%, transparent 52%)",
        }}
      />
      <div
        className="absolute inset-0 rounded-[inherit] p-px"
        style={{
          background:
            "linear-gradient(150deg, rgb(255 255 255 / 0.7), rgb(255 255 255 / 0.12) 35%, rgb(255 255 255 / 0.05) 60%, rgb(255 255 255 / 0.4))",
          mask: "linear-gradient(#000 0 0) content-box exclude, linear-gradient(#000 0 0)",
          WebkitMask:
            "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
          WebkitMaskComposite: "xor",
        }}
      />
    </div>
  );
}
