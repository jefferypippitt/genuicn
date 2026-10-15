"use client";

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
} from "@/components/ui/dropdown";
import { cn } from "@/lib/utils";
import { useSize } from "@/lib/size-context";
import { useIcons } from "@/lib/icon-context";
import { SIDEBAR_MENU_POPUP } from "@/lib/sidebar-menu-grid";
import type { ReactNode } from "react";

// ---------------------------------------------------------------------------
// Footer user row: identity anchors the sidebar's outer edge. The 20px
// avatar pulls -ml-0.5 to centre on the rows' leading icon axis; the
// chevron rides a 24px slot pulled -mr-0.5 onto the trailing action axis —
// the same axes every other sidebar row uses. Its menu opens upward on the
// shared sidebar menu grid, so labels and trailing glyphs line up with the
// trigger row exactly.
// ---------------------------------------------------------------------------

export interface SidebarUserFooterProps {
  /**
  Display name shown in the row.
  */
  readonly name: ReactNode;
  /**
  20px avatar — e.g. <img className="size-5 rounded-full outline-1 -outline-offset-1 outline-black/10 dark:outline-white/10" …/>. The row positions it on the leading icon axis; the element owns its look.
  */
  readonly avatar: ReactNode;
  /**
  Dropdown content (MenuItem rows).
  */
  readonly menu: ReactNode;
  /**
  Extra classes for the wrapping SidebarMenu — pass "min-w-0 flex-1" when the row shares a horizontal footer line with icon buttons.
  */
  readonly className?: string;
}

export const SidebarUserFooter = ({
  name,
  avatar,
  menu,
  className,
}: SidebarUserFooterProps) => {
  const iconSize = useSize().icon;
  const icons = useIcons();
  const ChevronsUpDown = icons["chevrons-up-down"];
  return (
    <SidebarMenu aria-label="User" className={cn(className)}>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownTrigger
            render={
              <SidebarMenuButton aria-label="Open user menu">
                <span className="-mr-0.5 -ml-0.5 flex size-5 shrink-0 items-center justify-center">
                  {avatar}
                </span>
                <span className="text-foreground min-w-0 truncate text-[length:var(--fs-body,13px)] leading-[var(--lh-body,20px)]">
                  {name}
                </span>
                <span className="-mr-0.5 ml-auto flex size-6 shrink-0 items-center justify-center">
                  <ChevronsUpDown
                    size={iconSize}
                    strokeWidth={1.5}
                    className="text-muted-foreground"
                  />
                </span>
              </SidebarMenuButton>
            }
          />
          <DropdownContent
            className={SIDEBAR_MENU_POPUP}
            side="top"
            align="start"
            sideOffset={6}
          >
            {menu}
          </DropdownContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
