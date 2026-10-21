import { z } from "zod";
import { FORECAST_VIEWS } from "@/features/forecast/forecast-schema";
import { WEATHER_UNITS } from "@/features/weather/weather-schema";

/**
People ask about the weather ahead without saying "forecast": will it rain, what to wear tomorrow, the weekend. The description routes on time: anything after right now comes here, and WeatherCard keeps what it is like now.
*/
export const forecastCatalogEntry = {
  description:
    "A live forecast card for a place: the next 24 hours (temperature and chance of rain every two hours) or the next 10 days (each day's high, low, conditions and chance of rain), with a switch between them. It fetches its own data. Choose it over WeatherCard whenever the question is about weather that hasn't happened yet: later today, this afternoon, tonight, tomorrow, the weekend, next week, a named day, whether it will rain or snow, when rain starts or stops, whether to bring an umbrella or jacket, what to wear, or the forecast itself. Words that point here: forecast, later, tonight, tomorrow, weekend, next week, this week, Monday to Sunday, will it, going to, chance of rain, umbrella, plan. What the weather is like right now (the temperature, whether it is raining now, today's conditions) stays with WeatherCard.",
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
    view: z
      .enum(FORECAST_VIEWS)
      .nullable()
      .describe(
        "hourly for the next 24 hours: later today, this afternoon, tonight, or when rain starts or stops. daily for the next 10 days: tomorrow, the weekend, next week, or a named day. Null for daily when no time is named."
      ),
  }),
};
