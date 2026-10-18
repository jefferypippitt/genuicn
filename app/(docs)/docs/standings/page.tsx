import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import bothRun from "@/content/recordings/standings-both.json";
import eastRun from "@/content/recordings/standings-east.json";
import westRun from "@/content/recordings/standings-west.json";
import { fontWeights } from "@/lib/font-weight";
import ConferenceGallery from "./conference-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "One NBA conference's regular-season table, with each team's record, games behind, home and away records, last ten games, and streak.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA standings · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The conference appears as soon as the model names it.",
  ],
  [
    "Loading.",
    "The model has finished the card, and the standings request is in flight. A row per team holds the table's height.",
  ],
  [
    "Ready.",
    "The table lists the conference's 15 teams in order, with wins, losses, win percentage, games behind, and records against the conference, at home, away, and over the last ten games, then the streak. Hovering a row lights it, on Fluid Functionalism's Table. On a narrow screen the table scrolls sideways.",
  ],
  ["Error.", "ESPN didn't answer, or sent no table for the conference."],
] as const;

const RUNS = [
  { label: "West", recording: westRun as ChatRecording },
  { label: "East", recording: eastRun as ChatRecording },
  { label: "Both conferences", recording: bothRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { standingsCatalogEntry } from "@/features/standings/standings-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // both conferences in one reply
    StandingsCard: standingsCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import LiveStandingsCard from "@/features/standings/components/live-standings-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    StandingsCard: ({ props, loading }) => (
      <LiveStandingsCard
        conference={props.conference || undefined}
        streaming={loading}
      />
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

export default function StandingsDocument() {
  return (
    <DocPage
      title="NBA standings"
      href="/docs/standings"
      description={DESCRIPTION}
      install={{
        card: "standings",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about the standings…"
        />
      </DocSection>

      <DocSection title="Conferences">
        <ConferenceGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card moves through four states as the model writes it and the
          standings arrive.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
