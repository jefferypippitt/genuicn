import { defineCatalog } from "@json-render/core";
import { schema } from "@json-render/react/schema";
import { candlestickCatalogEntry } from "@/features/candlestick/candlestick-catalog";
import { cardGroupCatalogEntry } from "@/features/chat/components/card-group";
import { cryptoCatalogEntry } from "@/features/crypto/crypto-catalog";
import { forecastCatalogEntry } from "@/features/forecast/forecast-catalog";
import { boardingPassCatalogEntry } from "@/features/flights/flight-catalog";
import { nbaCupCatalogEntry } from "@/features/nba-cup/nba-cup-catalog";
import { playerCatalogEntry } from "@/features/player/player-catalog";
import { quoteCatalogEntry } from "@/features/quote/quote-catalog";
import { scoreboardCatalogEntry } from "@/features/scoreboard/scoreboard-catalog";
import { areaChartCatalogEntry } from "@/features/area-chart/area-chart-catalog";
import { barChartCatalogEntry } from "@/features/bar-chart/bar-chart-catalog";
import { pieChartCatalogEntry } from "@/features/pie-chart/pie-chart-catalog";
import { radarChartCatalogEntry } from "@/features/radar-chart/radar-chart-catalog";
import { radialChartCatalogEntry } from "@/features/radial-chart/radial-chart-catalog";
import { standingsCatalogEntry } from "@/features/standings/standings-catalog";
import { winProbabilityCatalogEntry } from "@/features/win-probability/win-probability-catalog";
import { weatherCatalogEntry } from "@/features/weather/weather-catalog";

export const catalog = defineCatalog(schema, {
  actions: {},
  components: {
    AreaChartCard: areaChartCatalogEntry,
    BarChartCard: barChartCatalogEntry,
    BoardingPass: boardingPassCatalogEntry,
    CandlestickCard: candlestickCatalogEntry,
    CardGroup: cardGroupCatalogEntry,
    CryptoCard: cryptoCatalogEntry,
    ForecastCard: forecastCatalogEntry,
    NbaCupCard: nbaCupCatalogEntry,
    PieChartCard: pieChartCatalogEntry,
    PlayerCard: playerCatalogEntry,
    QuoteCard: quoteCatalogEntry,
    RadarChartCard: radarChartCatalogEntry,
    RadialChartCard: radialChartCatalogEntry,
    ScoreboardCard: scoreboardCatalogEntry,
    StandingsCard: standingsCatalogEntry,
    WeatherCard: weatherCatalogEntry,
    WinProbabilityCard: winProbabilityCatalogEntry,
  },
});
