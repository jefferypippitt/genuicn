import { cryptoLookup } from "@/features/crypto/crypto-steps";
import { boardingPassLookup } from "@/features/flights/flight-steps";
import { quoteLookup } from "@/features/quote/quote-steps";
import { weatherLookup } from "@/features/weather/weather-steps";
import type { CardLookup } from "@/features/chat/lookup";

export const lookups: Record<string, CardLookup> = {
  BoardingPass: boardingPassLookup,
  CryptoCard: cryptoLookup,
  QuoteCard: quoteLookup,
  WeatherCard: weatherLookup,
};
