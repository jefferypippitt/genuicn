"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { useIcons } from "@/lib/icon-context";
import { useSize } from "@/lib/size-context";
import { fontWeights } from "@/lib/font-weight";
import { cn } from "@/lib/utils";

// Styled after Fluid Functionalism's docs copy command (MIT).

const COPIED_MS = 2000;

function unsubscribe() {}

function subscribe() {
  return unsubscribe;
}

function clearTimer(timer: ReturnType<typeof setTimeout> | null) {
  if (timer) {
    clearTimeout(timer);
  }
}

export function CopyCommand({ command }: { readonly command: string }) {
  const { type } = useSize();
  const icons = useIcons();
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => clearTimer(timer.current), []);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(command);
    } catch {
      return;
    }
    setCopied(true);
    clearTimer(timer.current);
    timer.current = setTimeout(() => setCopied(false), COPIED_MS);
  }, [command]);

  const Icon = copied ? icons.check : icons.copy;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={`Copy to clipboard: ${command}`}
      className="group flex w-fit max-w-full cursor-pointer items-center rounded-lg transition-shadow duration-80 outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--focus-ring,#6B97FF)]"
    >
      <span className="text-muted-foreground group-hover:text-foreground shrink-0 px-1.5 py-2 transition-colors duration-80">
        <Icon size={16} strokeWidth={1.5} />
      </span>
      <span
        className={cn(
          type.body,
          "text-foreground min-w-0 flex-1 truncate py-2 pl-1 text-left font-mono select-none"
        )}
        style={{ fontVariationSettings: fontWeights.normal }}
      >
        <mark className="text-foreground group-hover:text-foreground bg-transparent transition-colors duration-80 group-hover:bg-[#6B97FF]/20">
          {command}
        </mark>
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </button>
  );
}

export function InstallCommand({
  item,
  flags,
}: {
  readonly item: string;
  readonly flags?: string;
}) {
  const origin = useSyncExternalStore(
    subscribe,
    () => window.location.origin,
    () => ""
  );
  const suffix = flags ? ` ${flags}` : "";
  return (
    <CopyCommand
      command={`npx shadcn@latest add ${origin}/r/${item}.json${suffix}`}
    />
  );
}
