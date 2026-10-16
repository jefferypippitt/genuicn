import type {
  CryptoData,
  CryptoPoint,
  CryptoRange,
} from "@/features/crypto/crypto-schema";

/**
Six well-known coins as CoinGecko listed them on October 16, 2026: their logos, prices, market caps and volumes, plus the week each first traded on Kraken and its price then, which the all-time line starts from. The lines in between are generated.
*/
export const FAKE_COINS = [
  {
    firstPrice: 123.8,
    image:
      "https://coin-images.coingecko.com/coins/images/1/large/bitcoin.png?1696501400",
    listed: Date.UTC(2013, 9, 3),
    marketCap: 1_643_938_741_915,
    name: "Bitcoin",
    price: 81_819,
    symbol: "BTC",
    volume24h: 30_928_357_943,
  },
  {
    firstPrice: 1.28,
    image:
      "https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628",
    listed: Date.UTC(2015, 7, 6),
    marketCap: 298_424_591_670,
    name: "Ethereum",
    price: 2443.96,
    symbol: "ETH",
    volume24h: 14_207_716_301,
  },
  {
    firstPrice: 0.289,
    image:
      "https://coin-images.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png?1696501442",
    listed: Date.UTC(2017, 4, 18),
    marketCap: 84_094_553_068,
    name: "XRP",
    price: 1.33,
    symbol: "XRP",
    volume24h: 1_572_640_277,
  },
  {
    firstPrice: 30,
    image:
      "https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1718769756",
    listed: Date.UTC(2021, 5, 17),
    marketCap: 62_296_356_360,
    name: "Solana",
    price: 105.74,
    symbol: "SOL",
    volume24h: 3_232_024_541,
  },
  {
    firstPrice: 0.00202,
    image:
      "https://coin-images.coingecko.com/coins/images/5/large/dogecoin.png?1696501409",
    listed: Date.UTC(2019, 11, 19),
    marketCap: 12_800_981_420,
    name: "Dogecoin",
    price: 0.081897,
    symbol: "DOGE",
    volume24h: 1_149_959_467,
  },
  {
    firstPrice: 0.0797,
    image:
      "https://coin-images.coingecko.com/coins/images/975/large/cardano.png?1696502090",
    listed: Date.UTC(2018, 8, 27),
    marketCap: 8_641_352_030,
    name: "Cardano",
    price: 0.230158,
    symbol: "ADA",
    volume24h: 353_572_613,
  },
] as const;

const HOUR_MS = 3_600_000;
/**
How far a short-range line leans the way it's going, in steps of its swing, so no card reads a flat "+0.0%".
*/
const TILT_STEPS = 3;
const DAY_MS = 24 * HOUR_MS;

/**
How each range's line is drawn: how many points, how far apart, and how much the price wanders per step. The all-time line spreads its points from the coin's listing to now instead.
*/
const SHAPE: Record<
  CryptoRange,
  { count: number; every: number; swing: number }
> = {
  "1m": { count: 181, every: 4 * HOUR_MS, swing: 0.012 },
  "1w": { count: 169, every: HOUR_MS, swing: 0.006 },
  "1y": { count: 366, every: DAY_MS, swing: 0.028 },
  "24h": { count: 25, every: HOUR_MS, swing: 0.004 },
  all: { count: 240, every: 7 * DAY_MS, swing: 0.09 },
};

const MODULUS = 2_147_483_647;
const MULTIPLIER = 48_271;
const HASH_BASE = 31;

/**
A small seeded random source: the same seed always gives the same numbers, between 0 and 1.
*/
function seeded(seed: string) {
  let state = 1;
  for (const char of seed) {
    state = (state * HASH_BASE + (char.codePointAt(0) ?? 0)) % MODULUS;
  }
  return () => {
    state = (state * MULTIPLIER) % MODULUS;
    return state / MODULUS;
  };
}

/**
Which coins fall over each short range, so every tab of the docs shows both the rising and the falling card. Over all time every one of these coins is up, so "all" has none.
*/
const FALLING: Record<CryptoRange, readonly string[]> = {
  "1m": ["SOL", "XRP", "ADA"],
  "1w": ["BTC", "ETH", "DOGE"],
  "1y": ["XRP", "SOL", "BTC"],
  "24h": ["ETH", "DOGE", "ADA"],
  all: [],
};

/**
A stable made-up line for a coin over a range, ending at the coin's real price: the same symbol and range always draw the same line, so the docs never shuffle between visits.
*/
/**
The all-time line: a random walk pinned to the coin's first Kraken price at its listing and to today's price, so the "Since" date and the gain match the live card.
*/
function allTimePoints(
  coin: (typeof FAKE_COINS)[number],
  random: () => number,
  now: number
) {
  const { count, swing } = SHAPE.all;
  const every = (now - coin.listed) / (count - 1);
  let walk = 0;
  const walks = Array.from({ length: count }, (_, index) => {
    if (index > 0) {
      walk += (random() - 0.5) * 2 * swing;
    }
    return walk;
  });
  const start = Math.log(coin.firstPrice);
  const rise = Math.log(coin.price) - start;
  const drift = walks.at(-1) ?? 0;
  return walks.map((value, index) => {
    const along = index / (count - 1);
    return {
      price: Math.exp(start + rise * along + value - drift * along),
      time: coin.listed + index * every,
    };
  });
}

function withChange(
  coin: (typeof FAKE_COINS)[number],
  range: CryptoRange,
  points: CryptoPoint[],
  now: number
): CryptoData {
  const first = points[0].price;
  const change = coin.price - first;
  return {
    asOf: now,
    change,
    changePercent: (change / first) * 100,
    currency: "USD",
    image: coin.image,
    marketCap: coin.marketCap,
    name: coin.name,
    points,
    price: coin.price,
    range,
    symbol: coin.symbol,
    volume24h: coin.volume24h,
  };
}

export function fakeCrypto(
  coin: (typeof FAKE_COINS)[number],
  range: CryptoRange,
  now = Date.UTC(2026, 9, 16, 10, 0)
): CryptoData {
  const random = seeded(`${coin.symbol}:${range}`);
  if (range === "all") {
    return withChange(coin, range, allTimePoints(coin, random, now), now);
  }
  const { count, every, swing } = SHAPE[range];

  let level = 1;
  const levels = Array.from({ length: count }, (_, index) => {
    if (index > 0) {
      level *= Math.exp((random() - 0.5) * 2 * swing);
    }
    return level;
  });
  const shouldFall = FALLING[range].includes(coin.symbol);
  const isEndsHigher = (levels.at(-1) ?? 1) >= levels[0];
  if (shouldFall === isEndsHigher) {
    const peak = Math.max(...levels);
    const low = Math.min(...levels);
    for (const [index, value] of levels.entries()) {
      levels[index] = peak + low - value;
    }
  }
  const tilt = (shouldFall ? -1 : 1) * swing * TILT_STEPS;
  for (const [index, value] of levels.entries()) {
    levels[index] = value * Math.exp((tilt * index) / (count - 1));
  }
  const scale = coin.price / (levels.at(-1) ?? 1);
  const points = levels.map((value, index) => ({
    price: value * scale,
    time: now - (count - 1 - index) * every,
  }));
  return withChange(coin, range, points, now);
}
