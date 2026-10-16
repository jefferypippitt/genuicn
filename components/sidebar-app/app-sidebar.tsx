"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
} from "@/components/ui/dropdown";
import { MenuItem } from "@/components/ui/menu-item";
import { useIcons } from "@/lib/icon-context";
import { useSize } from "@/lib/size-context";
import { SIDEBAR_MENU_POPUP } from "@/lib/sidebar-menu-grid";
import {
  SidebarWorkspaceHeader,
  WorkspaceTile,
} from "@/components/sidebar-app/workspace-header";
import { SidebarSearchField } from "@/components/sidebar-app/search-field";
import { BUILT_SECTIONS } from "@/components/sidebar-app/nav-data";
import type { SidebarProps } from "@/components/ui/sidebar";

const THEMES = [
  { value: "system", label: "System", icon: "monitor" },
  { value: "light", label: "Light", icon: "sun" },
  { value: "dark", label: "Dark", icon: "moon" },
] as const;

const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

/**
The blue "new" dot after a page the latest release added, the same blue the changelog uses for New.
*/
const NewDot = () => (
  <>
    <span
      aria-hidden
      className="ml-auto size-1.5 shrink-0 rounded-full bg-[var(--info)]"
    />
    <span className="sr-only">, new</span>
  </>
);

export const AppSidebar = ({
  newHrefs,
  ...properties
}: Omit<SidebarProps, "children"> & {
  /**
  Pages to mark as new, from the latest changelog release.
  */
  readonly newHrefs: readonly string[];
}) => {
  const newSet = new Set(newHrefs);
  const icons = useIcons();
  const pathname = usePathname();

  return (
    <Sidebar variant="inset" {...properties}>
      <SidebarHeader>
        <SidebarWorkspaceHeader
          name="genuicn"
          tile={<WorkspaceTile>g</WorkspaceTile>}
        />
        <SidebarSearchField placeholder="Search docs…" />
      </SidebarHeader>

      <SidebarContent>
        {BUILT_SECTIONS.map((section, sectionIndex) => (
          <SidebarGroup key={section.label} collapsible={sectionIndex > 0}>
            <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
            <SidebarMenu>
              {section.items.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    icon={item.icon ? icons[item.icon] : undefined}
                    render={item.href ? <Link href={item.href} /> : undefined}
                    isActive={item.href === pathname}
                  >
                    {item.label}
                    {item.href && newSet.has(item.href) ? <NewDot /> : null}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter>
        <ThemeFooter />
      </SidebarFooter>
    </Sidebar>
  );
};

const ThemeFooter = () => {
  const { theme, setTheme } = useTheme();
  const mounted = useMounted();
  const icons = useIcons();
  const iconSize = useSize().icon;
  const ChevronsUpDown = icons["chevrons-up-down"];

  const current = mounted ? (theme ?? "system") : "system";
  const currentIndex = Math.max(
    0,
    THEMES.findIndex((t) => t.value === current)
  );
  const { label, icon } = THEMES[currentIndex];

  return (
    <SidebarMenu aria-label="Theme">
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownTrigger
            render={
              <SidebarMenuButton icon={icons[icon]} aria-label="Change theme">
                {label}
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
            checkedIndex={currentIndex}
          >
            {THEMES.map((t, index) => (
              <MenuItem
                key={t.value}
                index={index}
                icon={icons[t.icon]}
                label={t.label}
                checked={t.value === current}
                onSelect={() => setTheme(t.value)}
              />
            ))}
          </DropdownContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
};
