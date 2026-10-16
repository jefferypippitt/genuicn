"use client";

import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/sidebar-app/app-sidebar";
import { SidebarInsetTopbar } from "@/components/sidebar-app/inset-topbar";
import { usePageArrowKeys } from "@/components/docs/use-page-arrow-keys";
import { RightRailProvider } from "@/lib/right-rail";

export const SiteShell = ({
  children,
}: {
  readonly children: React.ReactNode;
}) => {
  usePageArrowKeys();
  return (
    <RightRailProvider>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset>
          <SidebarInsetTopbar />
          {children}
        </SidebarInset>
      </SidebarProvider>
    </RightRailProvider>
  );
};
