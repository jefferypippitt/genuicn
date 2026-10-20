import { cryptoLookup } from "@/features/crypto/crypto-steps";
import { boardingPassLookup } from "@/features/flights/flight-steps";
import { nbaCupLookup } from "@/features/nba-cup/nba-cup-steps";
import { playerLookup } from "@/features/player/player-steps";
import { quoteLookup } from "@/features/quote/quote-steps";
import { scoreboardLookup } from "@/features/scoreboard/scoreboard-steps";
import { areaChartLookup } from "@/features/area-chart/area-chart-steps";
import { barChartLookup } from "@/features/bar-chart/bar-chart-steps";
import { standingsLookup } from "@/features/standings/standings-steps";
import { winProbabilityLookup } from "@/features/win-probability/win-probability-steps";
import { weatherLookup } from "@/features/weather/weather-steps";
import type { CardLookup } from "@/features/chat/lookup";

export const lookups: Record<string, CardLookup> = {
  AreaChartCard: areaChartLookup,
  BarChartCard: barChartLookup,
  BoardingPass: boardingPassLookup,
  CryptoCard: cryptoLookup,
  NbaCupCard: nbaCupLookup,
  PlayerCard: playerLookup,
  QuoteCard: quoteLookup,
  ScoreboardCard: scoreboardLookup,
  StandingsCard: standingsLookup,
  WeatherCard: weatherLookup,
  WinProbabilityCard: winProbabilityLookup,
};
