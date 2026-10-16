/**
An airline's color for the brand ticket: the background, and whether light or dark text reads on it.
*/
export interface AirlineBrand {
  /**
  The brand color as hex, e.g. "#075AAA".
  */
  color: string;
  text: "light" | "dark";
}

/**
Brand colors by IATA code, picked from each airline's logo and livery. Add an airline here to give its tickets a brand variant. Codes not listed fall back to the world map ticket.
*/
export const AIRLINE_BRANDS: Readonly<Record<string, AirlineBrand>> = {
  AA: { color: "#0078D2", text: "light" },
  AC: { color: "#D22630", text: "light" },
  AF: { color: "#002157", text: "light" },
  AY: { color: "#0B1560", text: "light" },
  B6: { color: "#003876", text: "light" },
  BA: { color: "#075AAA", text: "light" },
  CX: { color: "#006564", text: "light" },
  DL: { color: "#003A70", text: "light" },
  EK: { color: "#D71921", text: "light" },
  EY: { color: "#BD8B13", text: "dark" },
  JL: { color: "#CC0000", text: "light" },
  KL: { color: "#00A1DE", text: "light" },
  LH: { color: "#05164D", text: "light" },
  NH: { color: "#13448F", text: "light" },
  NZ: { color: "#141414", text: "light" },
  QF: { color: "#E40000", text: "light" },
  QR: { color: "#5C0632", text: "light" },
  SK: { color: "#000F9F", text: "light" },
  SQ: { color: "#1D2E5C", text: "light" },
  TK: { color: "#C70A0C", text: "light" },
  UA: { color: "#002244", text: "light" },
  VS: { color: "#DA0530", text: "light" },
};

export function brandOf(airlineCode: string): AirlineBrand | null {
  return AIRLINE_BRANDS[airlineCode.toUpperCase()] ?? null;
}
