import { candlestickLookup } from "@/features/candlestick/candlestick-steps";
import { cryptoLookup } from "@/features/crypto/crypto-steps";
import { forecastLookup } from "@/features/forecast/forecast-steps";
import { boardingPassLookup } from "@/features/flights/flight-steps";
import { nbaCupLookup } from "@/features/nba-cup/nba-cup-steps";
import { playerLookup } from "@/features/player/player-steps";
import { quoteLookup } from "@/features/quote/quote-steps";
import { scoreboardLookup } from "@/features/scoreboard/scoreboard-steps";
import { areaChartLookup } from "@/features/area-chart/area-chart-steps";
import { barChartLookup } from "@/features/bar-chart/bar-chart-steps";
import { pieChartLookup } from "@/features/pie-chart/pie-chart-steps";
import { radarChartLookup } from "@/features/radar-chart/radar-chart-steps";
import { radialChartLookup } from "@/features/radial-chart/radial-chart-steps";
import { standingsLookup } from "@/features/standings/standings-steps";
import { winProbabilityLookup } from "@/features/win-probability/win-probability-steps";
import { weatherLookup } from "@/features/weather/weather-steps";
import type { CardLookup } from "@/features/chat/lookup";

export const lookups: Record<string, CardLookup> = {
  AreaChartCard: areaChartLookup,
  BarChartCard: barChartLookup,
  BoardingPass: boardingPassLookup,
  CandlestickCard: candlestickLookup,
  CryptoCard: cryptoLookup,
  ForecastCard: forecastLookup,
  NbaCupCard: nbaCupLookup,
  PieChartCard: pieChartLookup,
  PlayerCard: playerLookup,
  QuoteCard: quoteLookup,
  RadarChartCard: radarChartLookup,
  RadialChartCard: radialChartLookup,
  ScoreboardCard: scoreboardLookup,
  StandingsCard: standingsLookup,
  WeatherCard: weatherLookup,
  WinProbabilityCard: winProbabilityLookup,
};
