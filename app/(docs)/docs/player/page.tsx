import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import maxeyRun from "@/content/recordings/player-maxey.json";
import lebronRun from "@/content/recordings/player-lebron.json";
import twoRun from "@/content/recordings/player-two.json";
import { fontWeights } from "@/lib/font-weight";
import PlayerGallery from "./player-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "NBA players this season, one row each: photo, number, height, age and experience, with points, assists, rebounds and steals per game, and the team each plays for now. Compare several in one table.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA player · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. Each player's name appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card, and the player requests are in flight. The header and a row per player hold the card's height.",
  ],
  [
    "Ready.",
    "One row per player on Fluid Functionalism's Table, in the order asked, so every stat lines up for comparing: photo, number, name, height, age, seasons in the league (R for a rookie), and points, assists, rebounds and steals per game. The header names the team when they share one; otherwise each name has its team under it. On a narrow screen the table scrolls sideways.",
  ],
  [
    "Error.",
    "None of the players could be found: ESPN has no NBA player by that name, he isn't on a team, or ESPN didn't answer. When only some are missing, the others show and a line names the ones that weren't found.",
  ],
] as const;

const RUNS = [
  { label: "LeBron James", recording: lebronRun as ChatRecording },
  { label: "Tyrese Maxey", recording: maxeyRun as ChatRecording },
  { label: "Compare two players", recording: twoRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { playerCatalogEntry } from "@/features/player/player-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    PlayerCard: playerCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import LivePlayerCard from "@/features/player/components/live-player-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    PlayerCard: ({ props, loading }) => (
      <LivePlayerCard players={props.players} streaming={loading} />
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

export default function PlayerDocument() {
  return (
    <DocPage
      title="NBA player"
      href="/docs/player"
      description={DESCRIPTION}
      install={{
        card: "player",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about a player or team…"
        />
      </DocSection>

      <DocSection title="Players">
        <PlayerGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card moves through four states as the model writes it and the
          player arrives.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
