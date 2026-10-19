import { DefaultChatTransport } from "ai";
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
import { primeQuote } from "@/features/quote/quote-requests";
import { QUOTE_RANGES } from "@/features/quote/quote-schema";
import { primeScoreboard } from "@/features/scoreboard/scoreboard-requests";
import { primeStandings } from "@/features/standings/standings-requests";
import { parseConference } from "@/features/standings/standings-schema";
import { primeWinProbability } from "@/features/win-probability/win-probability-requests";
import { primeWeather } from "@/features/weather/weather-requests";
import { WEATHER_UNITS } from "@/features/weather/weather-schema";
import type { AreaChartData } from "@/features/area-chart/area-chart-schema";
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

export function primeCardData({ responsesByUrl }: ChatRecording) {
  if (!responsesByUrl) {
    return;
  }
  const savedResponses = Object.entries(responsesByUrl);
  for (const [requestUrl, data] of savedResponses) {
    const { pathname, searchParams } = new URL(requestUrl, URL_BASE);
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
    const topic = searchParams.get("topic") ?? searchParams.get("place");
    const areaRange = AREA_CHART_RANGES.find(
      (value) => value === searchParams.get("range")
    );
    if (pathname === "/api/quote" && ticker && range) {
      primeQuote(ticker, range, data as QuoteData);
    } else if (pathname === "/api/area-chart" && topic && areaRange) {
      primeAreaChart(
        topic,
        areaRange,
        data as AreaChartData,
        compareSubjects(searchParams.getAll("compare"))
      );
    } else if (pathname === "/api/weather" && location) {
      primeWeather(location, units, data as WeatherData);
    } else if (pathname === "/api/flights" && flight) {
      primeBoardingPass(flight, date, data as BoardingPassData);
    } else if (pathname === "/api/crypto" && symbol) {
      primeCrypto(symbol, cryptoRange, data as CryptoData);
    } else {
      primeNbaData(pathname, searchParams, data);
    }
  }
}
