"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { LiveCandlestickCard } from "@/features/candlestick/components/live-candlestick-card";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveCryptoCard } from "@/features/crypto/components/live-crypto-card";
import { LiveBoardingPassCard } from "@/features/flights/components/live-boarding-pass-card";
import LiveNbaCupCard from "@/features/nba-cup/components/live-nba-cup-card";
import LivePlayerCard from "@/features/player/components/live-player-card";
import { LiveQuoteCard } from "@/features/quote/components/live-quote-card";
import LiveScoreboardCard from "@/features/scoreboard/components/live-scoreboard-card";
import { LiveAreaChartCard } from "@/features/area-chart/components/live-area-chart-card";
import { LiveBarChartCard } from "@/features/bar-chart/components/live-bar-chart-card";
import { LivePieChartCard } from "@/features/pie-chart/components/live-pie-chart-card";
import { LiveRadarChartCard } from "@/features/radar-chart/components/live-radar-chart-card";
import { LiveRadialChartCard } from "@/features/radial-chart/components/live-radial-chart-card";
import LiveStandingsCard from "@/features/standings/components/live-standings-card";
import LiveWinProbabilityCard from "@/features/win-probability/components/live-win-probability-card";
import { LiveWeatherCard } from "@/features/weather/components/live-weather-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    AreaChartCard: ({ props, loading }) => (
      <LiveAreaChartCard
        topic={props.topic || undefined}
        range={props.range ?? undefined}
        ranges={props.ranges ?? false}
        compare={props.compare ?? undefined}
        streaming={loading}
      />
    ),
    BarChartCard: ({ props, loading }) => (
      <LiveBarChartCard
        topic={props.topic || undefined}
        limit={props.limit ?? undefined}
        streaming={loading}
      />
    ),
    BoardingPass: ({ props, loading }) => (
      <LiveBoardingPassCard
        flight={props.flight || undefined}
        date={props.date}
        variant={props.variant ?? "map"}
        streaming={loading}
      />
    ),
    CandlestickCard: ({ props, loading }) => (
      <LiveCandlestickCard
        ticker={props.ticker || undefined}
        range={props.range ?? "1m"}
        streaming={loading}
      />
    ),
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
    CryptoCard: ({ props, loading }) => (
      <LiveCryptoCard
        symbol={props.symbol || undefined}
        range={props.range ?? "24h"}
        streaming={loading}
      />
    ),
    NbaCupCard: ({ props, loading }) => (
      <LiveNbaCupCard group={props.group || undefined} streaming={loading} />
    ),
    PieChartCard: ({ props, loading }) => (
      <LivePieChartCard topic={props.topic || undefined} streaming={loading} />
    ),
    PlayerCard: ({ props, loading }) => (
      <LivePlayerCard players={props.players} streaming={loading} />
    ),
    QuoteCard: ({ props, loading }) => (
      <LiveQuoteCard
        ticker={props.ticker || undefined}
        range={props.range ?? "1d"}
        streaming={loading}
      />
    ),
    RadarChartCard: ({ props, loading }) => (
      <LiveRadarChartCard
        topic={props.topic || undefined}
        streaming={loading}
      />
    ),
    RadialChartCard: ({ props, loading }) => (
      <LiveRadialChartCard
        topic={props.topic || undefined}
        streaming={loading}
      />
    ),
    ScoreboardCard: ({ props, loading }) => (
      <LiveScoreboardCard
        team={props.team || undefined}
        date={props.date}
        streaming={loading}
      />
    ),
    StandingsCard: ({ props, loading }) => (
      <LiveStandingsCard
        conference={props.conference || undefined}
        streaming={loading}
      />
    ),
    WeatherCard: ({ props, loading }) => (
      <LiveWeatherCard
        location={props.location || undefined}
        units={props.units}
        streaming={loading}
      />
    ),
    WinProbabilityCard: ({ props, loading }) => (
      <LiveWinProbabilityCard
        team={props.team || undefined}
        date={props.date}
        streaming={loading}
      />
    ),
  },
});
