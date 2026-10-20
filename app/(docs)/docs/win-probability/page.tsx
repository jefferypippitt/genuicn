import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import knicksRun from "@/content/recordings/winprob-knicks.json";
import thunderRun from "@/content/recordings/winprob-thunder.json";
import twoRun from "@/content/recordings/winprob-two.json";
import { fontWeights } from "@/lib/font-weight";
import GameGallery from "./game-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that shows the chance of each team to win one NBA game, with a bar in each team's color and what a win pays back. Before tip-off the card shows ESPN's prediction, during the game the live chance, and after the game the result.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA win probability · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The team appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the chances from ESPN.",
  ],
  [
    "Ready.",
    "The card shows the away team, then the home team. Each team has its logo, its name, and a bar filled to its chance in its color, with the percent inside the bar. The bar only shows the chance, so you cannot drag it. Under the bars, the card shows what a win pays back, for example 1.9x for a 53% chance. When both teams use the same color, the away team uses its second color. During the game, the card gets the chances again every 30 seconds.",
  ],
  [
    "Error.",
    "ESPN has no NBA team with that name, the team has no game on that date, ESPN has no prediction for the game yet, or ESPN did not respond.",
  ],
] as const;

const RUNS = [
  { label: "Knicks, October 20", recording: knicksRun as ChatRecording },
  { label: "Thunder's next game", recording: thunderRun as ChatRecording },
  { label: "Two games", recording: twoRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { winProbabilityCatalogEntry } from "@/features/win-probability/win-probability-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several games in one reply
    WinProbabilityCard: winProbabilityCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import LiveWinProbabilityCard from "@/features/win-probability/components/live-win-probability-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    WinProbabilityCard: ({ props, loading }) => (
      <LiveWinProbabilityCard
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

export default function WinProbabilityDocument() {
  return (
    <DocPage
      title="NBA win probability"
      href="/docs/win-probability"
      description={DESCRIPTION}
      install={{
        card: "win-probability",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask who will win a game…"
        />
      </DocSection>

      <DocSection title="The card changes before, during, and after the game">
        <GameGallery />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the chances have arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
