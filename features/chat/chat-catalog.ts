import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { cryptoCatalogEntry } from "@/features/crypto/crypto-catalog";
import { boardingPassCatalogEntry } from "@/features/flights/flight-catalog";
import { nbaCupCatalogEntry } from "@/features/nba-cup/nba-cup-catalog";
import { playerCatalogEntry } from "@/features/player/player-catalog";
import { quoteCatalogEntry } from "@/features/quote/quote-catalog";
import { scoreboardCatalogEntry } from "@/features/scoreboard/scoreboard-catalog";
import { areaChartCatalogEntry } from "@/features/area-chart/area-chart-catalog";
import { standingsCatalogEntry } from "@/features/standings/standings-catalog";
import { winProbabilityCatalogEntry } from "@/features/win-probability/win-probability-catalog";
import { weatherCatalogEntry } from "@/features/weather/weather-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    AreaChartCard: areaChartCatalogEntry,
    BoardingPass: boardingPassCatalogEntry,
    CardGroup: cardGroupCatalogEntry,
    CryptoCard: cryptoCatalogEntry,
    NbaCupCard: nbaCupCatalogEntry,
    PlayerCard: playerCatalogEntry,
    QuoteCard: quoteCatalogEntry,
    ScoreboardCard: scoreboardCatalogEntry,
    StandingsCard: standingsCatalogEntry,
    WeatherCard: weatherCatalogEntry,
    WinProbabilityCard: winProbabilityCatalogEntry,
  },
});
