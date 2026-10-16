import { loadWeather } from "@/features/weather/weather-requests";
import { listOf } from "@/features/chat/lookup";
import type { CardLookup } from "@/features/chat/lookup";
import type { WeatherUnits } from "@/features/weather/weather-schema";

function propertiesOf(properties: Record<string, unknown>) {
  return {
    location:
      typeof properties.location === "string" ? properties.location : "",
    units: (properties.units ?? undefined) as WeatherUnits | undefined,
  };
}

export const weatherLookup: CardLookup = {
  intent: (places) => `The weather in ${listOf(places)}`,
  load: (properties) => {
    const { location, units } = propertiesOf(properties);
    return loadWeather(location, units);
  },
  // Open-Meteo has no page per place; the badge credits the service.
  sources: () => [{ href: "https://open-meteo.com/", label: "open-meteo.com" }],
  subject: (properties) => propertiesOf(properties).location.trim() || null,
};
