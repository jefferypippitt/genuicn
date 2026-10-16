import { useId } from "react";
import { atmosphere, seeded } from "@/features/weather/weather-atmosphere";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";
import type {
  AtmosphereSpec,
  CirrusSpec,
  CloudFieldSpec,
  CloudSpec,
  DeckSpec,
  GlowSpec,
  HazeSpec,
  MoonSpec,
  PlanetSpec,
  RaysSpec,
  Rgb,
  StarsSpec,
  SunSpec,
} from "@/features/weather/weather-atmosphere";
import type {
  SkyPhase,
  WeatherCondition,
} from "@/features/weather/weather-schema";

const KEYFRAMES = `
@keyframes gw-drift { from { transform: translateX(-14px); } to { transform: translateX(14px); } }
@keyframes gw-fog { from { transform: translateX(-40px); } to { transform: translateX(40px); } }
@keyframes gw-fall { from { transform: translate3d(0, -40px, 0) rotate(14deg); } to { transform: translate3d(-64px, 260px, 0) rotate(14deg); } }
@keyframes gw-snow {
  0% { transform: translate3d(0, -12px, 0); }
  25% { transform: translate3d(7px, 54px, 0); }
  50% { transform: translate3d(-5px, 120px, 0); }
  75% { transform: translate3d(6px, 186px, 0); }
  100% { transform: translate3d(0, 252px, 0); }
}
@keyframes gw-twinkle { 0%, 100% { opacity: var(--gw-o); } 50% { opacity: calc(var(--gw-o) * 0.2); } }
@keyframes gw-glow { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.07); } }
@keyframes gw-rays { 0%, 100% { opacity: 1; transform: rotate(0deg); } 50% { opacity: 0.6; transform: rotate(2deg); } }
@keyframes gw-flash {
  0%, 84%, 100% { opacity: 0; }
  85% { opacity: 0.75; }
  86.5% { opacity: 0.1; }
  88% { opacity: 0.55; }
  91% { opacity: 0; }
}
@keyframes gw-sheet {
  0%, 60%, 100% { opacity: 0; }
  61% { opacity: 0.7; }
  62.5% { opacity: 0.2; }
  64% { opacity: 0.5; }
  67% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .gw-anim { animation-play-state: paused !important; }
}
`;

export function WeatherSky({
  phase,
  condition,
  sunProgress,
  className,
}: {
  readonly phase: SkyPhase;
  readonly condition: WeatherCondition;
  /**
  How far through the day the sun is, sunrise 0 to sunset 1: moves the day sun from east to west.
  */
  readonly sunProgress?: number;
  readonly className?: string;
}) {
  const sky = atmosphere(phase, condition, sunProgress);
  const [top, middle, bottom] = sky.sky;

  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      <style href="genuicn-weather-sky" precedence="default">
        {KEYFRAMES}
      </style>
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, ${top} 0%, ${middle} 58%, ${bottom} 100%)`,
        }}
      />
      {sky.stars?.milkyWay ? <MilkyWay /> : null}
      {sky.stars ? <Stars stars={sky.stars} /> : null}
      {sky.planet ? <Planet planet={sky.planet} /> : null}
      {sky.horizonGlow ? <HorizonGlow glow={sky.horizonGlow} /> : null}
      <Haze haze={sky.haze} />
      {sky.sun ? <Sun sun={sky.sun} /> : null}
      {sky.moon ? <MoonLight moon={sky.moon} /> : null}
      {sky.rays ? <Rays rays={sky.rays} /> : null}
      {sky.cirrus ? <Cirrus cirrus={sky.cirrus} /> : null}
      {sky.clouds ? <CloudField field={sky.clouds} /> : null}
      {sky.deck ? <Deck deck={sky.deck} /> : null}
      {sky.underglow ? <Underglow glow={sky.underglow} /> : null}
      {sky.rainbow === null ? null : <Rainbow x={sky.rainbow} />}
      {sky.rainShafts ? <RainShafts shafts={sky.rainShafts} /> : null}
      {sky.fog ? <Fog fog={sky.fog} /> : null}
      {sky.tint ? (
        <div className="absolute inset-0" style={{ background: sky.tint }} />
      ) : null}
      <Precipitation condition={condition} sky={sky} />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgb(0 0 0 / 0.1) 0%, rgb(0 0 0 / 0) 38%, rgb(0 0 0 / 0) 62%, rgb(0 0 0 / 0.14) 100%)",
        }}
      />
    </div>
  );
}

function MilkyWay() {
  const id = useId();
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      className="absolute inset-0 size-full"
    >
      <defs>
        <filter id={`${id}-glow`} x="0" y="0" width="100%" height="100%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018 0.03"
            numOctaves={4}
            seed={3}
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.86  0 0 0 0 0.88  0 0 0 0 1  1.8 0 0 0 -0.6"
          />
          <feGaussianBlur stdDeviation={1.5} />
        </filter>
        <linearGradient
          id={`${id}-band`}
          x1="0"
          x2="0"
          y1="0"
          y2="1"
          gradientTransform="rotate(-24 0.5 0.5)"
        >
          <stop offset="0.2" stopColor="#fff" stopOpacity={0} />
          <stop offset="0.38" stopColor="#fff" stopOpacity={0.8} />
          <stop offset="0.46" stopColor="#fff" stopOpacity={0.3} />
          <stop offset="0.52" stopColor="#fff" stopOpacity={0.85} />
          <stop offset="0.68" stopColor="#fff" stopOpacity={0} />
        </linearGradient>
        <mask id={`${id}-mask`}>
          <rect width="400" height="220" fill={`url(#${id}-band)`} />
        </mask>
      </defs>
      <g mask={`url(#${id}-mask)`} opacity={0.32}>
        <rect width="400" height="220" filter={`url(#${id}-glow)`} />
      </g>
    </svg>
  );
}

const STAR_COUNT = 56;
const STARS = (() => {
  const random = seeded(7);
  return Array.from({ length: STAR_COUNT }, (_, index) => ({
    delay: random() * 6,
    id: index,
    left: random() * 100,
    opacity: 0.35 + random() * 0.6,
    seconds: 3 + random() * 4,
    size: random() < 0.15 ? 2 : 1,
    top: random() * 64,
  }));
})();

function Stars({ stars }: { readonly stars: StarsSpec }) {
  const shown = STARS.filter((star) => star.top < stars.maxTop).slice(
    0,
    stars.count
  );
  return (
    <div className="absolute inset-0" style={{ opacity: stars.opacity }}>
      {shown.map((star) => (
        <span
          key={star.id}
          className="gw-anim absolute rounded-full bg-white"
          style={
            {
              "--gw-o": star.opacity,
              animation: `gw-twinkle ${star.seconds}s ease-in-out ${-star.delay}s infinite`,
              height: star.size,
              left: `${star.left}%`,
              opacity: star.opacity,
              top: `${star.top}%`,
              width: star.size,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function Planet({ planet }: { readonly planet: PlanetSpec }) {
  return (
    <span
      className="absolute size-[3px] -translate-1/2 rounded-full bg-[#fffbea]"
      style={{
        boxShadow:
          "0 0 4px 1px rgb(255 250 225 / 0.8), 0 0 12px 3px rgb(255 240 210 / 0.25)",
        left: `${planet.x}%`,
        top: `${planet.y}%`,
      }}
    />
  );
}

function HorizonGlow({ glow }: { readonly glow: GlowSpec }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-3/4"
      style={{
        background: `radial-gradient(90% 95% at ${glow.x}% 108%, ${glow.color} 0%, transparent 72%), radial-gradient(160% 60% at 50% 110%, ${glow.color} 0%, transparent 60%)`,
        opacity: glow.opacity,
      }}
    />
  );
}

function Underglow({ glow }: { readonly glow: GlowSpec }) {
  return (
    <div
      className="absolute inset-x-0 bottom-0 h-1/2"
      style={{
        background: `radial-gradient(70% 70% at ${glow.x}% 100%, ${glow.color} 0%, transparent 75%), linear-gradient(0deg, ${glow.color} 0%, transparent 45%)`,
        opacity: glow.opacity,
      }}
    />
  );
}

function Haze({ haze }: { readonly haze: HazeSpec }) {
  if (haze.opacity <= 0) {
    return null;
  }
  return (
    <div
      className="absolute inset-x-0 bottom-0"
      style={{
        background: `linear-gradient(0deg, rgb(${haze.color} / ${haze.opacity}) 0%, rgb(${haze.color} / ${haze.opacity * 0.45}) 45%, transparent 100%)`,
        height: `${haze.height * 100}%`,
      }}
    />
  );
}

function Sun({ sun }: { readonly sun: SunSpec }) {
  const isPale = sun.look === "pale";
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        height: sun.size,
        left: `${sun.x}%`,
        opacity: sun.opacity,
        top: `${sun.y}%`,
        width: sun.size,
      }}
    >
      <div
        className="gw-anim absolute inset-0 rounded-full"
        style={{
          animation: isPale ? undefined : "gw-glow 9s ease-in-out infinite",
          background: `radial-gradient(circle, ${sun.color} 0%, transparent 62%)`,
          opacity: isPale ? 0.3 : 1,
        }}
      />
      <SunDisc sun={sun} />
    </div>
  );
}

function SunDisc({ sun }: { readonly sun: SunSpec }) {
  if (sun.look === "pale") {
    return (
      <div
        className="absolute top-1/2 left-1/2 size-[30px] -translate-1/2 rounded-full blur-[0.6px]"
        style={{
          background:
            "radial-gradient(circle, rgb(255 253 244 / 0.95) 0 64%, rgb(255 250 236 / 0.6) 100%)",
        }}
      />
    );
  }
  if (sun.look !== "disc") {
    return null;
  }
  if (sun.horizon) {
    return <HorizonSun color={sun.color} />;
  }
  return (
    <div
      className={cn(
        "absolute top-1/2 left-1/2 -translate-1/2 rounded-full",
        sun.small ? "size-5" : "size-[26px]"
      )}
      style={{
        background: "radial-gradient(circle, #fffdf2 0 55%, #fff1c4 100%)",
        boxShadow: `0 0 24px 8px ${sun.color}`,
      }}
    />
  );
}

function HorizonSun({ color }: { readonly color: string }) {
  return (
    <>
      <div
        className="absolute top-1/2 left-1/2 size-16 -translate-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgb(255 226 150 / 0.85) 0%, rgb(255 170 90 / 0.35) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 h-[21px] w-6 -translate-1/2 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 42%, #ffe2a0 0 22%, #ffb84d 58%, #ff7f35 100%)",
          maskImage:
            "linear-gradient(180deg, #000 0%, #000 42%, rgb(0 0 0 / 0.35) 62%, transparent 82%)",
        }}
      />
      <div
        className="absolute top-[calc(50%+4px)] left-1/2 h-2.5 w-[150px] -translate-x-1/2 rounded-full blur-[3px]"
        style={{
          background: `radial-gradient(50% 50% at 50% 50%, ${color} 0%, transparent 100%)`,
          opacity: 0.55,
        }}
      />
    </>
  );
}

function MoonLight({ moon }: { readonly moon: MoonSpec }) {
  const isHalo = moon.look === "halo";
  return (
    <div
      className="absolute size-[60px] -translate-1/2"
      style={{ left: `${moon.x}%`, opacity: moon.opacity, top: `${moon.y}%` }}
    >
      <div
        className={cn(
          "absolute rounded-full",
          isHalo ? "-inset-10" : "inset-0"
        )}
        style={{
          background: isHalo
            ? "radial-gradient(circle, rgb(236 234 255 / 0.75) 0%, rgb(220 222 250 / 0.3) 22%, rgb(200 206 240 / 0.1) 50%, transparent 72%)"
            : "radial-gradient(circle, rgb(240 236 255 / 0.9) 0%, transparent 62%)",
        }}
      />
      {moon.look === "full" ? <FullMoon /> : null}
      {moon.look === "crescent" ? <CrescentMoon /> : null}
    </div>
  );
}

const MARIA = [
  { cx: 9, cy: 8, rx: 3.4, ry: 2.7 },
  { cx: 13.9, cy: 8.3, rx: 2, ry: 1.8 },
  { cx: 15.6, cy: 11.2, rx: 2.5, ry: 2 },
  { cx: 19.1, cy: 9.2, rx: 1.2, ry: 1 },
  { cx: 18, cy: 13.8, rx: 1.3, ry: 1.9 },
  { cx: 10.6, cy: 16, rx: 2.1, ry: 1.4 },
  { cx: 5.9, cy: 12.2, rx: 2.8, ry: 4.4 },
] as const;

function FullMoon() {
  const id = useId();
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="absolute top-1/2 left-1/2 size-[22px] -translate-1/2 overflow-visible"
      style={{
        filter:
          "drop-shadow(0 0 5px rgb(232 230 255 / 0.55)) drop-shadow(0 0 16px rgb(200 206 255 / 0.22))",
      }}
    >
      <defs>
        <radialGradient id={`${id}-face`} cx="0.44" cy="0.42" r="0.6">
          <stop offset="0" stopColor="#fdfcff" />
          <stop offset="0.7" stopColor="#eceaf4" />
          <stop offset="1" stopColor="#cdc9dc" />
        </radialGradient>
        <filter id={`${id}-seas`} x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.55"
            numOctaves={2}
            seed={4}
          />
          <feDisplacementMap in="SourceGraphic" scale={1.4} />
          <feGaussianBlur stdDeviation={0.45} />
        </filter>
        <clipPath id={`${id}-disc`}>
          <circle cx={12} cy={12} r={11} />
        </clipPath>
      </defs>
      <circle cx={12} cy={12} r={11} fill={`url(#${id}-face)`} />
      <g clipPath={`url(#${id}-disc)`}>
        <g filter={`url(#${id}-seas)`} fill="#9592ad" opacity={0.3}>
          {MARIA.map((sea) => (
            <ellipse key={`${sea.cx}-${sea.cy}`} {...sea} />
          ))}
        </g>
        <circle cx={11.2} cy={20} r={0.6} fill="#fff" opacity={0.45} />
      </g>
    </svg>
  );
}

function CrescentMoon() {
  const id = useId();
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      className="absolute top-1/2 left-1/2 size-[18px] -translate-1/2 overflow-visible"
      style={{ filter: "drop-shadow(0 0 4px rgb(255 240 220 / 0.6))" }}
    >
      <defs>
        <mask id={`${id}-lit`}>
          <circle cx={12} cy={12} r={11} fill="#fff" />
          <circle cx={8.6} cy={9.4} r={10.6} fill="#000" />
        </mask>
      </defs>
      <circle cx={12} cy={12} r={11} fill="#c8cbe6" opacity={0.12} />
      <circle cx={12} cy={12} r={11} fill="#fff8e6" mask={`url(#${id}-lit)`} />
    </svg>
  );
}

const RAY_STOPS = (() => {
  const random = seeded(71);
  const stops: string[] = [];
  let angle = 0;
  while (angle < 360) {
    const gap = 4 + random() * 10;
    const width = 2 + random() * 6;
    const strength = 0.35 + random() * 0.65;
    stops.push(
      `transparent ${angle.toFixed(1)}deg`,
      `rgb(var(--gw-ray) / ${strength.toFixed(2)}) ${(angle + gap).toFixed(1)}deg`,
      `transparent ${(angle + gap + width).toFixed(1)}deg`
    );
    angle += gap + width;
  }
  return stops.join(", ");
})();

function Rays({ rays }: { readonly rays: RaysSpec }) {
  return (
    <div
      className="absolute size-[640px] -translate-1/2"
      style={{
        left: `${rays.x}%`,
        maskImage:
          "radial-gradient(circle, transparent 0 4%, #000 10%, rgb(0 0 0 / 0.4) 30%, transparent 50%)",
        mixBlendMode: "screen",
        opacity: rays.opacity,
        top: `${rays.y}%`,
      }}
    >
      <div
        className="gw-anim absolute inset-0 rounded-full blur-[3px]"
        style={
          {
            "--gw-ray": rays.color,
            animation: "gw-rays 14s ease-in-out infinite",
            background: `conic-gradient(${RAY_STOPS})`,
          } as CSSProperties
        }
      />
    </div>
  );
}

function Rainbow({ x }: { readonly x: number }) {
  return (
    <div
      className="absolute inset-0 blur-[2px]"
      style={{
        background: `radial-gradient(circle 190px at ${x}% 125%, rgb(255 255 255 / 0.07) 0 76%, transparent 79%, rgb(150 100 230 / 0.5) 81%, rgb(80 130 255 / 0.5) 84%, rgb(90 210 130 / 0.5) 87%, rgb(255 230 100 / 0.55) 90%, rgb(255 150 70 / 0.5) 92.5%, rgb(240 80 70 / 0.45) 95%, transparent 98%)`,
        maskImage:
          "linear-gradient(0deg, transparent 0%, rgb(0 0 0 / 0.6) 25%, #000 50%)",
        opacity: 0.32,
      }}
    />
  );
}

function Cirrus({ cirrus }: { readonly cirrus: CirrusSpec }) {
  const id = useId();
  const [r, g, b] = cirrus.color
    .split(" ")
    .map((channel) => Number(channel) / 255);
  return (
    <div
      className="gw-anim absolute -inset-x-[10%] inset-y-0"
      style={{
        animation: "gw-drift 70s ease-in-out -30s infinite alternate",
        opacity: cirrus.opacity,
      }}
    >
      <svg
        viewBox="0 0 440 220"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <filter id={`${id}-streaks`} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency="0.003 0.045"
              numOctaves={4}
              seed={cirrus.seed}
            />
            <feColorMatrix
              type="matrix"
              values={`0 0 0 0 ${r}  0 0 0 0 ${g}  0 0 0 0 ${b}  3.2 0 0 0 -1.45`}
            />
            <feGaussianBlur stdDeviation="2.5 0.6" />
          </filter>
          <linearGradient id={`${id}-fade`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0.05" stopColor="#fff" stopOpacity={0} />
            <stop offset="0.25" stopColor="#fff" stopOpacity={1} />
            <stop offset="0.6" stopColor="#fff" stopOpacity={0.7} />
            <stop offset="0.85" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id={`${id}-mask`}>
            <rect width="440" height="220" fill={`url(#${id}-fade)`} />
          </mask>
        </defs>
        <g mask={`url(#${id}-mask)`} transform="rotate(-5 220 110)">
          <rect
            x="-20"
            y="-20"
            width="480"
            height="260"
            filter={`url(#${id}-streaks)`}
          />
        </g>
      </svg>
    </div>
  );
}

function CloudShape({ cloud }: { readonly cloud: CloudSpec }) {
  return (
    <g
      transform={`translate(${cloud.x} ${cloud.y}) scale(${cloud.scale} ${cloud.scale * cloud.stretch})`}
      opacity={cloud.opacity}
    >
      <ellipse cx={0} cy={2} rx={52} ry={15} />
      <ellipse cx={-24} cy={-8} rx={26} ry={19} />
      <ellipse cx={6} cy={-19} rx={31} ry={25} />
      <ellipse cx={33} cy={-7} rx={22} ry={16} />
    </g>
  );
}

interface CloudPass {
  key: "shade" | "body" | "light";
  blur: number;
  displace: number;
  opacity: number;
}

const CLOUD_PASSES: readonly CloudPass[] = [
  { blur: 7, displace: 46, key: "shade", opacity: 1 },
  { blur: 5, displace: 38, key: "body", opacity: 0.95 },
  { blur: 3.5, displace: 26, key: "light", opacity: 0.85 },
];

function CloudField({ field }: { readonly field: CloudFieldSpec }) {
  const back = field.clouds.filter((cloud) => cloud.y < 100);
  const front = field.clouds.filter((cloud) => cloud.y >= 100);
  return (
    <div className="absolute inset-0">
      {back.length > 0 ? (
        <CloudDeck clouds={back} field={field} seed={3} seconds={46} />
      ) : null}
      {front.length > 0 ? (
        <CloudDeck clouds={front} field={field} seed={11} seconds={30} />
      ) : null}
    </div>
  );
}

function CloudDeck({
  clouds,
  field,
  seed,
  seconds,
}: {
  readonly clouds: readonly CloudSpec[];
  readonly field: CloudFieldSpec;
  readonly seed: number;
  readonly seconds: number;
}) {
  const id = useId();
  const offset: Record<CloudPass["key"], readonly [number, number]> = {
    body: [0, 0],
    light: [field.litDx, field.litDy],
    shade: [-field.litDx * 0.6, -field.litDy * 1.1],
  };
  const fill: Record<CloudPass["key"], string> = {
    body: `url(#${id}-body)`,
    light: field.light,
    shade: field.shade,
  };
  const [bodyTop, bodyBottom] = field.underlit
    ? [field.shade, field.light]
    : [field.light, field.shade];
  return (
    <div
      className="gw-anim absolute -inset-x-[8%] inset-y-0"
      style={{
        animation: `gw-drift ${seconds}s ease-in-out ${-seconds / 3}s infinite alternate`,
        willChange: "transform",
      }}
    >
      <svg
        viewBox="0 0 400 220"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full overflow-visible"
      >
        <defs>
          {CLOUD_PASSES.map((pass) => (
            <filter
              key={pass.key}
              id={`${id}-${pass.key}`}
              x="-25%"
              y="-40%"
              width="150%"
              height="180%"
            >
              <feGaussianBlur
                in="SourceGraphic"
                stdDeviation={pass.blur}
                result="soft"
              />
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.02"
                numOctaves={4}
                seed={seed + pass.blur}
                result="noise"
              />
              <feDisplacementMap
                in="soft"
                in2="noise"
                scale={pass.displace * field.ragged}
                xChannelSelector="R"
                yChannelSelector="G"
              />
            </filter>
          ))}
          <linearGradient id={`${id}-body`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={bodyTop} />
            <stop offset="1" stopColor={bodyBottom} />
          </linearGradient>
        </defs>
        {CLOUD_PASSES.map((pass) => (
          <g
            key={pass.key}
            filter={`url(#${id}-${pass.key})`}
            fill={fill[pass.key]}
            opacity={pass.opacity}
            transform={`translate(${offset[pass.key][0]} ${offset[pass.key][1]})`}
          >
            {clouds.map((cloud) => (
              <CloudShape key={`${cloud.x}-${cloud.y}`} cloud={cloud} />
            ))}
          </g>
        ))}
      </svg>
    </div>
  );
}

function Deck({ deck }: { readonly deck: DeckSpec }) {
  const id = useId();
  const coverage = (gain: number, offset: number) =>
    `0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  ${gain} 0 0 0 ${offset}`;
  const fade = deck.lifted
    ? [
        [0, 1],
        [0.5, 0.92],
        [0.8, 0.3],
        [1, 0.05],
      ]
    : [
        [0, 1],
        [0.65, 0.85],
        [1, 0.45],
      ];
  return (
    <div
      className="gw-anim absolute -inset-x-[10%] inset-y-0"
      style={{
        animation: `gw-drift ${deck.seconds}s ease-in-out -20s infinite alternate`,
        filter: deck.filter,
        willChange: "transform",
      }}
    >
      <svg
        viewBox="0 0 440 220"
        preserveAspectRatio="xMidYMid slice"
        className="absolute inset-0 size-full"
      >
        <defs>
          <filter id={`${id}-deck`} x="0" y="0" width="100%" height="100%">
            <feTurbulence
              type="fractalNoise"
              baseFrequency={deck.frequency}
              numOctaves={5}
              seed={deck.seed}
              result="noise"
            />
            <feColorMatrix
              in="noise"
              type="matrix"
              values={coverage(deck.gain, deck.offset)}
              result="bodyHard"
            />
            <feGaussianBlur
              in="bodyHard"
              stdDeviation={deck.blur}
              result="bodyAlpha"
            />
            <feFlood floodColor={deck.shade} />
            <feComposite in2="bodyAlpha" operator="in" result="body" />
            <feColorMatrix
              in="noise"
              type="matrix"
              values={coverage(4.2, -2.15)}
              result="topAlpha"
            />
            <feOffset
              in="topAlpha"
              dy={-5 * Math.max(deck.relief, 0.4)}
              result="topShift"
            />
            <feGaussianBlur
              in="topShift"
              stdDeviation={deck.blur + 0.4}
              result="topSoft"
            />
            <feFlood
              floodColor={deck.light}
              floodOpacity={Math.min(deck.relief, 1)}
            />
            <feComposite in2="topSoft" operator="in" result="tops" />
            <feMerge>
              <feMergeNode in="body" />
              <feMergeNode in="tops" />
            </feMerge>
          </filter>
          <linearGradient id={`${id}-fade`} x1="0" x2="0" y1="0" y2="1">
            {fade.map(([offset, opacity]) => (
              <stop
                key={offset}
                offset={offset}
                stopColor="#fff"
                stopOpacity={opacity}
              />
            ))}
          </linearGradient>
          <mask id={`${id}-mask`}>
            <rect width="440" height="220" fill={`url(#${id}-fade)`} />
          </mask>
        </defs>
        <g mask={`url(#${id}-mask)`}>
          <rect width="440" height="220" filter={`url(#${id}-deck)`} />
        </g>
      </svg>
    </div>
  );
}

const SHAFTS = (() => {
  const random = seeded(83);
  return Array.from({ length: 5 }, (_, id) => ({
    id,
    left: 4 + id * 19 + random() * 10,
    seconds: 40 + random() * 30,
    strength: 0.6 + random() * 0.4,
    width: 36 + random() * 40,
  }));
})();

function RainShafts({
  shafts,
}: {
  readonly shafts: { readonly color: Rgb; readonly opacity: number };
}) {
  return (
    <div className="absolute inset-0" style={{ opacity: shafts.opacity }}>
      {SHAFTS.map((shaft) => (
        <div
          key={shaft.id}
          className="gw-anim absolute top-[18%] bottom-0 -skew-x-12 blur-md"
          style={{
            animation: `gw-fog ${shaft.seconds}s ease-in-out ${-shaft.seconds / 2}s infinite alternate`,
            background: `linear-gradient(180deg, transparent 0%, rgb(${shafts.color} / ${shaft.strength}) 35%, rgb(${shafts.color} / ${shaft.strength * 0.7}) 100%)`,
            left: `${shaft.left}%`,
            width: shaft.width,
          }}
        />
      ))}
    </div>
  );
}

const FOG_BANDS = [
  { opacity: 0.32, seconds: 30, y: "38%" },
  { opacity: 0.4, seconds: 38, y: "62%" },
  { opacity: 0.5, seconds: 26, y: "86%" },
] as const;

function Fog({
  fog,
}: {
  readonly fog: { readonly color: Rgb; readonly opacity: number };
}) {
  return (
    <div className="absolute inset-0" style={{ opacity: fog.opacity }}>
      {FOG_BANDS.map((band) => (
        <div
          key={band.y}
          className="gw-anim absolute -inset-x-1/4 h-16 -translate-y-1/2 rounded-full blur-xl"
          style={{
            animation: `gw-fog ${band.seconds}s ease-in-out infinite alternate`,
            background: `rgb(${fog.color} / ${band.opacity})`,
            top: band.y,
          }}
        />
      ))}
    </div>
  );
}

const PRECIP_KEYFRAMES = `
@keyframes gw-run {
  0%, 55% { transform: translateY(0); opacity: 1; }
  92% { opacity: 1; }
  100% { transform: translateY(240px); opacity: 0; }
}
@keyframes gw-bolt {
  0%, 84.5%, 100% { opacity: 0; }
  85% { opacity: 1; }
  86.5% { opacity: 0.15; }
  88% { opacity: 0.9; }
  90% { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .gw-anim { animation-play-state: paused !important; }
}
`;

interface Streak {
  id: number;
  left: number;
  delay: number;
  seconds: number;
  length: number;
  opacity: number;
}

interface Depth {
  count: number;
  seed: number;
  seconds: readonly [number, number];
  length: readonly [number, number];
  width: number;
  opacity: readonly [number, number];
  blur: number;
}

function makeStreaks(depth: Depth): Streak[] {
  const random = seeded(depth.seed);
  return Array.from({ length: depth.count }, (_, index) => ({
    delay: random() * 2,
    id: index,
    left: random() * 116,
    length: depth.length[0] + random() * (depth.length[1] - depth.length[0]),
    opacity:
      depth.opacity[0] + random() * (depth.opacity[1] - depth.opacity[0]),
    seconds:
      depth.seconds[0] + random() * (depth.seconds[1] - depth.seconds[0]),
  }));
}

type RainDepth = Depth & { streaks: Streak[] };

function rainDepths(count: number, speed: number, seed: number): RainDepth[] {
  const depths: Depth[] = [
    {
      blur: 0,
      count: Math.round(count * 0.5),
      length: [7, 11],
      opacity: [0.18, 0.32],
      seconds: [0.95 * speed, 1.3 * speed],
      seed,
      width: 0.8,
    },
    {
      blur: 0,
      count: Math.round(count * 0.35),
      length: [13, 19],
      opacity: [0.35, 0.55],
      seconds: [0.6 * speed, 0.8 * speed],
      seed: seed + 1,
      width: 1.2,
    },
    {
      blur: 1,
      count: Math.round(count * 0.15),
      length: [26, 36],
      opacity: [0.25, 0.4],
      seconds: [0.38 * speed, 0.5 * speed],
      seed: seed + 2,
      width: 2.2,
    },
  ];
  return depths.map((depth) => ({ ...depth, streaks: makeStreaks(depth) }));
}

const RAIN = rainDepths(80, 1, 11);
const STORM_RAIN = rainDepths(110, 0.85, 13);
const DRIZZLE = rainDepths(46, 1.6, 17).slice(0, 2);

interface Flake {
  id: number;
  left: number;
  delay: number;
  seconds: number;
  size: number;
  opacity: number;
  blur: number;
}

const FLAKES: readonly Flake[] = (() => {
  const random = seeded(19);
  const layer = (
    count: number,
    size: readonly [number, number],
    seconds: readonly [number, number],
    opacity: readonly [number, number],
    blur: number
  ) =>
    Array.from({ length: count }, () => ({
      blur,
      delay: random() * 9,
      left: random() * 100,
      opacity: opacity[0] + random() * (opacity[1] - opacity[0]),
      seconds: seconds[0] + random() * (seconds[1] - seconds[0]),
      size: size[0] + random() * (size[1] - size[0]),
    }));
  return [
    ...layer(34, [1.4, 2.4], [7, 10], [0.5, 0.85], 0),
    ...layer(18, [2.6, 4], [5, 7], [0.7, 0.95], 0),
    ...layer(7, [6, 10], [3.2, 4.4], [0.35, 0.55], 2),
  ].map((flake, id) => ({ ...flake, id }));
})();

interface Bead {
  id: number;
  left: number;
  top: number;
  size: number;
  run: number;
  delay: number;
}

function makeBeads(
  count: number,
  runners: number,
  seed: number,
  size: readonly [number, number]
): Bead[] {
  const random = seeded(seed);
  return Array.from({ length: count }, (_, id) => ({
    delay: random() * 10,
    id,
    left: random() * 98,
    run: id < runners ? 7 + random() * 6 : 0,
    size: size[0] + random() * (size[1] - size[0]),
    top: random() * 92,
  }));
}

const RAIN_BEADS = makeBeads(22, 4, 29, [3.2, 7.5]);
const DRIZZLE_BEADS = makeBeads(34, 2, 31, [1.8, 4]);

function Precipitation({
  condition,
  sky,
}: {
  readonly condition: WeatherCondition;
  readonly sky: AtmosphereSpec;
}) {
  const color = sky.precipitation;
  return (
    <>
      <style href="genuicn-weather-precip" precedence="default">
        {PRECIP_KEYFRAMES}
      </style>
      {condition === "snow" ? <Snow color={color} /> : null}
      {condition === "rain" ? (
        <Rain depths={RAIN} beads={RAIN_BEADS} color={color} />
      ) : null}
      {condition === "drizzle" ? (
        <Rain depths={DRIZZLE} beads={DRIZZLE_BEADS} color={color} />
      ) : null}
      {condition === "thunderstorm" ? (
        <>
          <Lightning />
          <Rain depths={STORM_RAIN} beads={RAIN_BEADS} color={color} />
          <div className="absolute inset-0" style={{ opacity: sky.flash }}>
            <div
              className="gw-anim absolute inset-0 bg-[#dfe6ff]"
              style={{ animation: "gw-flash 7s linear infinite", opacity: 0 }}
            />
            <div
              className="gw-anim absolute inset-0"
              style={{
                animation: "gw-sheet 11s linear -4s infinite",
                background:
                  "radial-gradient(60% 55% at 22% 18%, rgb(214 222 255 / 0.55) 0%, transparent 70%)",
                opacity: 0,
              }}
            />
          </div>
        </>
      ) : null}
    </>
  );
}

function Rain({
  depths,
  beads,
  color,
}: {
  readonly depths: readonly RainDepth[];
  readonly beads: readonly Bead[];
  readonly color: Rgb;
}) {
  return (
    <div className="absolute inset-0">
      {depths.map((depth) => (
        <div
          key={depth.seed}
          className="absolute inset-0"
          style={depth.blur ? { filter: `blur(${depth.blur}px)` } : undefined}
        >
          {depth.streaks.map((drop) => (
            <span
              key={drop.id}
              className="gw-anim absolute -top-10 rounded-full"
              style={{
                animation: `gw-fall ${drop.seconds}s linear ${-drop.delay}s infinite`,
                background: `linear-gradient(180deg, rgb(255 255 255 / 0), rgb(${color} / 0.95))`,
                height: drop.length,
                left: `${drop.left}%`,
                opacity: drop.opacity,
                width: depth.width,
              }}
            />
          ))}
        </div>
      ))}
      <GlassBeads beads={beads} />
    </div>
  );
}

function GlassBeads({ beads }: { readonly beads: readonly Bead[] }) {
  return (
    <div className="absolute inset-0">
      {beads.map((bead) => (
        <span
          key={bead.id}
          className={cn("absolute", bead.run > 0 && "gw-anim")}
          style={{
            animation:
              bead.run > 0
                ? `gw-run ${bead.run}s cubic-bezier(0.55, 0, 0.9, 0.6) ${-bead.delay}s infinite`
                : undefined,
            left: `${bead.left}%`,
            top: `${bead.top}%`,
          }}
        >
          {bead.run > 0 ? (
            <span
              className="absolute bottom-1/2 left-1/2 -translate-x-1/2 rounded-full"
              style={{
                background:
                  "linear-gradient(180deg, rgb(255 255 255 / 0), rgb(255 255 255 / 0.16))",
                height: bead.size * 7,
                width: bead.size * 0.45,
              }}
            />
          ) : null}
          <span
            className="block rounded-full"
            style={{
              background:
                "radial-gradient(circle at 34% 26%, rgb(255 255 255 / 0.95) 0 9%, rgb(255 255 255 / 0) 16%), radial-gradient(ellipse 70% 55% at 50% 72%, rgb(255 255 255 / 0.5) 0%, rgb(255 255 255 / 0.12) 60%, rgb(255 255 255 / 0) 100%), radial-gradient(circle at 50% 50%, rgb(255 255 255 / 0.04) 0 55%, rgb(0 0 0 / 0.32) 82%, rgb(0 0 0 / 0.08) 100%)",
              boxShadow: "0 0.5px 1px rgb(0 0 0 / 0.25)",
              height: bead.size * 1.2,
              width: bead.size,
            }}
          />
        </span>
      ))}
    </div>
  );
}

function Snow({ color }: { readonly color: Rgb }) {
  return (
    <div className="absolute inset-0">
      {FLAKES.map((flake) => (
        <span
          key={flake.id}
          className="gw-anim absolute -top-3 rounded-full"
          style={{
            animation: `gw-snow ${flake.seconds}s linear ${-flake.delay}s infinite`,
            background: `radial-gradient(circle, rgb(${color}) 0 45%, rgb(${color} / 0.6) 70%, rgb(${color} / 0) 100%)`,
            filter: flake.blur ? `blur(${flake.blur}px)` : undefined,
            height: flake.size,
            left: `${flake.left}%`,
            opacity: flake.opacity,
            width: flake.size,
          }}
        />
      ))}
    </div>
  );
}

const BOLT = (() => {
  const random = seeded(41);
  let x = 250;
  let y = -4;
  let main = `M${x} ${y}`;
  const forks: string[] = [];
  while (y < 150) {
    x += (random() - 0.5) * 26;
    y += 8 + random() * 12;
    main += ` L${x.toFixed(1)} ${y.toFixed(1)}`;
    if (random() < 0.28) {
      let fx = x;
      let fy = y;
      let fork = `M${fx.toFixed(1)} ${fy.toFixed(1)}`;
      const direction = random() < 0.5 ? -1 : 1;
      for (let step = 0; step < 3; step += 1) {
        fx += direction * (6 + random() * 12);
        fy += 6 + random() * 10;
        fork += ` L${fx.toFixed(1)} ${fy.toFixed(1)}`;
      }
      forks.push(fork);
    }
  }
  return { forks, main };
})();

function Lightning() {
  const id = useId();
  return (
    <svg
      viewBox="0 0 400 220"
      preserveAspectRatio="xMidYMid slice"
      className="gw-anim absolute inset-0 size-full"
      style={{ animation: "gw-bolt 7s linear infinite", opacity: 0 }}
    >
      <defs>
        <radialGradient id={`${id}-glow`} cx="0.62" cy="0.05" r="0.5">
          <stop offset="0" stopColor="#e8ecff" stopOpacity={0.75} />
          <stop offset="1" stopColor="#e8ecff" stopOpacity={0} />
        </radialGradient>
        <filter id={`${id}-bloom`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={3} result="wide" />
          <feMerge>
            <feMergeNode in="wide" />
            <feMergeNode in="wide" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <rect width="400" height="220" fill={`url(#${id}-glow)`} />
      <g
        filter={`url(#${id}-bloom)`}
        fill="none"
        stroke="#f4f6ff"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={BOLT.main} strokeWidth={1.8} />
        {BOLT.forks.map((fork) => (
          <path key={fork} d={fork} strokeWidth={0.9} opacity={0.8} />
        ))}
      </g>
    </svg>
  );
}
