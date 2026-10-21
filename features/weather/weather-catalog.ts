import { z } from "zod";
import { WEATHER_UNITS } from "@/features/weather/weather-schema";

export const weatherCatalogEntry = {
  description:
    "A live weather card: the current temperature and conditions, and today's high and low, on a sky that matches the time of day there. It fetches its own data. Use it when the user asks what the weather or temperature is like somewhere now or today. Weather that has not happened yet (later today, tonight, tomorrow, the weekend, rain chances, a forecast) goes to ForecastCard.",
  props: z.object({
    location: z
      .string()
      .describe(
        'The place, as a city name with an optional region or country spelled out, for example "Austin" or "Paris, France".'
      ),
    units: z
      .enum(WEATHER_UNITS)
      .nullable()
      .describe(
        "f for Fahrenheit or c for Celsius. Null to use the place's usual units, unless the user asks for one."
      ),
  }),
};
