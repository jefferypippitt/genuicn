import { ChatPlayground } from "@/components/docs/chat-playground";
import { DocPage, DocSection } from "@/components/docs/doc-page";
import londonRun from "@/content/recordings/weather-london.json";
import multiRun from "@/content/recordings/weather-multi.json";
import newYorkRun from "@/content/recordings/weather-new-york.json";
import tokyoRun from "@/content/recordings/weather-tokyo.json";
import { fontWeights } from "@/lib/font-weight";
import SkyGallery from "./sky-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A card that shows the temperature, the conditions, and the next six hours. The sky behind them follows the time of day and the weather at that place, so the clouds, haze, stars, and moon change with both.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Weather · genuicn",
};

const RUNS = [
  { label: "New York", recording: newYorkRun as ChatRecording },
  { label: "Raining in London?", recording: londonRun as ChatRecording },
  { label: "Tokyo in Celsius", recording: tokyoRun as ChatRecording },
  { label: "Three cities", recording: multiRun as ChatRecording },
];

const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { weatherCatalogEntry } from "@/features/weather/weather-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
    WeatherCard: weatherCatalogEntry,
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { LiveWeatherCard } from "@/features/weather/components/live-weather-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    WeatherCard: ({ props, loading }) => (
      <LiveWeatherCard
        location={props.location || undefined}
        units={props.units}
        streaming={loading}
      />
    ),
  },
});`;

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The place appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the forecast from Open-Meteo.",
  ],
  [
    "Ready.",
    "The card shows the temperature, the conditions, the high and low, and the next six hours. The sky matches the time of day and the weather at that place.",
  ],
  [
    "Error.",
    "Open-Meteo has no place with that name, or Open-Meteo did not respond.",
  ],
] as const;

function renderState([name, detail]: (typeof STATES)[number]) {
  return (
    <li key={name}>
      <span style={{ fontVariationSettings: fontWeights.semibold }}>
        {name}
      </span>{" "}
      {detail}
    </li>
  );
}

export default function WeatherPage() {
  return (
    <DocPage
      title="Weather"
      href="/docs/weather"
      description={DESCRIPTION}
      install={{
        card: "weather",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about the weather…"
        />
      </DocSection>

      <DocSection title="The sky follows the time of day">
        <SkyGallery />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the forecast has arrived.
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {STATES.map(renderState)}
        </ul>
      </DocSection>
    </DocPage>
  );
}
