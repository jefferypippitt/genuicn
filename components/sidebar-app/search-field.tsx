"use client";

import { useShape } from "@/lib/shape-context";
import { useSize } from "@/lib/size-context";
import { useIcons } from "@/lib/icon-context";
import { fontWeights } from "@/lib/font-weight";
import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------

export interface SidebarSearchFieldProps extends Omit<
  ComponentProps<"button">,
  "className" | "children" | "type"
> {
  readonly placeholder?: string;
  /**
  Keystroke shown in the trailing chip. Pass null to drop the chip.
  */
  readonly shortcut?: string | null;
}

export const SidebarSearchField = ({
  placeholder = "Search…",
  shortcut = "⌘K",
  ...properties
}: SidebarSearchFieldProps) => {
  const size = useSize();
  const shape = useShape();
  const iconSize = size.icon;
  const icons = useIcons();
  const SearchIcon = icons.search;
  return (
    <div className="group/search relative">
      <SearchIcon
        size={iconSize}
        strokeWidth={1.5}
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
      />
      <button
        type="button"
        aria-label="Search"
        style={{ fontVariationSettings: fontWeights.normal }}
        className={cn(
          "w-full cursor-pointer border-0 bg-transparent text-left outline-none",
          "ring-1 ring-transparent transition-[background-color,box-shadow] duration-80",
          "hover:bg-muted/50 hover:ring-border",
          "focus:bg-card focus:ring-border",
          "focus-visible:ring-[color:var(--focus-ring,#6B97FF)]",
          size.variant === "compact" ? "h-7" : "h-8",
          size.field,
          shape.input,
          "text-muted-foreground pr-12 pl-8"
        )}
        {...properties}
      >
        {placeholder}
      </button>
      {shortcut ? (
        <kbd
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-sans text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] opacity-0 transition-opacity duration-80 group-focus-within/search:opacity-100 group-hover/search:opacity-100"
        >
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
};
