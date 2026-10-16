"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveCryptoCard } from "@/features/crypto/components/live-crypto-card";
import { LiveBoardingPassCard } from "@/features/flights/components/live-boarding-pass-card";
import { LiveQuoteCard } from "@/features/quote/components/live-quote-card";
import { LiveWeatherCard } from "@/features/weather/components/live-weather-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    BoardingPass: ({ props, loading }) => (
      <LiveBoardingPassCard
        flight={props.flight || undefined}
        date={props.date}
        variant={props.variant ?? "map"}
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
    QuoteCard: ({ props, loading }) => (
      <LiveQuoteCard
        ticker={props.ticker || undefined}
        range={props.range ?? "1d"}
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
  },
});
