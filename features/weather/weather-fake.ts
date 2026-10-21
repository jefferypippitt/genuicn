import { WEATHER_CONDITIONS } from "@/features/weather/weather-schema";
import type {
  SkyPhase,
  WeatherCondition,
  WeatherData,
  WeatherUnits,
} from "@/features/weather/weather-schema";

const MINUTE = 60_000;

const PHASE_TIME: Record<
  SkyPhase,
  { from: "sunrise" | "sunset"; minutes: number }
> = {
  dawn: { from: "sunrise", minutes: -30 },
  day: { from: "sunrise", minutes: 300 },
  dusk: { from: "sunset", minutes: 35 },
  "golden-hour": { from: "sunset", minutes: -45 },
  night: { from: "sunset", minutes: 180 },
  sunrise: { from: "sunrise", minutes: 15 },
  sunset: { from: "sunset", minutes: 0 },
};

const LABEL: Record<WeatherCondition, string> = {
  clear: "Clear",
  cloudy: "Mostly Cloudy",
  drizzle: "Drizzle",
  fog: "Foggy",
  "partly-cloudy": "Partly Cloudy",
  rain: "Rain",
  snow: "Snow",
  thunderstorm: "Thunderstorms",
};

function seeded(seed: string) {
  let state = 0;
  for (const char of seed) {
    state = Math.imul(state ^ (char.codePointAt(0) ?? 0), 2_654_435_761);
  }
  return () => {
    state = Math.imul(state ^ (state >>> 15), 2_246_822_507);
    state = Math.imul(state ^ (state >>> 13), 3_266_489_909);
    return ((state ^= state >>> 16) >>> 0) / 4_294_967_296;
  };
}

export function fakeWeather(
  location: string,
  {
    units = "f",
    phase,
    condition,
  }: {
    readonly units?: WeatherUnits;
    readonly phase?: SkyPhase;
    readonly condition?: WeatherCondition;
  } = {}
): WeatherData {
  const name = location.trim() || "Springfield";
  const random = seeded(name.toLowerCase());

  const sunrise = Date.UTC(2026, 9, 14, 11, 12);
  const sunset = Date.UTC(2026, 9, 14, 22, 20);
  const pinned = phase ? PHASE_TIME[phase] : null;
  const asOf = pinned
    ? (pinned.from === "sunrise" ? sunrise : sunset) + pinned.minutes * MINUTE
    : Date.UTC(2026, 9, 14, 18, 20);
  const isDayAt = (time: number) => time >= sunrise && time < sunset;

  const sky =
    condition ??
    WEATHER_CONDITIONS[Math.floor(random() * WEATHER_CONDITIONS.length)];
  const base = units === "f" ? 48 + random() * 36 : 9 + random() * 20;

  const isDay = isDayAt(asOf);
  return {
    asOf,
    condition: sky,
    fake: true,
    high: base + 2 + random() * 4,
    isDay,
    label: sky === "clear" && isDay ? "Sunny" : LABEL[sky],
    location: name,
    low: base - 8 - random() * 6,
    region: "Demo",
    sunrise,
    sunset,
    temperature: base,
    timeZone: "America/New_York",
    units,
  };
}
