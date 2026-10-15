"use client";

import { useState, useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { CheckboxGroup, CheckboxItem } from "@/components/ui/checkbox-group";
import { Button } from "@/components/ui/button";
import { AppSidebar } from "@/components/sidebar-app/app-sidebar";
import { SidebarInsetTopbar } from "@/components/sidebar-app/inset-topbar";
import { useShapeContext } from "@/lib/shape-context";
import { useSizeContext, typeClass } from "@/lib/size-context";
import { SurfaceProvider } from "@/lib/surface-context";
import { fontWeights } from "@/lib/font-weight";
import { useIcons } from "@/lib/icon-context";
import { cn } from "@/lib/utils";
import type { SizeVariant } from "@/lib/size-context";
import type { ShapeVariant } from "@/lib/shape-context";

const THEMES = [
  { value: "system", label: "System" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const SHAPES: { value: ShapeVariant; label: string }[] = [
  { value: "rounded", label: "Rounded" },
  { value: "pill", label: "Pill" },
];
const SIZES: { value: SizeVariant; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "compact", label: "Compact" },
];
const TOPICS = ["Mentions", "Replies", "Weekly digest", "Product news"];

// The theme is only known in the browser (next-themes reads it after
// hydration), so the server renders the control with "system".
const subscribe = () => () => {};
function useMounted() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  );
}

export default function Page() {
  const { theme, setTheme } = useTheme();
  const { shape, setShape } = useShapeContext();
  const { size, setSize } = useSizeContext();
  const mounted = useMounted();
  const icons = useIcons();
  const [topics, setTopics] = useState<Set<number>>(new Set([0, 1]));

  const toggleTopic = (index: number) => {
    return setTopics((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <SidebarInsetTopbar />
        <main className="flex flex-1 justify-center p-6">
          <div className="flex w-full max-w-xl flex-col gap-10 py-10">
            <header className="flex flex-col gap-2">
              <h1
                className={cn(typeClass("display", size), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                Your app starts here
              </h1>
              <p
                className={cn(typeClass("body", size), "text-muted-foreground")}
              >
                Every Fluid Functionalism component is in components/ui, set to
                the choices you made on the site. Edit app/page.tsx to start
                building, and components/providers.tsx to change the defaults.
              </p>
            </header>

            <section className="flex flex-col gap-3">
              <h2
                className={cn(typeClass("subtitle", size), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                Make it yours
              </h2>
              {/* bg-muted is surface 2: popups opened in here lift above it */}
              <SurfaceProvider value={2}>
                <div className="bg-muted flex flex-col gap-1 rounded-xl p-3">
                  <SettingRow
                    label="Theme"
                    hint="Press D to flip light and dark"
                  >
                    <Select
                      value={mounted ? (theme ?? "system") : "system"}
                      onValueChange={setTheme}
                    >
                      <SelectTrigger
                        variant="borderless"
                        className="w-auto min-w-0"
                      />
                      <SelectContent>
                        {THEMES.map((o, index) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            index={index}
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Radius">
                    <Select
                      value={shape}
                      onValueChange={(v) => setShape(v as ShapeVariant)}
                    >
                      <SelectTrigger
                        variant="borderless"
                        className="w-auto min-w-0"
                      />
                      <SelectContent>
                        {SHAPES.map((o, index) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            index={index}
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                  <SettingRow label="Size">
                    <Select
                      value={size}
                      onValueChange={(v) => setSize(v as SizeVariant)}
                    >
                      <SelectTrigger
                        variant="borderless"
                        className="w-auto min-w-0"
                      />
                      <SelectContent>
                        {SIZES.map((o, index) => (
                          <SelectItem
                            key={o.value}
                            value={o.value}
                            index={index}
                          >
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </SettingRow>
                </div>
              </SurfaceProvider>
            </section>

            <section className="flex flex-col gap-3">
              <h2
                className={cn(typeClass("subtitle", size), "text-foreground")}
                style={{ fontVariationSettings: fontWeights.semibold }}
              >
                Notify me about
              </h2>
              {/* One hover highlight glides between rows; checked neighbours merge */}
              <CheckboxGroup checkedIndices={topics}>
                {TOPICS.map((label, index) => {
                  return (
                    <CheckboxItem
                      key={label}
                      index={index}
                      label={label}
                      checked={topics.has(index)}
                      onToggle={() => toggleTopic(index)}
                    />
                  );
                })}
              </CheckboxGroup>
            </section>

            <div className="flex flex-wrap gap-2">
              <Button variant="primary" leadingIcon={icons.check}>
                Save
              </Button>
              <Button variant="tertiary" onClick={() => setTopics(new Set())}>
                Clear
              </Button>
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}

const SettingRow = ({
  label,
  hint,
  children,
}: {
  readonly label: string;
  readonly hint?: string;
  readonly children: React.ReactNode;
}) => {
  const { size } = useSizeContext();
  return (
    <div className="flex items-center justify-between gap-4 pl-2">
      <div className="flex flex-col">
        <span className={cn(typeClass("body", size), "text-foreground")}>
          {label}
        </span>
        {hint ? (
          <span
            className={cn(typeClass("caption", size), "text-muted-foreground")}
          >
            {hint}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
};
