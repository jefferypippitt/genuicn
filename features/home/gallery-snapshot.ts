import areaChartWorldPopulation from "@/features/home/snapshot/area-chart-world-population.json";
import barChartLargestEconomies from "@/features/home/snapshot/bar-chart-largest-economies.json";
import cryptoBtcAll from "@/features/home/snapshot/crypto-btc-all.json";
import flightBa117 from "@/features/home/snapshot/flight-ba117.json";
import quote1d from "@/features/home/snapshot/quote-nvda-1d.json";
import quote1m from "@/features/home/snapshot/quote-nvda-1m.json";
import quote1w from "@/features/home/snapshot/quote-nvda-1w.json";
import quote1y from "@/features/home/snapshot/quote-nvda-1y.json";
import scoreboardFinalsGame5 from "@/features/home/snapshot/scoreboard-finals-game-5.json";
import weatherNewYork from "@/features/home/snapshot/weather-new-york.json";
import type { AreaChartData } from "@/features/area-chart/area-chart-schema";
import type { BarChartData } from "@/features/bar-chart/bar-chart-schema";
import type { CryptoData } from "@/features/crypto/crypto-schema";
import type { BoardingPassData } from "@/features/flights/flight-schema";
import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";
import type { ScoreboardData } from "@/features/scoreboard/scoreboard-schema";
import type { WeatherData } from "@/features/weather/weather-schema";

export const GALLERY_QUOTES: Record<QuoteRange, QuoteData> = {
  "1d": quote1d as QuoteData,
  "1m": quote1m as QuoteData,
  "1w": quote1w as QuoteData,
  "1y": quote1y as QuoteData,
};

export const GALLERY_WEATHER = weatherNewYork as WeatherData;

export const GALLERY_BOARDING_PASS = flightBa117 as BoardingPassData;

/**
Bitcoin over all time, since it first traded in October 2013.
*/
export const GALLERY_BITCOIN = cryptoBtcAll as CryptoData;

export const GALLERY_SCOREBOARD = scoreboardFinalsGame5 as ScoreboardData;

/**
World population every year since 1960, from the World Bank.
*/
export const GALLERY_AREA_CHART = areaChartWorldPopulation as AreaChartData;

/**
The eight largest economies by 2025 GDP, from the World Bank.
*/
export const GALLERY_BAR_CHART = barChartLargestEconomies as BarChartData;
