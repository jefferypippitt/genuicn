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
  "Each team's chance of winning one NBA game: both teams' logos, a bar in each team's color with the percent in the bar, and what a win pays back. ESPN's prediction before tip-off, the live chance during the game, the result after.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA win probability · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The team appears as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card, and the chances request is in flight.",
  ],
  [
    "Ready.",
    "Both teams, away then home, each with its logo and name over Fluid's scrubber Slider filled to its chance in its color (read-only — you can't scrub the odds; the percent sits in the bar), then what a win pays back (1.9x for 53%). When both teams share a color, the away team takes its second one. While the game is on, the card reads the chances again every 30 seconds.",
  ],
  [
    "Error.",
    "ESPN has no NBA team by that name, the team has no game on that date, ESPN hasn't predicted the game yet, or ESPN didn't answer.",
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

      <DocSection title="Game states">
        <GameGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card moves through four states as the model writes it and the
          chances arrive.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
