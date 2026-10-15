"use client";

import { SidebarInput } from "@/components/ui/sidebar";
import { useSize } from "@/lib/size-context";
import { useIcons } from "@/lib/icon-context";
import type { ComponentProps } from "react";

// ---------------------------------------------------------------------------
// The header's search field, on the menu rows' own rhythm. The leading icon
// sits on the rows' 16px leading axis; pl-8 starts the text on the rows'
// 32px text axis; and the shortcut chip waits at the trailing edge, revealed
// on hover/focus — the placeholder owns the field at rest.
// ---------------------------------------------------------------------------

export interface SidebarSearchFieldProps extends Omit<
  ComponentProps<typeof SidebarInput>,
  "className"
> {
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
  const iconSize = useSize().icon;
  const icons = useIcons();
  const SearchIcon = icons.search;
  return (
    <div className="group/search relative">
      <SearchIcon
        size={iconSize}
        strokeWidth={1.5}
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2 -translate-y-1/2"
      />
      <SidebarInput
        placeholder={placeholder}
        aria-label="Search"
        className="pr-12 pl-8"
        {...properties}
      />
      {shortcut ? (
        <kbd className="text-muted-foreground pointer-events-none absolute top-1/2 right-2 -translate-y-1/2 font-sans text-[length:var(--fs-micro,11px)] leading-[var(--lh-micro,14px)] opacity-0 transition-opacity duration-80 group-focus-within/search:opacity-100 group-hover/search:opacity-100">
          {shortcut}
        </kbd>
      ) : null}
    </div>
  );
};
