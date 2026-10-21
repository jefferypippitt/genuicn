import type {
  SkyPhase,
  WeatherCondition,
} from "@/features/weather/weather-schema";

export type Palette = readonly [top: string, middle: string, bottom: string];

/**
An "r g b" triplet, to use as `rgb(${color} / alpha)`.
*/
export type Rgb = string;

export interface SunSpec {
  /**
  The center, as percentages of the card.
  */
  x: number;
  y: number;
  /**
  The glow's diameter in pixels.
  */
  size: number;
  color: string;
  /**
  How the sun shows: a disc with its glow, a bright patch behind cloud, a pale flat disc through fog, or only the glow below the horizon.
  */
  look: "disc" | "diffuse" | "pale" | "glow";
  /**
  The rising or setting sun, flattened and sinking into the haze.
  */
  horizon: boolean;
  /**
  A smaller disc, for a sun beside the header.
  */
  small: boolean;
  opacity: number;
}

export interface MoonSpec {
  x: number;
  y: number;
  look: "full" | "crescent" | "halo";
  opacity: number;
}

export interface StarsSpec {
  count: number;
  opacity: number;
  /**
  Keeps the stars to the top of the sky, where they show first at dusk.
  */
  maxTop: number;
  milkyWay: boolean;
}

export interface PlanetSpec {
  x: number;
  y: number;
}

export interface HazeSpec {
  color: Rgb;
  opacity: number;
  /**
  How far up the card it reaches, 0 to 1.
  */
  height: number;
}

export interface GlowSpec {
  /**
  The center along the horizon, as a percentage of the width.
  */
  x: number;
  color: string;
  opacity: number;
}

export interface CirrusSpec {
  color: Rgb;
  opacity: number;
  seed: number;
}

export interface CloudSpec {
  x: number;
  y: number;
  scale: number;
  /**
  Vertical squash: 1 for a cumulus heap, lower for flat, layered cloud.
  */
  stretch: number;
  opacity: number;
}

export interface CloudFieldSpec {
  clouds: readonly CloudSpec[];
  light: string;
  shade: string;
  /**
  Where the lit edge sits, in the cloud's own units: toward the sun.
  */
  litDx: number;
  litDy: number;
  /**
  Lit from below, the way low sun catches the undersides.
  */
  underlit: boolean;
  /**
  Edge noise: higher for ragged, wind-torn cloud.
  */
  ragged: number;
}

export interface DeckSpec {
  light: string;
  shade: string;
  /**
  Noise frequency, x then y: lower for bigger features.
  */
  frequency: string;
  /**
  Alpha from the noise: a steep gain gives lumps and gaps, a low one an even sheet.
  */
  gain: number;
  offset: number;
  /**
  How strongly the lit tops stand out from the body (0 for none).
  */
  relief: number;
  blur: number;
  seed: number;
  /**
  Fades the deck off above the horizon, for light under it.
  */
  lifted: boolean;
  /**
  CSS filter for the deck: darker and harder for storms.
  */
  filter?: string;
  seconds: number;
}

export interface RaysSpec {
  x: number;
  y: number;
  color: Rgb;
  opacity: number;
}

export interface AtmosphereSpec {
  sky: Palette;
  coverage: number;
  horizonGlow: GlowSpec | null;
  /**
  Light along the horizon under a cloud deck, or city light on its base at night.
  */
  underglow: GlowSpec | null;
  haze: HazeSpec;
  sun: SunSpec | null;
  moon: MoonSpec | null;
  stars: StarsSpec | null;
  planet: PlanetSpec | null;
  cirrus: CirrusSpec | null;
  clouds: CloudFieldSpec | null;
  deck: DeckSpec | null;
  rays: RaysSpec | null;
  /**
  The center of a rainbow's arc, opposite the sun, as a percentage of the width.
  */
  rainbow: number | null;
  rainShafts: { color: Rgb; opacity: number } | null;
  fog: { color: Rgb; opacity: number } | null;
  /**
  A wash over everything, like a storm's green cast.
  */
  tint: string | null;
  /**
  How bright the lightning is: brighter in the dark.
  */
  flash: number;
  /**
  The color of falling snow and rain, lit by the sky.
  */
  precipitation: Rgb;
}

const CLEAR: Record<SkyPhase, Palette> = {
  dawn: ["#1c2a5a", "#5a68a2", "#e4aba3"],
  day: ["#2a72d4", "#4f97e3", "#9cc8ef"],
  dusk: ["#121840", "#3b326c", "#b8607a"],
  "golden-hour": ["#3a74bf", "#d9a878", "#f6cd86"],
  night: ["#060a1d", "#121d45", "#22325f"],
  sunrise: ["#4a7cbd", "#f0a582", "#ffdba6"],
  sunset: ["#2f4083", "#c45f74", "#f8904a"],
};

const OVERCAST: Record<SkyPhase, Palette> = {
  dawn: ["#383f53", "#5b6074", "#857f8c"],
  day: ["#55657b", "#76879d", "#9aabbe"],
  dusk: ["#262b3e", "#3f4158", "#5c566b"],
  "golden-hour": ["#5a667c", "#958f8c", "#bda88f"],
  night: ["#13171f", "#1e2430", "#2c3442"],
  sunrise: ["#566075", "#8b8995", "#b5a59e"],
  sunset: ["#44495f", "#796677", "#a6827a"],
};

const SNOW_SKY: Record<SkyPhase, Palette> = {
  dawn: ["#5b5f72", "#7f8091", "#a7a1ad"],
  day: ["#8491a1", "#9fabb8", "#bac4ce"],
  dusk: ["#3c3a4e", "#5a5468", "#7e7080"],
  "golden-hour": ["#7d8592", "#9c9896", "#b9ad9f"],
  night: ["#2a2633", "#40353f", "#5e4a4c"],
  sunrise: ["#7f8798", "#a8a3a9", "#cfc0b9"],
  sunset: ["#6b6879", "#968086", "#bb978d"],
};

const STORM_SKY: Record<SkyPhase, Palette> = {
  dawn: ["#1d2030", "#30323f", "#4b4650"],
  day: ["#28343a", "#3c4b4f", "#5a6a66"],
  dusk: ["#14151f", "#24232f", "#3d3138"],
  "golden-hour": ["#2b2f38", "#55493f", "#8a6a45"],
  night: ["#07090f", "#0e121b", "#181d28"],
  sunrise: ["#2d3240", "#4f4b52", "#7a6458"],
  sunset: ["#23222f", "#4b3437", "#7d4a37"],
};

const FOG_SKY: Record<SkyPhase, Palette> = {
  dawn: ["#5f6075", "#7d7b8c", "#9f97a1"],
  day: ["#7f8b98", "#97a2ad", "#afb8c1"],
  dusk: ["#3e3f52", "#55556a", "#716b7b"],
  "golden-hour": ["#8a8582", "#a89c8e", "#c0ae95"],
  night: ["#1d222c", "#2a303b", "#3b414c"],
  sunrise: ["#84828f", "#a69890", "#c2ad9a"],
  sunset: ["#6d6672", "#8f7a78", "#ad8d78"],
};

const CLOUD_LIGHT: Record<SkyPhase, readonly [string, string]> = {
  dawn: ["#f2c3cf", "#6c6a98"],
  day: ["#ffffff", "#d3deec"],
  dusk: ["#f19aa3", "#3e3766"],
  "golden-hour": ["#fff0d0", "#d9a988"],
  night: ["#c9d1ec", "#262d47"],
  sunrise: ["#ffd6b5", "#a68aa3"],
  sunset: ["#ffb27a", "#7d5679"],
};

const CLOUD_HEAVY: Record<SkyPhase, readonly [string, string]> = {
  dawn: ["#8d8a9c", "#545567"],
  day: ["#d3dae4", "#8d99aa"],
  dusk: ["#5d5a72", "#33334a"],
  "golden-hour": ["#d2bca6", "#837a7c"],
  night: ["#3a4152", "#1f2430"],
  sunrise: ["#cfb2a5", "#7e7682"],
  sunset: ["#c1918a", "#625669"],
};

const HAZE: Record<SkyPhase, Rgb> = {
  dawn: "232 184 196",
  day: "222 234 246",
  dusk: "196 120 150",
  "golden-hour": "255 214 160",
  night: "70 84 124",
  sunrise: "255 212 176",
  sunset: "255 158 104",
};

const FOG_BANK: Record<SkyPhase, Rgb> = {
  dawn: "226 210 222",
  day: "212 219 228",
  dusk: "168 164 190",
  "golden-hour": "248 232 206",
  night: "176 186 206",
  sunrise: "250 228 214",
  sunset: "240 206 190",
};

const HORIZON_GLOW: Partial<Record<SkyPhase, string>> = {
  dawn: "rgb(255 176 150 / 0.5)",
  dusk: "rgb(230 108 120 / 0.5)",
  "golden-hour": "rgb(255 200 120 / 0.42)",
  sunrise: "rgb(255 196 128 / 0.62)",
  sunset: "rgb(255 128 64 / 0.7)",
};

const CIRRUS: Partial<Record<SkyPhase, Rgb>> = {
  dawn: "248 190 214",
  day: "255 255 255",
  dusk: "236 126 150",
  "golden-hour": "255 236 200",
  sunrise: "255 206 192",
  sunset: "255 150 116",
};

const SUN_PLACE: Record<
  Exclude<SkyPhase, "night">,
  Omit<SunSpec, "look" | "opacity">
> = {
  dawn: {
    color: "rgb(255 205 185 / 0.5)",
    horizon: false,
    size: 260,
    small: false,
    x: 20,
    y: 114,
  },
  day: {
    color: "rgb(255 249 222 / 0.72)",
    horizon: false,
    size: 170,
    small: false,
    x: 66,
    y: -10,
  },
  dusk: {
    color: "rgb(255 150 140 / 0.42)",
    horizon: false,
    size: 280,
    small: false,
    x: 80,
    y: 118,
  },
  "golden-hour": {
    color: "rgb(255 226 160 / 0.95)",
    horizon: false,
    size: 200,
    small: true,
    x: 72,
    y: 47,
  },
  sunrise: {
    color: "rgb(255 214 150 / 0.95)",
    horizon: true,
    size: 240,
    small: false,
    x: 19.5,
    y: 93,
  },
  sunset: {
    color: "rgb(255 170 96 / 0.95)",
    horizon: true,
    size: 260,
    small: false,
    x: 80.5,
    y: 93,
  },
};

const DAY_SUN_X = [36, 94] as const;

const LOW_SUN = new Set<SkyPhase>(["sunrise", "golden-hour", "sunset"]);
const TWILIGHT = new Set<SkyPhase>(["dawn", "dusk"]);

const COVERAGE: Record<WeatherCondition, number> = {
  clear: 0,
  cloudy: 0.72,
  drizzle: 0.86,
  fog: 0.6,
  "partly-cloudy": 0.22,
  rain: 0.94,
  snow: 0.85,
  thunderstorm: 1,
};

/**
A small deterministic random generator, so every render matches.
*/
export function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function toRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function toHex(rgb: readonly number[]): string {
  return `#${rgb
    .map((channel) => Math.round(channel).toString(16).padStart(2, "0"))
    .join("")}`;
}

/**
Mixes two hex colors, `amount` of the way from `a` to `b`.
*/
export function mix(a: string, b: string, amount: number): string {
  const from = toRgb(a);
  const to = toRgb(b);
  return toHex(
    from.map((channel, index) => channel + (to[index] - channel) * amount)
  );
}

function mixPalette(a: Palette, b: Palette, amount: number): Palette {
  return [
    mix(a[0], b[0], amount),
    mix(a[1], b[1], amount),
    mix(a[2], b[2], amount),
  ];
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const CUMULUS: readonly CloudSpec[] = [
  { opacity: 0.9, scale: 0.9, stretch: 1, x: 196, y: 98 },
  { opacity: 0.75, scale: 0.55, stretch: 1, x: 96, y: 66 },
  { opacity: 0.7, scale: 0.6, stretch: 1, x: 372, y: 124 },
  { opacity: 0.6, scale: 0.45, stretch: 1, x: 24, y: 132 },
];

const GOLDEN_CUMULUS: readonly CloudSpec[] = [
  { opacity: 0.9, scale: 0.8, stretch: 0.9, x: 150, y: 96 },
  { opacity: 0.7, scale: 0.55, stretch: 0.9, x: 40, y: 70 },
  { opacity: 0.6, scale: 0.42, stretch: 0.85, x: 350, y: 66 },
  { opacity: 0.75, scale: 0.6, stretch: 0.8, x: 236, y: 134 },
];

const STRATOCUMULUS: readonly CloudSpec[] = [
  { opacity: 0.85, scale: 1.25, stretch: 0.42, x: 250, y: 66 },
  { opacity: 0.8, scale: 1.05, stretch: 0.45, x: 70, y: 82 },
  { opacity: 0.7, scale: 0.85, stretch: 0.45, x: 380, y: 112 },
  { opacity: 0.75, scale: 0.95, stretch: 0.4, x: 170, y: 124 },
];

const ALTOCUMULUS: readonly CloudSpec[] = (() => {
  const random = seeded(53);
  const field: CloudSpec[] = [];
  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 6; column += 1) {
      field.push({
        opacity: 0.55 + random() * 0.35,
        scale: 0.2 + random() * 0.14,
        stretch: 0.55 + random() * 0.2,
        x: column * 74 + row * 24 + random() * 20 - 10,
        y: 56 + row * 26 + random() * 10,
      });
    }
  }
  return field;
})();

const NIGHT_CLOUDS: readonly CloudSpec[] = [
  { opacity: 0.85, scale: 0.7, stretch: 0.8, x: 96, y: 78 },
  { opacity: 0.75, scale: 0.8, stretch: 0.75, x: 330, y: 120 },
  { opacity: 0.6, scale: 0.45, stretch: 0.8, x: 196, y: 52 },
];

const CLOUD_LAYOUT: Record<SkyPhase, readonly CloudSpec[]> = {
  dawn: ALTOCUMULUS,
  day: CUMULUS,
  dusk: ALTOCUMULUS,
  "golden-hour": GOLDEN_CUMULUS,
  night: NIGHT_CLOUDS,
  sunrise: STRATOCUMULUS,
  sunset: STRATOCUMULUS,
};

function skyFor(phase: SkyPhase, condition: WeatherCondition): Palette {
  const coverage = COVERAGE[condition];
  const base = mixPalette(CLEAR[phase], OVERCAST[phase], coverage);
  if (condition === "snow") {
    return mixPalette(base, SNOW_SKY[phase], 0.75);
  }
  if (condition === "thunderstorm") {
    return STORM_SKY[phase];
  }
  if (condition === "fog") {
    return mixPalette(base, FOG_SKY[phase], 0.8);
  }
  return condition === "rain" ? mixPalette(base, STORM_SKY[phase], 0.25) : base;
}

function sunFor(
  phase: SkyPhase,
  condition: WeatherCondition,
  progress: number
): SunSpec | null {
  if (phase === "night") {
    return null;
  }
  const place = SUN_PLACE[phase];
  const x =
    phase === "day"
      ? DAY_SUN_X[0] + (DAY_SUN_X[1] - DAY_SUN_X[0]) * clamp(progress, 0, 1)
      : place.x;
  const sun = { ...place, x };

  if (TWILIGHT.has(phase)) {
    const isThick = COVERAGE[condition] > 0.5;
    return isThick ? null : { ...sun, look: "glow", opacity: 1 };
  }
  switch (condition) {
    case "clear":
    case "partly-cloudy": {
      return { ...sun, look: "disc", opacity: 1 };
    }
    case "fog": {
      return { ...sun, look: "pale", opacity: phase === "day" ? 0.8 : 0.7 };
    }
    case "cloudy": {
      return sun.horizon
        ? { ...sun, look: "disc", opacity: 0.85 }
        : { ...sun, look: "diffuse", opacity: 0.4 };
    }
    case "drizzle": {
      return { ...sun, look: "diffuse", opacity: sun.horizon ? 0.45 : 0.25 };
    }
    case "rain": {
      return LOW_SUN.has(phase)
        ? { ...sun, look: "diffuse", opacity: 0.4 }
        : { ...sun, look: "diffuse", opacity: 0.12 };
    }
    case "snow": {
      return {
        ...sun,
        color: "rgb(255 255 250 / 0.6)",
        look: "diffuse",
        opacity: 0.3,
      };
    }
    default: {
      return null;
    }
  }
}

function moonFor(
  phase: SkyPhase,
  condition: WeatherCondition
): MoonSpec | null {
  if (phase === "dusk") {
    return condition === "clear" || condition === "partly-cloudy"
      ? { look: "crescent", opacity: 1, x: 52, y: 27 }
      : null;
  }
  if (phase !== "night") {
    return null;
  }
  const place = { x: 63, y: 22 };
  switch (condition) {
    case "clear":
    case "partly-cloudy": {
      return { ...place, look: "full", opacity: 1 };
    }
    case "fog":
    case "cloudy": {
      return {
        ...place,
        look: "halo",
        opacity: condition === "fog" ? 0.7 : 0.5,
      };
    }
    case "drizzle": {
      return { ...place, look: "halo", opacity: 0.28 };
    }
    default: {
      return null;
    }
  }
}

function starsFor(
  phase: SkyPhase,
  condition: WeatherCondition
): StarsSpec | null {
  const isPartly = condition === "partly-cloudy";
  if (condition !== "clear" && !isPartly) {
    return null;
  }
  if (phase === "night") {
    return {
      count: isPartly ? 26 : 56,
      maxTop: 64,
      milkyWay: !isPartly,
      opacity: 1,
    };
  }
  if (phase === "dusk") {
    return {
      count: isPartly ? 8 : 16,
      maxTop: 34,
      milkyWay: false,
      opacity: 0.55,
    };
  }
  if (phase === "dawn") {
    return {
      count: isPartly ? 4 : 9,
      maxTop: 30,
      milkyWay: false,
      opacity: 0.35,
    };
  }
  return null;
}

function planetFor(
  phase: SkyPhase,
  condition: WeatherCondition
): PlanetSpec | null {
  if (condition !== "clear" && condition !== "partly-cloudy") {
    return null;
  }
  if (phase === "dawn") {
    return { x: 33, y: 36 };
  }
  return phase === "dusk" ? { x: 43, y: 43 } : null;
}

function hazeFor(phase: SkyPhase, condition: WeatherCondition): HazeSpec {
  const color = HAZE[phase];
  const isNight = phase === "night";
  switch (condition) {
    case "clear": {
      return { color, height: 0.45, opacity: isNight ? 0.14 : 0.32 };
    }
    case "partly-cloudy": {
      return { color, height: 0.45, opacity: isNight ? 0.12 : 0.28 };
    }
    case "fog": {
      return { color, height: 1, opacity: isNight ? 0.3 : 0.28 };
    }
    case "drizzle": {
      return { color, height: 0.75, opacity: isNight ? 0.18 : 0.42 };
    }
    case "snow": {
      return {
        color: "236 238 244",
        height: 0.7,
        opacity: isNight ? 0.16 : 0.32,
      };
    }
    case "rain": {
      return { color, height: 0.55, opacity: isNight ? 0.12 : 0.3 };
    }
    case "thunderstorm": {
      return { color, height: 0.4, opacity: 0.12 };
    }
    default: {
      return { color, height: 0.45, opacity: isNight ? 0.12 : 0.22 };
    }
  }
}

function horizonGlowFor(
  phase: SkyPhase,
  condition: WeatherCondition,
  sunX: number
): GlowSpec | null {
  const color = HORIZON_GLOW[phase];
  if (!color) {
    return null;
  }
  const coverage = COVERAGE[condition];
  return coverage > 0.9 && condition !== "thunderstorm"
    ? null
    : { color, opacity: 1 - coverage * 0.55, x: sunX };
}

function underglowFor(
  phase: SkyPhase,
  condition: WeatherCondition,
  sunX: number
): GlowSpec | null {
  const isDecked =
    condition === "cloudy" ||
    condition === "drizzle" ||
    condition === "rain" ||
    condition === "thunderstorm";
  if (phase === "night") {
    if (condition === "snow") {
      return { color: "rgb(255 160 110 / 0.42)", opacity: 1, x: 50 };
    }
    return isDecked || condition === "fog"
      ? { color: "rgb(255 150 90 / 0.26)", opacity: 1, x: 50 }
      : null;
  }
  if (!isDecked) {
    return null;
  }
  const strength: Partial<Record<WeatherCondition, number>> = {
    cloudy: 1,
    drizzle: 0.7,
    rain: 0.6,
    thunderstorm: 0.8,
  };
  const light: Partial<Record<SkyPhase, string>> = {
    dawn: "rgb(236 156 160 / 0.55)",
    dusk: "rgb(214 96 104 / 0.55)",
    "golden-hour": "rgb(255 196 112 / 0.7)",
    sunrise: "rgb(255 190 120 / 0.85)",
    sunset: "rgb(255 112 52 / 0.9)",
  };
  const color = light[phase];
  return color ? { color, opacity: strength[condition] ?? 0, x: sunX } : null;
}

function cirrusFor(
  phase: SkyPhase,
  condition: WeatherCondition
): CirrusSpec | null {
  const color = CIRRUS[phase];
  if (!color) {
    return null;
  }
  if (condition === "clear") {
    const opacity: Partial<Record<SkyPhase, number>> = {
      dawn: 0.5,
      day: 0.16,
      dusk: 0.45,
      "golden-hour": 0.36,
      sunrise: 0.55,
      sunset: 0.6,
    };
    return { color, opacity: opacity[phase] ?? 0, seed: 61 };
  }
  return condition === "partly-cloudy" && phase !== "dawn" && phase !== "dusk"
    ? { color, opacity: 0.2, seed: 67 }
    : null;
}

const LIT_DY: Record<SkyPhase, number> = {
  dawn: 6,
  day: -7,
  dusk: 6,
  "golden-hour": -2,
  night: -7,
  sunrise: 6,
  sunset: 6,
};

function cloudsFor(
  phase: SkyPhase,
  condition: WeatherCondition,
  sunX: number
): CloudFieldSpec | null {
  if (condition !== "partly-cloudy") {
    return null;
  }
  const [light, shade] = CLOUD_LIGHT[phase];
  const toward = phase === "night" ? 1 : Math.sign(sunX - 50);
  const isLow = LOW_SUN.has(phase) || TWILIGHT.has(phase);
  return {
    clouds: CLOUD_LAYOUT[phase],
    light,
    litDx: toward * (isLow ? 5 : 3),
    litDy: LIT_DY[phase],
    ragged: phase === "night" ? 1.2 : 1,
    shade,
    underlit: phase === "sunrise" || phase === "sunset" || TWILIGHT.has(phase),
  };
}

function deckFor(
  phase: SkyPhase,
  condition: WeatherCondition
): DeckSpec | null {
  const [light, shade] = CLOUD_HEAVY[phase];
  const isLifted = LOW_SUN.has(phase) || TWILIGHT.has(phase);
  switch (condition) {
    case "cloudy": {
      return {
        blur: 1.2,
        frequency: "0.0045 0.014",
        gain: 3.6,
        lifted: isLifted,
        light,
        offset: -1.2,
        relief: 1,
        seconds: 60,
        seed: 7,
        shade,
      };
    }
    case "fog": {
      return {
        blur: 3,
        frequency: "0.003 0.008",
        gain: 1.4,
        lifted: false,
        light,
        offset: -0.6,
        relief: 0,
        seconds: 80,
        seed: 5,
        shade: mix(light, shade, 0.5),
      };
    }
    case "drizzle": {
      return {
        blur: 1.6,
        frequency: "0.007 0.022",
        gain: 2.4,
        lifted: isLifted,
        light,
        offset: -0.45,
        relief: 0.4,
        seconds: 70,
        seed: 13,
        shade,
      };
    }
    case "rain": {
      return {
        blur: 2,
        filter: "brightness(0.82)",
        frequency: "0.004 0.012",
        gain: 2.2,
        lifted: isLifted,
        light,
        offset: -0.2,
        relief: 0.35,
        seconds: 54,
        seed: 17,
        shade,
      };
    }
    case "snow": {
      return {
        blur: 3.5,
        frequency: "0.003 0.01",
        gain: 1.8,
        lifted: false,
        light: mix(light, "#ffffff", 0.35),
        offset: -0.15,
        relief: 0.2,
        seconds: 90,
        seed: 19,
        shade: mix(shade, light, 0.5),
      };
    }
    case "thunderstorm": {
      return {
        blur: 0.8,
        filter: "brightness(0.62) contrast(1.2)",
        frequency: "0.0032 0.01",
        gain: 4.2,
        lifted: isLifted,
        light,
        offset: -0.85,
        relief: 1.4,
        seconds: 36,
        seed: 23,
        shade,
      };
    }
    default: {
      return null;
    }
  }
}

function raysFor(
  phase: SkyPhase,
  condition: WeatherCondition,
  sun: SunSpec | null
): RaysSpec | null {
  if (!sun || TWILIGHT.has(phase)) {
    return null;
  }
  const warm = phase === "day" ? "255 250 230" : "255 214 150";
  if (condition === "partly-cloudy" && phase !== "day") {
    return { color: warm, opacity: 0.4, x: sun.x, y: sun.y };
  }
  if (condition === "fog" && (phase === "day" || phase === "golden-hour")) {
    return { color: "255 252 240", opacity: 0.3, x: sun.x, y: sun.y };
  }
  return condition === "clear" && phase === "day"
    ? { color: warm, opacity: 0.22, x: sun.x, y: sun.y }
    : null;
}

function rainbowFor(
  phase: SkyPhase,
  condition: WeatherCondition,
  sunX: number
): number | null {
  const isShowery =
    condition === "rain" ||
    (condition === "drizzle" && phase === "golden-hour");
  return isShowery && LOW_SUN.has(phase) ? 100 - sunX : null;
}

function tintFor(phase: SkyPhase, condition: WeatherCondition): string | null {
  if (condition !== "thunderstorm") {
    return null;
  }
  const tint: Record<SkyPhase, string> = {
    dawn: "rgb(10 12 24 / 0.28)",
    day: "rgb(18 48 40 / 0.3)",
    dusk: "rgb(10 8 20 / 0.32)",
    "golden-hour": "rgb(70 40 10 / 0.24)",
    night: "rgb(4 6 14 / 0.34)",
    sunrise: "rgb(40 24 20 / 0.24)",
    sunset: "rgb(60 18 10 / 0.26)",
  };
  return tint[phase];
}

function precipitationFor(phase: SkyPhase): Rgb {
  const lit: Record<SkyPhase, Rgb> = {
    dawn: "236 226 240",
    day: "228 240 255",
    dusk: "226 210 226",
    "golden-hour": "255 240 220",
    night: "206 214 236",
    sunrise: "255 236 226",
    sunset: "255 222 204",
  };
  return lit[phase];
}

/**
The atmosphere for a phase and condition. `progress` is how far through the
day the sun is, sunrise 0 to sunset 1: it moves the day sun from east to
west.
*/
export function atmosphere(
  phase: SkyPhase,
  condition: WeatherCondition,
  progress = 0.5
): AtmosphereSpec {
  const sun = sunFor(phase, condition, progress);
  const sunX = sun?.x ?? SUN_PLACE.day.x;
  const coverage = COVERAGE[condition];
  const isNight = phase === "night" || phase === "dusk";

  return {
    cirrus: cirrusFor(phase, condition),
    clouds: cloudsFor(phase, condition, sunX),
    coverage,
    deck: deckFor(phase, condition),
    flash: isNight ? 1 : 0.6,
    fog:
      condition === "fog"
        ? { color: FOG_BANK[phase], opacity: isNight ? 0.8 : 0.75 }
        : null,
    haze: hazeFor(phase, condition),
    horizonGlow: horizonGlowFor(phase, condition, sunX),
    moon: moonFor(phase, condition),
    planet: planetFor(phase, condition),
    precipitation: precipitationFor(phase),
    rainShafts:
      condition === "rain" || condition === "thunderstorm"
        ? {
            color: LOW_SUN.has(phase) ? "120 92 92" : "40 48 62",
            opacity: condition === "thunderstorm" ? 0.42 : 0.28,
          }
        : null,
    rainbow: rainbowFor(phase, condition, sunX),
    rays: raysFor(phase, condition, sun),
    sky: skyFor(phase, condition),
    stars: starsFor(phase, condition),
    sun,
    tint: tintFor(phase, condition),
    underglow: underglowFor(phase, condition, sunX),
  };
}
