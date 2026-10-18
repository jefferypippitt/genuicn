"use client";

import { useState, useSyncExternalStore } from "react";
// eslint-disable-next-line react-doctor/use-lazy-motion -- the app imports motion directly everywhere, so LazyMotion here would save nothing
import { motion } from "motion/react";
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
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
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
import { spring } from "@/lib/springs";
import { cn } from "@/lib/utils";
import {
  SidebarWorkspaceHeader,
  WorkspaceTile,
} from "@/components/sidebar-app/workspace-header";
import {
  DocumentationSearchProvider,
  SidebarSearchTrigger,
} from "@/components/sidebar-app/documentation-search";
import { BUILT_SECTIONS } from "@/components/sidebar-app/nav-data";
import type { NavItem } from "@/components/sidebar-app/nav-data";
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

type NavRow =
  | { kind: "item"; item: NavItem }
  | { kind: "group"; label: string; items: NavItem[] };

/**
A section's rows: items with a group fold into one row for it, where the first of them stands.
*/
function rowsOf(items: readonly NavItem[]): NavRow[] {
  const rows: NavRow[] = [];
  const groups = new Map<string, NavItem[]>();
  for (const item of items) {
    if (!item.group) {
      rows.push({ item, kind: "item" });
      continue;
    }
    const members = groups.get(item.group);
    if (members) {
      members.push(item);
    } else {
      const fresh = [item];
      groups.set(item.group, fresh);
      rows.push({ items: fresh, kind: "group", label: item.group });
    }
  }
  return rows;
}

/**
A row that opens to its pages, e.g. NBA under Sports. Starts open, so its pages show without a click; the chevron turns down as it opens.
*/
const NavGroup = ({
  label,
  items,
  pathname,
  newSet,
}: {
  readonly label: string;
  readonly items: readonly NavItem[];
  readonly pathname: string;
  readonly newSet: ReadonlySet<string>;
}) => {
  const [isOpen, setIsOpen] = useState(true);
  const icons = useIcons();
  const iconSize = useSize().icon;
  const ChevronRight = icons["chevron-right"];
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        aria-expanded={isOpen}
        onClick={() => setIsOpen((open) => !open)}
      >
        {label}
        <motion.span
          className="-mr-0.5 ml-auto flex size-6 shrink-0 items-center justify-center"
          animate={{ rotate: isOpen ? 90 : 0 }}
          transition={spring.fast}
        >
          <ChevronRight
            size={iconSize}
            strokeWidth={isOpen ? 2 : 1.5}
            className={cn(
              "transition-[color,stroke-width] duration-80",
              isOpen ? "text-foreground" : "text-muted-foreground"
            )}
          />
        </motion.span>
      </SidebarMenuButton>
      <SidebarMenuSub open={isOpen}>
        {items.map((item) => (
          <SidebarMenuSubItem key={item.label}>
            <SidebarMenuSubButton
              render={item.href ? <Link href={item.href} /> : undefined}
              isActive={item.href === pathname}
            >
              {item.label}
              {item.href && newSet.has(item.href) ? <NewDot /> : null}
            </SidebarMenuSubButton>
          </SidebarMenuSubItem>
        ))}
      </SidebarMenuSub>
    </SidebarMenuItem>
  );
};

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
    <DocumentationSearchProvider>
      <Sidebar variant="inset" {...properties}>
        <SidebarHeader>
          <SidebarWorkspaceHeader
            name="genuicn"
            tile={<WorkspaceTile>g</WorkspaceTile>}
          />
          <SidebarSearchTrigger />
        </SidebarHeader>

        <SidebarContent>
          {BUILT_SECTIONS.map((section, sectionIndex) => (
            <SidebarGroup key={section.label} collapsible={sectionIndex > 0}>
              <SidebarGroupLabel>{section.label}</SidebarGroupLabel>
              <SidebarMenu>
                {rowsOf(section.items).map((row) => {
                  if (row.kind === "group") {
                    return (
                      <NavGroup
                        key={row.label}
                        label={row.label}
                        items={row.items}
                        pathname={pathname}
                        newSet={newSet}
                      />
                    );
                  }
                  const { item } = row;
                  return (
                    <SidebarMenuItem key={item.label}>
                      <SidebarMenuButton
                        icon={item.icon ? icons[item.icon] : undefined}
                        render={
                          item.href ? <Link href={item.href} /> : undefined
                        }
                        isActive={item.href === pathname}
                      >
                        {item.label}
                        {item.href && newSet.has(item.href) ? <NewDot /> : null}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroup>
          ))}
        </SidebarContent>

        <SidebarFooter>
          <ThemeFooter />
        </SidebarFooter>
      </Sidebar>
    </DocumentationSearchProvider>
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
