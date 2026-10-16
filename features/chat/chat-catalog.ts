import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { quoteCatalogEntry } from "@/features/quote/quote-catalog";
import { weatherCatalogEntry } from "@/features/weather/weather-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    CardGroup: cardGroupCatalogEntry,
    QuoteCard: quoteCatalogEntry,
    WeatherCard: weatherCatalogEntry,
  },
});
