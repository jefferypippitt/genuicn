"use client";

import { createContext, useContext, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CommandMenu,
  CommandMenuDialog,
  CommandMenuEmpty,
  CommandMenuFooter,
  CommandMenuInput,
  CommandMenuList,
  CommandMenuTabs,
  formatShortcut,
  useIsMac,
} from "@/components/ui/command-menu";
import { useIcons } from "@/lib/icon-context";
import { fullLabel, NAV_SECTIONS } from "@/components/sidebar-app/nav-data";
import { SidebarSearchField } from "@/components/sidebar-app/search-field";
import type { CommandMenuItemData } from "@/components/ui/command-menu";
import type { IconComponent, IconName } from "@/lib/icon-context";
import type { NavSection } from "@/components/sidebar-app/nav-data";
import type { ReactNode } from "react";

/**
Pages listed first while the field is empty — entry points, not a sidebar dump.
*/
const SUGGESTED_HREFS = [
  "/docs/installation",
  "/docs/quote",
  "/docs/weather",
  "/changelog",
] as const;

const ALL_TAB = "all";

interface DocumentationSearchContextValue {
  readonly isOpen: boolean;
  readonly setIsOpen: (isOpen: boolean) => void;
}

const DocumentationSearchContext =
  createContext<DocumentationSearchContextValue | null>(null);

function useDocumentationSearch(): DocumentationSearchContextValue {
  const value = useContext(DocumentationSearchContext);
  if (!value) {
    throw new Error(
      "Sidebar search must be inside DocumentationSearchProvider"
    );
  }
  return value;
}

function plannedValue(section: NavSection, label: string): string {
  return `planned:${section.label}:${label}`;
}

/**
Every nav row, including cards that are not built yet. Search is discovery
(type what a card does); the sidebar stays navigation of what is ready.
*/
function searchItems(
  icons: Record<IconName, IconComponent>
): CommandMenuItemData[] {
  const items: CommandMenuItemData[] = [];
  for (const section of NAV_SECTIONS) {
    for (const item of section.items) {
      const label = fullLabel(item);
      const isBuilt = Boolean(item.href);
      items.push({
        action: isBuilt ? `Open ${label}` : "On the roadmap",
        description: item.description,
        disabled: !isBuilt,
        group: section.label,
        icon: item.icon ? icons[item.icon] : undefined,
        keywords: item.group ? [item.group, section.label] : [section.label],
        label,
        value: item.href ?? plannedValue(section, item.label),
      });
    }
  }
  return items;
}

function sectionTabs(): { label: string; value: string }[] {
  return [
    { label: "All", value: ALL_TAB },
    ...NAV_SECTIONS.map((section) => ({
      label: section.label,
      value: section.label,
    })),
  ];
}

/**
One command menu for the site. The dialog is a sibling of the sidebar, so the mobile sheet — which mounts the sidebar's children a second time — does not register a second shortcut listener.

Shape: descriptions + suggestions + section tabs (CommandMenu "discovery"
preset), so search answers "what does this card do?" and scales as sections
grow. https://www.fluidfunctionalism.com/docs/command-menu
*/
export const DocumentationSearchProvider = ({
  children,
}: {
  readonly children: ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState(ALL_TAB);
  const router = useRouter();
  const icons = useIcons();
  const allItems = useMemo(() => searchItems(icons), [icons]);
  const tabs = useMemo(() => sectionTabs(), []);
  const items = useMemo(
    () =>
      tab === ALL_TAB
        ? allItems
        : allItems.filter((item) => item.group === tab),
    [allItems, tab]
  );
  const value = useMemo(() => ({ isOpen, setIsOpen }), [isOpen]);

  return (
    <DocumentationSearchContext.Provider value={value}>
      {children}
      <CommandMenuDialog
        description="Find a page by name or what it does."
        onOpenChange={(open) => {
          setIsOpen(open);
          if (!open) {
            setTab(ALL_TAB);
          }
        }}
        open={isOpen}
        title="Search docs"
      >
        <CommandMenu
          items={items}
          onSelect={(item) => {
            if (item.disabled || !item.value.startsWith("/")) {
              return;
            }
            router.push(item.value);
          }}
          suggestions={[...SUGGESTED_HREFS]}
          suggestionsLabel="Jump to"
        >
          <CommandMenuInput placeholder="Search by name or what it does…" />
          <CommandMenuTabs onValueChange={setTab} tabs={tabs} value={tab} />
          <CommandMenuList>
            <CommandMenuEmpty>No results.</CommandMenuEmpty>
          </CommandMenuList>
          <CommandMenuFooter />
        </CommandMenu>
      </CommandMenuDialog>
    </DocumentationSearchContext.Provider>
  );
};

/**
The sidebar control that opens the docs command menu.
*/
export const SidebarSearchTrigger = () => {
  const { isOpen, setIsOpen } = useDocumentationSearch();
  const isMac = useIsMac();
  const shortcut = formatShortcut("mod+k", isMac).join(isMac ? "" : " ");
  return (
    <SidebarSearchField
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      onClick={() => setIsOpen(true)}
      placeholder="Search docs…"
      shortcut={shortcut}
    />
  );
};
