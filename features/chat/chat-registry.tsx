"use client";

import { defineRegistry } from "@json-render/react";
import { catalog } from "@/features/chat/chat-catalog";
import { CardGroup } from "@/features/chat/components/card-group";
import { LiveQuoteCard } from "@/features/quote/components/live-quote-card";
import { LiveWeatherCard } from "@/features/weather/components/live-weather-card";

export const { registry } = defineRegistry(catalog, {
  components: {
    CardGroup: ({ children }) => <CardGroup>{children}</CardGroup>,
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
