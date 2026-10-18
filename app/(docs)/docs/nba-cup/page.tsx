import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import allRun from "@/content/recordings/nba-cup-all.json";
import westRun from "@/content/recordings/nba-cup-west.json";
import westARun from "@/content/recordings/nba-cup-west-a.json";
import { fontWeights } from "@/lib/font-weight";
import GroupGallery from "./group-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "One NBA Cup group's table this season, with each team's games played, wins, losses, points for and against, and point difference.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA Cup · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The group appears as soon as the model names it.",
  ],
  [
    "Loading.",
    "The model has finished the card, and the table request is in flight. A row per team holds the table's height.",
  ],
  [
    "Ready.",
    "The table lists the group's five teams in the NBA's order, with games played, wins, losses, points scored and allowed, and the difference. Hovering a row lights it, on Fluid Functionalism's Table. On a narrow screen the table scrolls sideways.",
  ],
  [
    "Error.",
    "The NBA's stats service didn't answer, or has no table for the group this season yet.",
  ],
] as const;

const RUNS = [
  { label: "West Group A", recording: westARun as ChatRecording },
  { label: "The West", recording: westRun as ChatRecording },
  { label: "All six groups", recording: allRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { nbaCupCatalogEntry } from "@/features/nba-cup/nba-cup-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several groups in one reply
    NbaCupCard: nbaCupCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import LiveNbaCupCard from "@/features/nba-cup/components/live-nba-cup-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    NbaCupCard: ({ props, loading }) => (
      <LiveNbaCupCard group={props.group || undefined} streaming={loading} />
    ),
  },
});

// app/chat/page.tsx: the page composes, Chat is the client leaf
import { Chat } from "@/features/chat/components/chat";

export default function ChatPage() {
  return (
    <main className="mx-auto flex h-svh w-full max-w-2xl flex-col">
      <Chat className="flex-1" />
    </main>
  );
}`;
/* eslint-enable unicorn/no-incorrect-template-string-interpolation */

const List = ({
  items,
}: {
  readonly items: readonly (readonly [string, string])[];
}) => (
  <ul className="flex list-disc flex-col gap-1 pl-5">
    {items.map(([name, detail]) => (
      <li key={name}>
        <span style={{ fontVariationSettings: fontWeights.semibold }}>
          {name}
        </span>{" "}
        {detail}
      </li>
    ))}
  </ul>
);

export default function NbaCupDocument() {
  return (
    <DocPage
      title="NBA Cup"
      href="/docs/nba-cup"
      description={DESCRIPTION}
      install={{
        card: "nba-cup",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about the NBA Cup…"
        />
      </DocSection>

      <DocSection title="Groups">
        <GroupGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card moves through four states as the model writes it and the
          table arrives.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
