import { quoteLookup } from "@/features/quote/quote-steps";
import { weatherLookup } from "@/features/weather/weather-steps";
import type { CardLookup } from "@/features/chat/lookup";

export const lookups: Record<string, CardLookup> = {
  QuoteCard: quoteLookup,
  WeatherCard: weatherLookup,
};
