import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { cryptoCatalogEntry } from "@/features/crypto/crypto-catalog";
import { boardingPassCatalogEntry } from "@/features/flights/flight-catalog";
import { quoteCatalogEntry } from "@/features/quote/quote-catalog";
import { weatherCatalogEntry } from "@/features/weather/weather-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    BoardingPass: boardingPassCatalogEntry,
    CardGroup: cardGroupCatalogEntry,
    CryptoCard: cryptoCatalogEntry,
    QuoteCard: quoteCatalogEntry,
    WeatherCard: weatherCatalogEntry,
  },
});
