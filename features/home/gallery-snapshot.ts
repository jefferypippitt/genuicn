import areaChartWorldPopulation from "@/features/home/snapshot/area-chart-world-population.json";
import barChartLargestEconomies from "@/features/home/snapshot/bar-chart-largest-economies.json";
import candlestickNvda1m from "@/features/home/snapshot/candlestick-nvda-1m.json";
import cryptoBtcAll from "@/features/home/snapshot/crypto-btc-all.json";
import flightBa117 from "@/features/home/snapshot/flight-ba117.json";
import forecastAustin from "@/features/home/snapshot/forecast-austin.json";
import pieChartUsElectricity from "@/features/home/snapshot/pie-chart-us-electricity.json";
import quote1d from "@/features/home/snapshot/quote-nvda-1d.json";
import quote1m from "@/features/home/snapshot/quote-nvda-1m.json";
import quote1w from "@/features/home/snapshot/quote-nvda-1w.json";
import quote1y from "@/features/home/snapshot/quote-nvda-1y.json";
import radarChartAppleBanana from "@/features/home/snapshot/radar-chart-apple-banana.json";
import radialChartCaliforniaReservoirs from "@/features/home/snapshot/radial-chart-california-reservoirs.json";
import scoreboardFinalsGame5 from "@/features/home/snapshot/scoreboard-finals-game-5.json";
import weatherNewYork from "@/features/home/snapshot/weather-new-york.json";
import type { AreaChartData } from "@/features/area-chart/area-chart-schema";
import type { BarChartData } from "@/features/bar-chart/bar-chart-schema";
import type { CandlestickData } from "@/features/candlestick/candlestick-schema";
import type { CryptoData } from "@/features/crypto/crypto-schema";
import type { BoardingPassData } from "@/features/flights/flight-schema";
import type { ForecastData } from "@/features/forecast/forecast-schema";
import type { PieChartData } from "@/features/pie-chart/pie-chart-schema";
import type { QuoteData, QuoteRange } from "@/features/quote/quote-schema";
import type { RadarChartData } from "@/features/radar-chart/radar-chart-schema";
import type { RadialChartData } from "@/features/radial-chart/radial-chart-schema";
import type { ScoreboardData } from "@/features/scoreboard/scoreboard-schema";
import type {
  TerminalShell,
  TerminalStep,
} from "@/features/terminal/terminal-schema";
import type { WeatherData } from "@/features/weather/weather-schema";

export const GALLERY_QUOTES: Record<QuoteRange, QuoteData> = {
  "1d": quote1d as QuoteData,
  "1m": quote1m as QuoteData,
  "1w": quote1w as QuoteData,
  "1y": quote1y as QuoteData,
};

/**
NVIDIA's daily candles over the past month, from Yahoo Finance.
*/
export const GALLERY_CANDLESTICK = candlestickNvda1m as CandlestickData;

export const GALLERY_WEATHER = weatherNewYork as WeatherData;

/**
Austin's next 24 hours and next ten days, from Open-Meteo.
*/
export const GALLERY_FORECAST = forecastAustin as ForecastData;

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

/**
US electricity generation by source in 2025, from the US EIA.
*/
export const GALLERY_PIE_CHART = pieChartUsElectricity as PieChartData;

/**
An apple and a banana by percent of daily value, from USDA FoodData Central.
*/
export const GALLERY_RADAR_CHART = radarChartAppleBanana as RadarChartData;

/**
California's major reservoirs as a percent of capacity, from the state's CDEC.
*/
export const GALLERY_RADIAL_CHART =
  radialChartCaliforniaReservoirs as RadialChartData;

/**
A short signup schema in zod. The model writes the code, so the slide's props are written here instead of saved from a service.
*/
export const GALLERY_CODE = {
  code: `import { z } from "zod";

export const signupSchema = z.object({
  email: z.email("Enter a valid email address"),
  password: z.string().min(8, "At least 8 characters"),
  acceptTerms: z.literal(true),
});

export type SignupForm = z.infer<typeof signupSchema>;`,
  filename: "signup-schema.ts",
  language: "typescript",
} as const;

/**
Starting a Next.js app with pnpm, and what the dev server prints once it is up.
*/
export const GALLERY_TERMINAL = {
  shell: "zsh",
  steps: [
    { command: "pnpm create next-app@latest my-app --yes" },
    { command: "cd my-app" },
    {
      command: "pnpm dev",
      output: "▲ Next.js 16\n- Local: http://localhost:3000\n✓ Ready in 1.2s",
    },
  ],
} as const satisfies { shell: TerminalShell; steps: readonly TerminalStep[] };
