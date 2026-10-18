function chatSetup(origin: string) {
  return `1. If the project doesn't have the genuicn chat yet (no features/chat/chat-catalog.ts), install it once:
npx shadcn@latest add ${origin}/r/chat.json --overwrite
It adds a json-render chat (Vercel AI SDK, Fluid Functionalism UI) with app/api/chat/route.ts, a /chat page, and features/chat/chat-catalog.ts, features/chat/chat-registry.tsx and features/chat/chat-steps.ts where cards are turned on. Each reply shows Fluid Functionalism's ThinkingSteps (understanding the question, looking up each card's data with linked sources, done), then folds them away and shows the cards as the final answer. --overwrite lets it replace stock shadcn files of the same name (button.tsx, tooltip.tsx); check those first if they were customized. It adds AI_GATEWAY_API_KEY to .env.local: ask me for the key (Vercel dashboard > AI Gateway > API Keys) instead of inventing one.`;
}

function cryptoInstallPrompt(origin: string): string {
  return `Add the Crypto card from genuicn to my Next.js app. It's a live crypto price card (price, change, market cap, 24-hour volume and a trend line with a 24H/1W/1M/1Y/All switch) that the chat's model can show.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/crypto.json
It adds features/crypto/ and app/api/crypto/route.ts, which the card loads prices from (CoinGecko's public API, plus Kraken's for the All range, neither needs an API key). CoinGecko's free tier allows only a few requests a minute, so the route caches each coin and range and serves the last good price when CoinGecko is busy; leave that in place. Coin logos load as plain <img> tags from coin-images.coingecko.com: if my app sets a Content-Security-Policy, add it to img-src.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several cards):
features/chat/chat-catalog.ts
  import { cryptoCatalogEntry } from "@/features/crypto/crypto-catalog";
  CryptoCard: cryptoCatalogEntry,
features/chat/chat-registry.tsx
  import { LiveCryptoCard } from "@/features/crypto/components/live-crypto-card";
  CryptoCard: ({ props, loading }) => (
    <LiveCryptoCard symbol={props.symbol || undefined} range={props.range ?? "24h"} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { cryptoLookup } from "@/features/crypto/crypto-steps";
  CryptoCard: cryptoLookup,

4. Check it: run the dev server, open /chat and ask "How's Bitcoin doing?", then "Prices for Bitcoin, Ethereum and Solana?" for several cards in one reply.

The model only writes the card's props; the card fetches the numbers itself:
- symbol: string, e.g. "BTC"
- range: "24h" | "1w" | "1m" | "1y" | "all" | null (null means the past 24 hours)

Docs: ${origin}/docs/crypto`;
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

function flightsInstallPrompt(origin: string): string {
  return `Add the Flights card from genuicn to my Next.js app. It's a live boarding pass shaped like a ticket (the route over a world map, or the whole ticket in the airline's colors, flight, date, passenger, class, boarding time, terminal, gate, group and seat) that the chat's model can show for the user's flights, plus a check-in assistant: a page that finds the booking (reference and last name), asks for bags, a seat and extras with Fluid Functionalism's AskUserQuestions, reviews the price, then shows the pass.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/flights.json
It adds features/flights/, app/api/flights/route.ts (the pass) app/api/flights/check-in/route.ts (the pass plus a seat map of the cabin for check-in) and app/api/flights/search/route.ts (flights between two cities on a date, from the demo timetable in features/flights/flight-network.ts), and Fluid Functionalism's AskUserQuestions for the assistant's questions. The route comes from adsbdb (no API key). The booking (passenger, seat, class, terminal, gate, group, boarding time) comes from getBooking in features/flights/flight-booking.ts, and the check-in seat map and its prices from getSeatMap next to it; both return demo data: point it at my booking system for the signed-in traveler when I'm ready, and leave the rest of the API route alone. Airline logos load as plain <img> tags from pics.avs.io (no API key, no next.config change), with a letter tile when a logo is missing or blocked: if my app sets a Content-Security-Policy, add https://pics.avs.io to img-src, or point airlineLogoUrl in features/flights/flight-schema.ts at my own logo host.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several cards):
features/chat/chat-catalog.ts
  import { boardingPassCatalogEntry } from "@/features/flights/flight-catalog";
  BoardingPass: boardingPassCatalogEntry,
features/chat/chat-registry.tsx
  import { LiveBoardingPassCard } from "@/features/flights/components/live-boarding-pass-card";
  BoardingPass: ({ props, loading }) => (
    <LiveBoardingPassCard flight={props.flight || undefined} date={props.date} variant={props.variant ?? "map"} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for these cards)
  import { boardingPassLookup } from "@/features/flights/flight-steps";
  BoardingPass: boardingPassLookup,
For the check-in assistant, add a page that renders it in a full-height column (it needs no model and no chat box):
  import CheckInAgent from "@/features/flights/components/check-in-agent";
  <main className="mx-auto flex h-svh w-full max-w-2xl flex-col"><CheckInAgent className="flex-1" /></main>

4. Check it: run the dev server, open /chat and ask "Show my boarding pass for BA 117 on November 3", then "Boarding passes for BA 117 and UA 837?" for several cards in one reply. Then open the check-in assistant's page, pick "Check in for my flight", enter any 6-character reference like K7QD2M and a last name, and answer the questions: it ends with the pass in the seat you picked, with your extras.

The model only writes the card's props; the card loads its data itself:
- flight: string, e.g. "BA 117"
- date: string | null, as YYYY-MM-DD (null means today)
- variant: "map" | "brand" | null. "brand" paints the ticket in the airline's colors from features/flights/airline-brands.ts. Null means "map", the world map ticket.

Docs: ${origin}/docs/flights`;
}

function scoreboardInstallPrompt(origin: string): string {
  return `Add the NBA scoreboard card from genuicn to my Next.js app. It's a live scoreboard for one NBA game (both teams with their logos and records, the score, the clock or final, and a table of each quarter played so far) that the chat's model can show.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/scoreboard.json
It adds features/scoreboard/ and app/api/scoreboard/route.ts, which the card loads scores from (ESPN's public site API, no API key). A game in progress reads its score again every 30 seconds. Team logos load as plain <img> tags from a.espncdn.com, with a letter tile when a logo is missing or blocked: if my app sets a Content-Security-Policy, add it to img-src.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several cards):
features/chat/chat-catalog.ts
  import { scoreboardCatalogEntry } from "@/features/scoreboard/scoreboard-catalog";
  ScoreboardCard: scoreboardCatalogEntry,
features/chat/chat-registry.tsx
  import LiveScoreboardCard from "@/features/scoreboard/components/live-scoreboard-card";
  ScoreboardCard: ({ props, loading }) => (
    <LiveScoreboardCard team={props.team || undefined} date={props.date} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { scoreboardLookup } from "@/features/scoreboard/scoreboard-steps";
  ScoreboardCard: scoreboardLookup,

4. Check it: run the dev server, open /chat and ask "What's the Lakers score?", then "Scores for the Heat, the Knicks and the Warriors?" for several cards in one reply.

The model only writes the card's props; the card fetches the score itself:
- team: string, the NBA team, e.g. "Los Angeles Lakers"
- date: string | null, as YYYY-MM-DD (null means the team's current game: today's, or the closest one to now)

Docs: ${origin}/docs/scoreboard`;
}

function standingsInstallPrompt(origin: string): string {
  return `Add the NBA standings card from genuicn to my Next.js app. It's one conference's regular-season table (each team's place, logo, wins, losses, win percentage, games behind, conference, home, away and last-ten records, and streak) that the chat's model can show.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/standings.json
It adds features/standings/, app/api/standings/route.ts, which the card loads the table from (ESPN's public site API, no API key), and Fluid Functionalism's Table. Team logos load as plain <img> tags from a.espncdn.com, with the team's letters when a logo is missing or blocked: if my app sets a Content-Security-Policy, add it to img-src.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show both conferences):
features/chat/chat-catalog.ts
  import { standingsCatalogEntry } from "@/features/standings/standings-catalog";
  StandingsCard: standingsCatalogEntry,
features/chat/chat-registry.tsx
  import LiveStandingsCard from "@/features/standings/components/live-standings-card";
  StandingsCard: ({ props, loading }) => (
    <LiveStandingsCard conference={props.conference || undefined} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { standingsLookup } from "@/features/standings/standings-steps";
  StandingsCard: standingsLookup,

4. Check it: run the dev server, open /chat and ask "Show me the Western Conference standings", then "NBA standings" for both conferences in one reply.

The model only writes the card's props; the card fetches the table itself:
- conference: "east" | "west"

Docs: ${origin}/docs/standings`;
}

function nbaCupInstallPrompt(origin: string): string {
  return `Add the NBA Cup card from genuicn to my Next.js app. It's one NBA Cup group's table this season (its five teams in order, each with its logo, games played, wins, losses, points for and against, and point difference) that the chat's model can show.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/nba-cup.json
It adds features/nba-cup/, app/api/nba-cup/route.ts, which the card loads the table from (the NBA's public stats API, no API key; the route sends the browser-like headers that API needs, and keeps one answer for all six groups for a minute), and Fluid Functionalism's Table. Team logos load as plain <img> tags from a.espncdn.com, with the team's letters when a logo is missing or blocked: if my app sets a Content-Security-Policy, add it to img-src.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several groups):
features/chat/chat-catalog.ts
  import { nbaCupCatalogEntry } from "@/features/nba-cup/nba-cup-catalog";
  NbaCupCard: nbaCupCatalogEntry,
features/chat/chat-registry.tsx
  import LiveNbaCupCard from "@/features/nba-cup/components/live-nba-cup-card";
  NbaCupCard: ({ props, loading }) => (
    <LiveNbaCupCard group={props.group || undefined} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { nbaCupLookup } from "@/features/nba-cup/nba-cup-steps";
  NbaCupCard: nbaCupLookup,

4. Check it: run the dev server, open /chat and ask "Show me NBA Cup West Group A", then "NBA Cup standings" for all six groups in one reply.

The model only writes the card's props; the card fetches the table itself:
- group: "east-a" | "east-b" | "east-c" | "west-a" | "west-b" | "west-c"

Docs: ${origin}/docs/nba-cup`;
}

function playerInstallPrompt(origin: string): string {
  return `Add the NBA player card from genuicn to my Next.js app. It shows NBA players this season, one row each in one table (photo, number, name, height, age and experience, with points, assists, rebounds and steals per game, and the team each plays for now), so the chat's model can show one player or compare several. It finds each player's current team itself, so trades and signings are always up to date.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/player.json
It adds features/player/, app/api/player/route.ts, which the card loads the player from (ESPN's public site API, no API key), and Fluid Functionalism's Table and ScrollArea. Before a season's first games, the averages come from the season before. Player photos load as plain <img> tags from a.espncdn.com: if my app sets a Content-Security-Policy, add it to img-src.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several cards):
features/chat/chat-catalog.ts
  import { playerCatalogEntry } from "@/features/player/player-catalog";
  PlayerCard: playerCatalogEntry,
features/chat/chat-registry.tsx
  import LivePlayerCard from "@/features/player/components/live-player-card";
  PlayerCard: ({ props, loading }) => (
    <LivePlayerCard players={props.players} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { playerLookup } from "@/features/player/player-steps";
  PlayerCard: playerLookup,

4. Check it: run the dev server, open /chat and ask "How's LeBron James doing?", then "Compare LeBron James and Victor Wembanyama" for both in one table.

The model only writes the card's props; the card fetches the players itself:
- players: string[], the NBA players' full names, e.g. ["LeBron James", "Victor Wembanyama"]

Docs: ${origin}/docs/player`;
}

function winProbabilityInstallPrompt(origin: string): string {
  return `Add the NBA win probability card from genuicn to my Next.js app. It's one card for one NBA game: each team's logo and name over a bar in its color (Fluid's steps Slider, read-only, with the percent over its thumb on hover) and what a win pays back (1.9x for 53%), that the chat's model can show. Before tip-off it shows ESPN's prediction, during the game the live chance (read again every 30 seconds), and after it the result.

${chatSetup(origin)}

2. Install the card:
npx shadcn@latest add ${origin}/r/win-probability.json
It adds features/win-probability/ and app/api/win-probability/route.ts, which the card loads the chances from (ESPN's public site API, no API key), the NBA scoreboard's game lookup in features/scoreboard/, which finds the game, and Fluid Functionalism's Slider (the steps design, shown read-only as each team's bar). Team logos load as plain <img> tags from a.espncdn.com: if my app sets a Content-Security-Policy, add it to img-src.

3. Turn the card on, one entry in each file, next to the CardGroup entry that is already there (keep it: it lets one reply show several games):
features/chat/chat-catalog.ts
  import { winProbabilityCatalogEntry } from "@/features/win-probability/win-probability-catalog";
  WinProbabilityCard: winProbabilityCatalogEntry,
features/chat/chat-registry.tsx
  import LiveWinProbabilityCard from "@/features/win-probability/components/live-win-probability-card";
  WinProbabilityCard: ({ props, loading }) => (
    <LiveWinProbabilityCard team={props.team || undefined} date={props.date} streaming={loading} />
  ),
features/chat/chat-steps.ts (the reply's thinking steps for this card)
  import { winProbabilityLookup } from "@/features/win-probability/win-probability-steps";
  WinProbabilityCard: winProbabilityLookup,

4. Check it: run the dev server, open /chat and ask "Who's going to win the Knicks game?", then "Odds for the Celtics and Thunder games" for two cards in one reply.

The model only writes the card's props; the card fetches the chances itself:
- team: string, one of the two teams, e.g. "New York Knicks"
- date: string | null, as YYYY-MM-DD (null means the team's current game: today's, or the closest one to now)

Docs: ${origin}/docs/win-probability`;
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
  crypto: cryptoInstallPrompt,
  flights: flightsInstallPrompt,
  "nba-cup": nbaCupInstallPrompt,
  player: playerInstallPrompt,
  quote: quoteInstallPrompt,
  scoreboard: scoreboardInstallPrompt,
  standings: standingsInstallPrompt,
  weather: weatherInstallPrompt,
  "win-probability": winProbabilityInstallPrompt,
} satisfies Record<string, (origin: string) => string>;

export type InstallCard = keyof typeof INSTALL_PROMPTS;
