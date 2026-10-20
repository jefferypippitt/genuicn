import { DefaultChatTransport } from "ai";
import { primeCandlestick } from "@/features/candlestick/candlestick-requests";
import { isCandlestickRange } from "@/features/candlestick/candlestick-schema";
import { primeCrypto } from "@/features/crypto/crypto-requests";
import { CRYPTO_RANGES } from "@/features/crypto/crypto-schema";
import { primeBoardingPass } from "@/features/flights/flight-requests";
import { primeCupGroup } from "@/features/nba-cup/nba-cup-requests";
import { parseCupGroup } from "@/features/nba-cup/nba-cup-schema";
import { primePlayer } from "@/features/player/player-requests";
import { primeAreaChart } from "@/features/area-chart/area-chart-requests";
import {
  AREA_CHART_RANGES,
  compareSubjects,
} from "@/features/area-chart/area-chart-schema";
import { primeBarChart } from "@/features/bar-chart/bar-chart-requests";
import { barLimit } from "@/features/bar-chart/bar-chart-schema";
import { primePieChart } from "@/features/pie-chart/pie-chart-requests";
import { primeRadarChart } from "@/features/radar-chart/radar-chart-requests";
import { primeRadialChart } from "@/features/radial-chart/radial-chart-requests";
import { primeQuote } from "@/features/quote/quote-requests";
import { QUOTE_RANGES } from "@/features/quote/quote-schema";
import { primeScoreboard } from "@/features/scoreboard/scoreboard-requests";
import { primeStandings } from "@/features/standings/standings-requests";
import { parseConference } from "@/features/standings/standings-schema";
import { primeWinProbability } from "@/features/win-probability/win-probability-requests";
import { primeWeather } from "@/features/weather/weather-requests";
import { WEATHER_UNITS } from "@/features/weather/weather-schema";
import type { AreaChartData } from "@/features/area-chart/area-chart-schema";
import type { BarChartData } from "@/features/bar-chart/bar-chart-schema";
import type { PieChartData } from "@/features/pie-chart/pie-chart-schema";
import type { RadarChartData } from "@/features/radar-chart/radar-chart-schema";
import type { RadialChartData } from "@/features/radial-chart/radial-chart-schema";
import type { CandlestickData } from "@/features/candlestick/candlestick-schema";
import type { CryptoData } from "@/features/crypto/crypto-schema";
import type { BoardingPassData } from "@/features/flights/flight-schema";
import type { CupGroupData } from "@/features/nba-cup/nba-cup-schema";
import type { PlayerData } from "@/features/player/player-schema";
import type { QuoteData } from "@/features/quote/quote-schema";
import type { ScoreboardData } from "@/features/scoreboard/scoreboard-schema";
import type { StandingsData } from "@/features/standings/standings-schema";
import type { ChatTransport, UIMessage, UIMessageChunk } from "ai";
import type { WinProbabilityData } from "@/features/win-probability/win-probability-schema";
import type { WeatherData } from "@/features/weather/weather-schema";

export interface RecordedTurn {
  prompt: string;
  chunks: { wait: number; chunk: UIMessageChunk }[];
}

export interface ChatRecording {
  version: 1;
  turns: RecordedTurn[];
  responsesByUrl?: Record<string, unknown>;
}

const MAX_WAIT_MS = 1500;

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

export class ReplayTransport implements ChatTransport<UIMessage> {
  mode: "replay" | "live" = "replay";
  recording: ChatRecording | null = null;
  private readonly live = new DefaultChatTransport<UIMessage>();

  sendMessages: ChatTransport<UIMessage>["sendMessages"] = async (options) => {
    if (this.mode === "live") {
      return this.live.sendMessages(options);
    }
    const index =
      options.messages.filter((message) => message.role === "user").length - 1;
    const turn = this.recording?.turns[index];
    if (!turn) {
      throw new Error("The recording has no reply for this message.");
    }
    const signal = options.abortSignal;
    return new ReadableStream<UIMessageChunk>({
      async start(controller) {
        for (const { wait, chunk } of turn.chunks) {
          // eslint-disable-next-line no-await-in-loop -- chunks play in order
          await sleep(Math.min(wait, MAX_WAIT_MS), signal);
          if (signal?.aborted) {
            break;
          }
          controller.enqueue(chunk);
        }
        controller.close();
      },
    });
  };

  reconnectToStream = () => Promise.resolve(null);
}

const URL_BASE = "http://localhost";

function primeNbaData(
  pathname: string,
  parameters: URLSearchParams,
  data: unknown
) {
  const team = parameters.get("team");
  const player = parameters.get("player");
  const cupGroup = parseCupGroup(parameters.get("group") ?? "");
  const conference = parseConference(parameters.get("conference") ?? "");
  if (pathname === "/api/scoreboard" && team) {
    primeScoreboard(
      { date: parameters.get("date"), team },
      data as ScoreboardData
    );
  } else if (pathname === "/api/nba-cup" && cupGroup) {
    primeCupGroup(cupGroup, data as CupGroupData);
  } else if (pathname === "/api/standings" && conference) {
    primeStandings(conference, data as StandingsData);
  } else if (pathname === "/api/player" && player) {
    primePlayer(player, data as PlayerData);
  } else if (pathname === "/api/win-probability" && team) {
    primeWinProbability(
      { date: parameters.get("date"), team },
      data as WinProbabilityData
    );
  }
}

/**
Seeds a chart card (area, bar, pie, radar, radial) from a saved response. False when the URL isn't one of theirs.
*/
function didPrimeChart(
  pathname: string,
  parameters: URLSearchParams,
  data: unknown
): boolean {
  const topic = parameters.get("topic") ?? parameters.get("place");
  if (!topic) {
    return false;
  }
  const limit = Number(parameters.get("limit"));
  const areaRange = AREA_CHART_RANGES.find(
    (value) => value === parameters.get("range")
  );
  switch (pathname) {
    case "/api/area-chart": {
      if (!areaRange) {
        return false;
      }
      primeAreaChart(
        topic,
        areaRange,
        data as AreaChartData,
        compareSubjects(parameters.getAll("compare"))
      );
      return true;
    }
    case "/api/bar-chart": {
      primeBarChart(topic, barLimit(limit), data as BarChartData);
      return true;
    }
    case "/api/pie-chart": {
      primePieChart(topic, data as PieChartData);
      return true;
    }
    case "/api/radar-chart": {
      primeRadarChart(topic, data as RadarChartData);
      return true;
    }
    case "/api/radial-chart": {
      primeRadialChart(topic, data as RadialChartData);
      return true;
    }
    default: {
      return false;
    }
  }
}

export function primeCardData({ responsesByUrl }: ChatRecording) {
  if (!responsesByUrl) {
    return;
  }
  const savedResponses = Object.entries(responsesByUrl);
  for (const [requestUrl, data] of savedResponses) {
    const { pathname, searchParams } = new URL(requestUrl, URL_BASE);
    if (didPrimeChart(pathname, searchParams, data)) {
      continue;
    }
    const ticker = searchParams.get("ticker");
    const range = QUOTE_RANGES.find(
      (value) => value === searchParams.get("range")
    );
    const location = searchParams.get("location");
    const flight = searchParams.get("flight");
    const date = searchParams.get("date");
    const symbol = searchParams.get("symbol");
    const cryptoRange =
      CRYPTO_RANGES.find((value) => value === searchParams.get("range")) ??
      "24h";
    const units = WEATHER_UNITS.find(
      (value) => value === searchParams.get("units")
    );
    if (pathname === "/api/quote" && ticker && range) {
      primeQuote(ticker, range, data as QuoteData);
    } else if (pathname === "/api/weather" && location) {
      primeWeather(location, units, data as WeatherData);
    } else if (pathname === "/api/flights" && flight) {
      primeBoardingPass(flight, date, data as BoardingPassData);
    } else if (pathname === "/api/candlestick" && ticker) {
      const candleRange = searchParams.get("range");
      primeCandlestick(
        ticker,
        isCandlestickRange(candleRange) ? candleRange : "1m",
        data as CandlestickData
      );
    } else if (pathname === "/api/crypto" && symbol) {
      primeCrypto(symbol, cryptoRange, data as CryptoData);
    } else {
      primeNbaData(pathname, searchParams, data);
    }
  }
}
