import { initBotId } from "botid/client/core";

// Keep in sync with the matcher in proxy.ts.
initBotId({
  protect: [
    { method: "POST", path: "/api/chat" },
    { method: "GET", path: "/api/area-chart" },
    { method: "GET", path: "/api/bar-chart" },
    { method: "GET", path: "/api/pie-chart" },
    { method: "GET", path: "/api/radar-chart" },
    { method: "GET", path: "/api/radial-chart" },
  ],
});
