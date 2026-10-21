import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import nvdaRun from "@/content/recordings/candlestick-nvda.json";
import teslaRun from "@/content/recordings/candlestick-tesla.json";
import multiRun from "@/content/recordings/candlestick-multi.json";
import { fontWeights } from "@/lib/font-weight";
import RangeGallery from "./range-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that shows how a stock moved: one candle per period with its open, high, low, and close, the volume under the candles, and a switch for 1D, 1W, 1M, 6M, and 1Y.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Candlestick · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The ticker appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for its candles from Yahoo Finance.",
  ],
  [
    "Ready.",
    "The header shows the ticker, the company name, the price, and the change over the range. Under the header are the candles, the volume bars, and the high and low of the range. A rising candle is hatched and a falling candle is solid, so the two differ without color. To read one candle, point at it, drag across the chart, or focus the chart and press the arrow keys. A label then shows the close and the time of that candle.",
  ],
  [
    "Error.",
    "Yahoo Finance has no ticker with that symbol, or Yahoo Finance did not respond. The card shows the reason.",
  ],
] as const;

const ROUTING = [
  [
    "This card.",
    `Questions about how a stock moved, such as "How did Tesla trade today?", "What was AMD's high and low this week?", and "Show me the chart for SPY."`,
  ],
  [
    "The Quote card.",
    `Questions about where a stock stands, such as "How's NVDA doing?", "Is Tesla up today?", and "How has Amazon done this year?"`,
  ],
  [
    "A text answer.",
    'Questions about why a stock moved, such as "Why did Apple drop on Friday?" The model searches the web and answers in sentences.',
  ],
] as const;

const RUNS = [
  { label: "NVIDIA", recording: nvdaRun as ChatRecording },
  { label: "Tesla today", recording: teslaRun as ChatRecording },
  { label: "Two stocks", recording: multiRun as ChatRecording },
];

/* eslint-disable unicorn/no-incorrect-template-string-interpolation -- a code sample: its {children} and {loading} are JSX, not template slots */
const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { candlestickCatalogEntry } from "@/features/candlestick/candlestick-catalog";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CandlestickCard: candlestickCatalogEntry,
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { LiveCandlestickCard } from "@/features/candlestick/components/live-candlestick-card";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";

export const { registry } = defineRegistry(catalog, {
  components: {
    CandlestickCard: ({ props, loading }) => (
      <LiveCandlestickCard
        ticker={props.ticker || undefined}
        range={props.range ?? "1m"}
        streaming={loading}
      />
    ),
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
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

export default function CandlestickDocument() {
  return (
    <DocPage
      title="Candlestick"
      href="/docs/candlestick"
      description={DESCRIPTION}
      install={{
        card: "candlestick",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask how a stock traded…"
        />
      </DocSection>

      <DocSection title="Each range sets the candle size">
        <RangeGallery />
      </DocSection>

      <DocSection title="The question picks the card">
        <p>
          People rarely ask for a candlestick chart by name. The model reads
          what the question asks about and follows the rule in{" "}
          <code className="font-mono">candlestick-catalog.ts</code>. Each kind
          of question gets one kind of reply:
        </p>
        <List items={ROUTING} />
        <p>
          The model also opens the card on the period that the question names.
          &quot;Today&quot; opens 1D, &quot;this week&quot; opens 1W, and
          &quot;this month&quot; opens 1M. A question without a period opens 1M.
        </p>
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the candles have arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
