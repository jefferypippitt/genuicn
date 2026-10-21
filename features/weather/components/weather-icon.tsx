import type { WeatherCondition } from "@/features/weather/weather-schema";

const SUN = "#FFD60A";
const RAIN = "#64D2FF";
/**
Clouds and the moon are white for the Weather card's sky. A card on a plain surface sets --weather-cloud and --weather-moon to darker tones, so they stay visible.
*/
const CLOUD = "var(--weather-cloud, #FFFFFF)";
const MOON = "var(--weather-moon, #F5F3FF)";

const CLOUD_PATH =
  "M9.6 26h13.9a6.25 6.25 0 0 0 .78-12.45A8.25 8.25 0 0 0 8.5 15.1 5.5 5.5 0 0 0 9.6 26Z";

const RAY_ANGLES = [0, 45, 90, 135, 180, 225, 270, 315] as const;

function Sun({
  cx,
  cy,
  radius,
}: {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}) {
  return (
    <g>
      <circle cx={cx} cy={cy} r={radius} fill={SUN} />
      {RAY_ANGLES.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const inner = radius + 2.2;
        const outer = radius + 4.6;
        return (
          <line
            key={angle}
            x1={cx + Math.cos(rad) * inner}
            y1={cy + Math.sin(rad) * inner}
            x2={cx + Math.cos(rad) * outer}
            y2={cy + Math.sin(rad) * outer}
            stroke={SUN}
            strokeWidth={2}
            strokeLinecap="round"
          />
        );
      })}
    </g>
  );
}

function Moon({
  cx,
  cy,
  radius,
}: {
  readonly cx: number;
  readonly cy: number;
  readonly radius: number;
}) {
  const r = radius;
  return (
    <path
      d={`M${cx + r * 0.35} ${cy - r}A${r} ${r} 0 1 0 ${cx + r} ${cy + r * 0.35} ${r * 0.8} ${r * 0.8} 0 0 1 ${cx + r * 0.35} ${cy - r}Z`}
      style={{ fill: MOON }}
    />
  );
}

function Cloud({
  lift = 0,
  opacity = 1,
}: {
  readonly lift?: number;
  readonly opacity?: number;
}) {
  return (
    <path
      d={CLOUD_PATH}
      style={{ fill: CLOUD }}
      opacity={opacity}
      transform={lift ? `translate(0 ${-lift})` : undefined}
    />
  );
}

function Precipitation({
  condition,
}: {
  readonly condition: WeatherCondition;
}) {
  if (condition === "rain") {
    return (
      <g stroke={RAIN} strokeWidth={2} strokeLinecap="round">
        <line x1={11} y1={25} x2={9.5} y2={29} />
        <line x1={16.5} y1={25} x2={15} y2={29} />
        <line x1={22} y1={25} x2={20.5} y2={29} />
      </g>
    );
  }
  if (condition === "drizzle") {
    return (
      <g fill={RAIN}>
        <circle cx={11} cy={26.5} r={1.2} />
        <circle cx={16.5} cy={28} r={1.2} />
        <circle cx={22} cy={26.5} r={1.2} />
      </g>
    );
  }
  if (condition === "snow") {
    return (
      <g style={{ fill: CLOUD }}>
        <circle cx={11} cy={26} r={1.5} />
        <circle cx={16.5} cy={28.5} r={1.5} />
        <circle cx={22} cy={26} r={1.5} />
      </g>
    );
  }
  if (condition === "thunderstorm") {
    return <path d="M17.5 21 13 27.5h3.4L15 32l5-7h-3.6l1.6-4Z" fill={SUN} />;
  }
  if (condition === "fog") {
    return (
      <g
        style={{ stroke: CLOUD }}
        strokeWidth={2}
        strokeLinecap="round"
        opacity={0.85}
      >
        <line x1={7} y1={25.5} x2={25} y2={25.5} />
        <line x1={10} y1={29.5} x2={22} y2={29.5} />
      </g>
    );
  }
  return null;
}

export function WeatherIcon({
  condition,
  isDay = true,
  size = 24,
  className,
}: {
  readonly condition: WeatherCondition;
  readonly isDay?: boolean;
  readonly size?: number;
  readonly className?: string;
}) {
  let glyph;
  switch (condition) {
    case "clear": {
      glyph = isDay ? (
        <Sun cx={16} cy={16} radius={6.5} />
      ) : (
        <Moon cx={15} cy={16} radius={9} />
      );

      break;
    }
    case "partly-cloudy": {
      glyph = (
        <>
          {isDay ? (
            <Sun cx={12} cy={11} radius={5} />
          ) : (
            <Moon cx={12} cy={10.5} radius={6.5} />
          )}
          <g transform="translate(4 3) scale(0.85)">
            <Cloud />
          </g>
        </>
      );

      break;
    }
    case "cloudy": {
      glyph = <Cloud lift={2} />;

      break;
    }
    default: {
      glyph = (
        <>
          <Cloud lift={condition === "thunderstorm" ? 6 : 5} />
          <Precipitation condition={condition} />
        </>
      );
    }
  }

  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden
      className={className}
    >
      {glyph}
    </svg>
  );
}
