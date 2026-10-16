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
  "The temperature, conditions, and the next six hours on a glass card. The sky behind it is drawn from where the sun is and what the weather is doing there, so the clouds, haze, stars, and moon change with both.";

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
    "The model is still writing the card, so the place fills in as it arrives.",
  ],
  ["Loading.", "The card is complete and the forecast is on its way."],
  [
    "Ready.",
    "The temperature, conditions, high and low, and the next six hours, over a sky drawn for the sun and the weather there.",
  ],
  ["Error.", "The place wasn't found, or the weather service didn't answer."],
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
        note: "Copy one prompt that tells your coding agent how to install the card, turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about the weather…"
        />
      </DocSection>

      <DocSection title="Skies">
        <p>
          Each tab is a time of day, with the card in all eight conditions. The
          demo cards use generated data, so the sky is pinned to that hour.
        </p>
        <SkyGallery />
      </DocSection>

      <DocSection title="States">
        <p>
          The card has a state for each step, from the model writing it to the
          forecast arriving:
        </p>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          {STATES.map(renderState)}
        </ul>
      </DocSection>
    </DocPage>
  );
}
