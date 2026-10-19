"use client";

import { ChatMessage } from "@/components/ui/chat-message";
import { useSize } from "@/lib/size-context";
import { hostOf } from "@/lib/url-host";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface CitedSource {
  readonly id: string;
  readonly title: string;
  readonly url: string;
}

const CITATION = /\[\d+\]/gu;
const REFERENCE_LINE = /^\s*\[\d+\]\s+\S/u;

function withoutReferenceList(text: string): string {
  return text
    .split("\n")
    .filter((line) => !REFERENCE_LINE.test(line))
    .join("\n")
    .trimEnd();
}

function idOf(marker: string): string {
  return marker.slice(1, -1);
}

function Citation({ source }: { readonly source: CitedSource }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Source ${source.id}: ${source.title} (opens in a new tab)`}
      className="bg-muted text-muted-foreground hover:text-foreground focus-visible:ring-ring mx-0.5 inline-flex min-w-4 -translate-y-px items-center justify-center rounded px-1 align-baseline text-[0.7em] leading-4 font-medium tabular-nums no-underline outline-none focus-visible:ring-2"
    >
      {source.id}
    </a>
  );
}

function withCitations(
  text: string,
  byId: ReadonlyMap<string, CitedSource>
): ReactNode[] {
  const nodes: ReactNode[] = [];
  let offset = 0;
  for (const match of text.matchAll(CITATION)) {
    const source = byId.get(idOf(match[0]));
    if (!source) {
      continue;
    }
    nodes.push(
      text.slice(offset, match.index),
      <Citation key={match.index} source={source} />
    );
    offset = match.index + match[0].length;
  }
  nodes.push(text.slice(offset));
  return nodes;
}

export default function CitedAnswer({
  text: written,
  sources,
  isComplete,
}: {
  readonly text: string;
  readonly sources: readonly CitedSource[];
  readonly isComplete: boolean;
}) {
  const { type } = useSize();
  const text = withoutReferenceList(written);
  const byId = new Map(sources.map((source) => [source.id, source]));
  const citedIds = new Set(
    Array.from(text.matchAll(CITATION), (match) => idOf(match[0]))
  );
  const cited = sources.filter((source) => citedIds.has(source.id));

  return (
    <>
      <ChatMessage from="assistant">{withCitations(text, byId)}</ChatMessage>
      {isComplete && cited.length > 0 ? (
        <section aria-label="Sources" className="flex flex-col gap-1.5">
          <h3 className={cn(type.caption, "text-muted-foreground font-medium")}>
            Sources
          </h3>
          <ol className="flex flex-col gap-1">
            {cited.map((source) => (
              <li key={source.id} className={cn(type.caption, "flex gap-2")}>
                <span className="text-muted-foreground w-4 shrink-0 text-right tabular-nums">
                  {source.id}
                </span>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="focus-visible:ring-ring min-w-0 rounded outline-none hover:underline hover:underline-offset-2 focus-visible:ring-2"
                >
                  <span className="text-foreground">{source.title}</span>
                  <span className="text-muted-foreground">
                    {" "}
                    · {hostOf(source.url)}
                  </span>
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ol>
        </section>
      ) : null}
    </>
  );
}
