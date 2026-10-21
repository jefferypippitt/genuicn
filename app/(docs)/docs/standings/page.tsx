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
  "A card that shows the regular-season table of one NBA conference. Each row has the record, games behind, home and away records, last ten games, and streak of one team.";

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
    "The model has finished the card. The card is waiting for the standings from ESPN. One empty row for each team keeps the card at its full height.",
  ],
  [
    "Ready.",
    "The table lists the 15 teams of the conference in order. Each row has the wins, losses, win percentage, and games behind, the records against the conference, at home, away, and over the last ten games, and the streak. The row under the pointer is highlighted. On a narrow screen, the table scrolls sideways.",
  ],
  ["Error.", "ESPN did not respond, or ESPN sent no table for the conference."],
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

      <DocSection title="Each conference has its own table">
        <ConferenceGallery />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the standings have arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
