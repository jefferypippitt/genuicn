import { DocPage, DocSection } from "@/components/docs/doc-page";
import { ChatPlayground } from "@/components/docs/chat-playground";
import CheckInAgentPlayground from "@/components/docs/check-in-agent-playground";
import ba117Run from "@/content/recordings/flights-ba117.json";
import gateRun from "@/content/recordings/flights-ua837-gate.json";
import multiRun from "@/content/recordings/flights-multi.json";
import { fontWeights } from "@/lib/font-weight";
import TicketGallery from "./ticket-gallery";
import type { ChatRecording } from "@/lib/docs/chat-recording";
import type { Metadata } from "next";

const DESCRIPTION =
  "A boarding pass card. It looks up a flight number and shows the route, passenger, cabin, extras, boarding time, terminal, gate, group, and seat. The page also has a travel assistant that books flights and checks you in without a chat box.";

export const metadata: Metadata = {
  description: DESCRIPTION,
  title: "Flights · genuicn",
};

const STATES = [
  [
    "Streaming.",
    "The model is still writing the card. The flight number appears as soon as the model writes it.",
  ],
  [
    "Loading.",
    "The model has finished the card. The card is waiting for the pass from the flight service.",
  ],
  [
    "Ready.",
    "The card shows the route, the date, and the booking. The booking has the passenger, cabin, extras, boarding time, terminal, gate, group, and seat.",
  ],
  [
    "Error.",
    "The flight service has no flight with that number, or the flight service did not respond.",
  ],
] as const;

const RUNS = [
  { label: "BA 117", recording: ba117Run as ChatRecording },
  { label: "Which gate, UA 837", recording: gateRun as ChatRecording },
  { label: "Two flights", recording: multiRun as ChatRecording },
];

const CHECK_IN = [
  [
    "Task.",
    "Pick one task: book a flight, check in, change your seat, or get your boarding pass.",
  ],
  [
    "Search.",
    "A route card replaces the question. Search From and To by city or airport code. To lists only the cities that have flights from your From city. Pick a date on the calendar. Then pick a flight from the results, which show times and fares.",
  ],
  [
    "Find the booking.",
    "Type the booking reference, then the last name of the passenger.",
  ],
  [
    "Baggage.",
    "Pick no checked bag, one 50 lb bag, or two. Then say if you bring the free 18 lb cabin bag.",
  ],
  [
    "Seat.",
    "A seat map replaces the question. It shows your cabin from front to back. Taken seats are crossed out, each seat shows a price, and the first row has extra legroom. Tap a seat, then confirm it.",
  ],
  [
    "Extras.",
    "Pick any of Fast Track, lounge access, and lower-impact fuel, or skip them. Each extra shows its price.",
  ],
  [
    "Review.",
    "Check what you pay, line by line. To confirm, type the first name of the passenger. To change your choices, go back.",
  ],
] as const;

const AGENT_CODE = `// features/flights/check-in-conversation.ts: a booking field
// AskUserQuestions runs freeTextValidate on submit. A returned message keeps the step open.
{
  id: "reference",
  title: "Booking reference",
  freeText: true,
  freeTextMultiline: false, // one line, Enter submits
  freeTextPlaceholder: "K7QD2M",
  freeTextValidate: (value) =>
    /^[A-Z\\d]{6}$/u.test(value.replaceAll(/\\s+/gu, "").toUpperCase())
      ? null
      : "References are 6 letters and numbers, like K7QD2M.",
  skippable: false,
}

// app/check-in/page.tsx: the assistant needs no model and no composer
import CheckInAgent from "@/features/flights/components/check-in-agent";

export default function CheckInPage() {
  return (
    <main className="mx-auto flex h-svh w-full max-w-2xl flex-col">
      <CheckInAgent className="flex-1" />
    </main>
  );
}`;

const USAGE = `// features/chat/chat-catalog.ts: the cards the model may show
import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { boardingPassCatalogEntry } from "@/features/flights/flight-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    BoardingPass: boardingPassCatalogEntry,
    CardGroup: cardGroupCatalogEntry, // several cards in one reply
  },
});

// features/chat/chat-registry.tsx: how each card renders
import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveBoardingPassCard } from "@/features/flights/components/live-boarding-pass-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    BoardingPass: ({ props, loading }) => (
      <LiveBoardingPassCard
        flight={props.flight}
        date={props.date}
        variant={props.variant ?? "map"}
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

export default function FlightsDocument() {
  return (
    <DocPage
      title="Flights"
      href="/docs/flights"
      description={DESCRIPTION}
      install={{
        card: "flights",
        note: "Copy one prompt for your coding agent. It says how to install the card, how to turn it on in the chat, and which props the model writes.",
      }}
    >
      <DocSection title="Playground">
        <ChatPlayground
          runs={RUNS}
          code={USAGE}
          placeholder="Ask about a flight…"
        />
      </DocSection>

      <DocSection title="The travel assistant asks one step at a time">
        <CheckInAgentPlayground code={AGENT_CODE} />
        <List items={CHECK_IN} />
      </DocSection>

      <DocSection title="Each airline has its own pass">
        <TicketGallery />
      </DocSection>

      <DocSection title="The card has four states">
        <p>
          The state depends on how much of the card the model has written and
          whether the pass has arrived.
        </p>
        <List items={STATES} />
      </DocSection>
    </DocPage>
  );
}
