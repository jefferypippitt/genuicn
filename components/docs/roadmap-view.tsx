"use client";

import { DocSection } from "@/components/docs/doc-page";
import { fullLabel, NAV_SECTIONS } from "@/components/sidebar-app/nav-data";
import { fontWeights } from "@/lib/font-weight";
import { useIcons } from "@/lib/icon-context";
import type { NavItem } from "@/components/sidebar-app/nav-data";

const PLANNED = NAV_SECTIONS.filter((section) => section.kind === "cards")
  .map((section) => ({
    items: section.items.filter((item) => !item.href),
    label: section.label,
  }))
  .filter((section) => section.items.length > 0);

function PlannedCard({ item }: { readonly item: NavItem }) {
  const { circle: Circle } = useIcons();
  return (
    <li className="flex gap-3">
      <span className="text-muted-foreground mt-0.5 flex size-5 shrink-0 items-center justify-center">
        <Circle className="size-3.5" aria-hidden />
      </span>
      <div className="flex min-w-0 flex-col gap-1">
        <p style={{ fontVariationSettings: fontWeights.semibold }}>
          {fullLabel(item)}
        </p>
        {item.description ? (
          <p className="text-muted-foreground">{item.description}</p>
        ) : null}
      </div>
    </li>
  );
}

export function RoadmapView() {
  return (
    <>
      {PLANNED.map((section) => (
        <DocSection key={section.label} title={section.label}>
          <ul className="flex flex-col gap-4">
            {section.items.map((item) => (
              <PlannedCard key={fullLabel(item)} item={item} />
            ))}
          </ul>
        </DocSection>
      ))}
    </>
  );
}
