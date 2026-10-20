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
  "A card that shows NBA players this season, one row for each player. Each row has the photo, number, height, age, and experience, the points, assists, rebounds, and steals per game, and the current team. One table can compare several players.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "NBA player · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The name of each player appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the players from ESPN. The header and one empty row for each player keep the card at its full height.",
  ],
  [
    "Ready.",
    "The table has one row for each player, in the order of the question, so every stat lines up for comparison. Each row has the photo, number, name, height, age, seasons in the league (R for a rookie), and points, assists, rebounds, and steals per game. When all the players are on one team, the header names the team. If not, each name has its team under it. On a narrow screen, the table scrolls sideways.",
  ],
  [
    "Error.",
    "The card found none of the players. ESPN has no NBA player with that name, the player is not on a team, or ESPN did not respond. When only some players are missing, the card shows the others and names the missing players in one line.",
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

      <DocSection title="One table compares several players">
        <PlayerGallery />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the players have arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
