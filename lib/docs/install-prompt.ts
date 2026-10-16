function chatSetup(origin: string) {
  return `1. If the project doesn't have the genuicn chat yet (no features/chat/chat-catalog.ts), install it once:
npx shadcn@latest add ${origin}/r/chat.json --overwrite
It adds a json-render chat (Vercel AI SDK, Fluid Functionalism UI) with app/api/chat/route.ts, a /chat page, and features/chat/chat-catalog.ts, features/chat/chat-registry.tsx and features/chat/chat-steps.ts where cards are turned on. Each reply shows Fluid Functionalism's ThinkingSteps (understanding the question, looking up each card's data with linked sources, done), then folds them away and shows the cards as the final answer. --overwrite lets it replace stock shadcn files of the same name (button.tsx, tooltip.tsx); check those first if they were customized. It adds AI_GATEWAY_API_KEY to .env.local: ask me for the key (Vercel dashboard > AI Gateway > API Keys) instead of inventing one.`;
}

function quoteInstallPrompt(origin: string): string {
  return `Add the Quote card from genuicn to my Next.js app. It's a live stock quote card (price, change, a trend line and a 1D/1W/1M/1Y switch) that the chat's model can show.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/quote.json
It adds features/quote/ and app/api/quote/route.ts, which the card loads live quotes from (Yahoo Finance, no API key). Don't edit the API routes.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several cards):
features/chat/chat-catalog.ts
  import { quoteCatalogEntry } from "@/features/quote/quote-catalog";
  QuoteCard: quoteCatalogEntry,
features/chat/chat-registry.tsx
  import { LiveQuoteCard } from "@/features/quote/components/live-quote-card";
  QuoteCard: ({ props, loading }) => (
    <LiveQuoteCard ticker={props.ticker} range={props.range ?? "1d"} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { quoteLookup } from "@/features/quote/quote-steps";
  QuoteCard: quoteLookup,

4. Check it: run the dev server, open /chat and ask "How's NVDA doing?", then "Prices for NVDA, Apple and Tesla?" for several cards in one reply.

The model only writes the card's props; the card fetches the numbers itself:
- ticker: string, e.g. "NVDA"
- range: "1d" | "1w" | "1m" | "1y" | null (null means today)

Docs: ${origin}/docs/quote`;
}

function weatherInstallPrompt(origin: string): string {
  return `Add the Weather card from genuicn to my Next.js app. It's a live weather card (temperature, conditions, high and low, and the next six hours, on an animated sky that matches the time of day and the weather there) that the chat's model can show.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/weather.json
It adds features/weather/ and app/api/weather/route.ts, which the card loads live forecasts from (Open-Meteo, no API key). Don't edit the API routes.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several cards):
features/chat/chat-catalog.ts
  import { weatherCatalogEntry } from "@/features/weather/weather-catalog";
  WeatherCard: weatherCatalogEntry,
features/chat/chat-registry.tsx
  import { LiveWeatherCard } from "@/features/weather/components/live-weather-card";
  WeatherCard: ({ props, loading }) => (
    <LiveWeatherCard location={props.location || undefined} units={props.units} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { weatherLookup } from "@/features/weather/weather-steps";
  WeatherCard: weatherLookup,

4. Check it: run the dev server, open /chat and ask "What's the weather in Austin?", then "Weather in Tokyo, London and New York?" for several cards in one reply.

The model only writes the card's props; the card fetches the forecast itself:
- location: string, e.g. "Austin" or "Paris, France"
- units: "f" | "c" | null (null means the place's usual units)

Docs: ${origin}/docs/weather`;
}

function chatInstallPrompt(origin: string): string {
  return `Set up the genuicn chat in my Next.js app: a json-render chat where the model shows live cards (stock quotes and more) instead of plain text.

${chatSetup(origin)}

2. Check it: run the dev server and open /chat. With no cards turned on yet, the model answers in text.

3. Add cards: each genuicn card is one shadcn command plus one entry in each of features/chat/chat-catalog.ts, features/chat/chat-registry.tsx and features/chat/chat-steps.ts. For example, the Quote card:
npx shadcn@latest add ${origin}/r/quote.json
Its exact lines are in the Copy prompt on ${origin}/docs/quote.

Docs: ${origin}/docs/installation`;
}

export const INSTALL_PROMPTS = {
  chat: chatInstallPrompt,
  quote: quoteInstallPrompt,
  weather: weatherInstallPrompt,
} satisfies Record<string, (origin: string) => string>;

export type InstallCard = keyof typeof INSTALL_PROMPTS;
