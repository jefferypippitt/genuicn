import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import knicksRun from "@/content/recordings/scoreboard-knicks.json";
import lakersRun from "@/content/recordings/scoreboard-lakers.json";
import multiRun from "@/content/recordings/scoreboard-multi.json";
import { fontWeights } from "@/lib/font-weight";
import GameGallery from "./game-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "One NBA game's live score, with both teams, their records, the clock, and the score of each quarter played so far.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA scoreboard · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The team appears as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card, and the score request is in flight.",
  ],
  [
    "Ready.",
    "The card shows both teams, their records, the score, how the game stands, the part of the season, and a table of each quarter played so far. Before a game it shows the start time instead. While the game is on, a red dot marks it live and the card reads the score again every 30 seconds.",
  ],
  [
    "Error.",
    "ESPN has no NBA team by that name, the team has no game on that date, or ESPN didn't answer.",
  ],
] as const;

const RUNS = [
  { label: "Lakers", recording: lakersRun as ChatRecording },
  { label: "Knicks, October 15", recording: knicksRun as ChatRecording },
  { label: "Three teams", recording: multiRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { scoreboardCatalogEntry } from "@/features/scoreboard/scoreboard-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    ScoreboardCard: scoreboardCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import LiveScoreboardCard from "@/features/scoreboard/components/live-scoreboard-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    ScoreboardCard: ({ props, loading }) => (
      <LiveScoreboardCard
        team={props.team || undefined}
        date={props.date}
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

export default function ScoreboardDocument() {
  return (
    <DocPage
      title="NBA scoreboard"
      href="/docs/scoreboard"
      description={DESCRIPTION}
      install={{
        card: "scoreboard",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about a game…"
        />
      </DocSection>

      <DocSection title="Season">
        <GameGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card moves through four states as the model writes it and the
          score arrives.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
