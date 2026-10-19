"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { usePageArrowKeys } from "@/components/docs/use-page-arrow-keys";
import { AppSidebar } from "@/components/sidebar-app/app-sidebar";
import { SidebarInsetTopbar } from "@/components/sidebar-app/inset-topbar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { RightRailProvider } from "@/lib/right-rail";
import { SurfaceProvider } from "@/lib/surface-context";

export const SiteShell = ({
  newHrefs,
  children,
}: {
  readonly newHrefs: readonly string[];
  readonly children: React.ReactNode;
}) => {
  usePageArrowKeys();
  const pathname = usePathname();
  const scrollerReference = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollerReference.current?.scrollTo(0, 0);
  }, [pathname]);

  return (
    <RightRailProvider>
      <SidebarProvider className="bg-surface-1 h-svh overflow-hidden">
        <AppSidebar newHrefs={newHrefs} />
        <SidebarInset className="overflow-hidden">
          <SurfaceProvider value={2}>
            <SidebarInsetTopbar />
            <div
              ref={scrollerReference}
              className="flex min-h-0 flex-1 flex-col overflow-y-auto"
            >
              {children}
            </div>
          </SurfaceProvider>
        </SidebarInset>
      </SidebarProvider>
    </RightRailProvider>
  );
};
