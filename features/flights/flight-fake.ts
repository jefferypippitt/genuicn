import type { BoardingPassData } from "@/features/flights/flight-schema";

type Leg = readonly [code: string, city: string, airport: string];

const AIRPORTS = {
  AKL: ["AKL", "Auckland", "Auckland Airport"],
  AMS: ["AMS", "Amsterdam", "Amsterdam Airport Schiphol"],
  ARN: ["ARN", "Stockholm", "Stockholm Arlanda Airport"],
  AUH: ["AUH", "Abu Dhabi", "Zayed International Airport"],
  CDG: ["CDG", "Paris", "Paris Charles de Gaulle Airport"],
  DOH: ["DOH", "Doha", "Hamad International Airport"],
  DXB: ["DXB", "Dubai", "Dubai International Airport"],
  EWR: ["EWR", "Newark", "Newark Liberty International Airport"],
  FLL: [
    "FLL",
    "Fort Lauderdale",
    "Fort Lauderdale-Hollywood International Airport",
  ],
  FRA: ["FRA", "Frankfurt", "Frankfurt Airport"],
  HEL: ["HEL", "Helsinki", "Helsinki Airport"],
  HKG: ["HKG", "Hong Kong", "Hong Kong International Airport"],
  HND: ["HND", "Tokyo", "Tokyo Haneda Airport"],
  IST: ["IST", "Istanbul", "Istanbul Airport"],
  JFK: ["JFK", "New York", "John F Kennedy International Airport"],
  LAX: ["LAX", "Los Angeles", "Los Angeles International Airport"],
  LHR: ["LHR", "London", "London Heathrow Airport"],
  NRT: ["NRT", "Tokyo", "Narita International Airport"],
  SFO: ["SFO", "San Francisco", "San Francisco International Airport"],
  SIN: ["SIN", "Singapore", "Singapore Changi Airport"],
  SYD: ["SYD", "Sydney", "Sydney Kingsford Smith Airport"],
  YYZ: ["YYZ", "Toronto", "Toronto Pearson International Airport"],
} as const satisfies Record<string, Leg>;

type Airport = keyof typeof AIRPORTS;

const placeOf = (code: Airport) => {
  const [iata, city, airport] = AIRPORTS[code];
  return { airport, city, code: iata };
};

/**
One demo pass per airline the brand ticket knows, each on a real route that airline flies. The booking details (gate, seat, times) are made up.
*/
const DEMO_PASSES = [
  ["British Airways", "BA", "BA 117", "LHR", "JFK", "8A", "Business", "A7"],
  ["United Airlines", "UA", "UA 837", "SFO", "NRT", "31C", "Economy", "G92"],
  ["American Airlines", "AA", "AA 100", "JFK", "LHR", "9J", "Business", "B32"],
  ["Delta Air Lines", "DL", "DL 1", "JFK", "LHR", "4D", "Business", "B24"],
  ["Emirates", "EK", "EK 1", "DXB", "LHR", "2A", "First", "B12"],
  ["Qatar Airways", "QR", "QR 1", "DOH", "LHR", "3K", "Business", "C4"],
  ["Etihad Airways", "EY", "EY 11", "AUH", "LHR", "24A", "Economy", "D21"],
  ["Lufthansa", "LH", "LH 400", "FRA", "JFK", "6C", "Business", "Z25"],
  ["Air France", "AF", "AF 6", "CDG", "JFK", "33L", "Economy", "K45"],
  ["KLM", "KL", "KL 641", "AMS", "JFK", "2A", "Business", "E19"],
  ["Singapore Airlines", "SQ", "SQ 25", "SIN", "FRA", "11F", "Business", "A15"],
  ["Cathay Pacific", "CX", "CX 251", "HKG", "LHR", "40K", "Economy", "23"],
  ["Qantas", "QF", "QF 1", "SYD", "LHR", "1A", "First", "8"],
  ["Turkish Airlines", "TK", "TK 1", "IST", "JFK", "3F", "Business", "D5"],
  ["All Nippon Airways", "NH", "NH 211", "HND", "LHR", "7A", "Business", "110"],
  ["Japan Airlines", "JL", "JL 43", "HND", "LHR", "21H", "Premium", "112"],
  ["Air Canada", "AC", "AC 848", "YYZ", "LHR", "26A", "Economy", "E73"],
  ["Virgin Atlantic", "VS", "VS 3", "LHR", "JFK", "A2", "Upper Class", "15"],
  ["SAS", "SK", "SK 903", "ARN", "EWR", "18D", "Economy", "F62"],
  ["Finnair", "AY", "AY 5", "HEL", "JFK", "4A", "Business", "52"],
  ["JetBlue", "B6", "B6 1", "JFK", "FLL", "12A", "Economy", "B27"],
  ["Air New Zealand", "NZ", "NZ 1", "AKL", "LAX", "9A", "Business", "6"],
] as const satisfies readonly (readonly [
  string,
  string,
  string,
  Airport,
  Airport,
  string,
  string,
  string,
])[];

const BOARDING_TIMES = ["07:40", "09:15", "10:05", "13:30", "18:45", "21:10"];
const DEPARTURE_TIMES = ["08:20", "09:55", "10:45", "14:10", "19:25", "21:50"];
const GROUPS_BY_CABIN: Record<string, string> = {
  Business: "2",
  Economy: "5",
  First: "1",
  Premium: "3",
  "Upper Class": "1",
};

/**
The demo passes for the docs gallery, all for Jon Doe on November 3, 2026.
*/
export const FAKE_PASSES: readonly BoardingPassData[] = DEMO_PASSES.map(
  ([airline, airlineCode, flight, from, to, seat, cabin, gate], index) => ({
    airline,
    airlineCode,
    boardingTime: BOARDING_TIMES[index % BOARDING_TIMES.length],
    cabin,
    date: "2026-11-03",
    demo: true,
    departureTime: DEPARTURE_TIMES[index % DEPARTURE_TIMES.length],
    flight,
    from: placeOf(from),
    gate,
    group: GROUPS_BY_CABIN[cabin] ?? "4",
    passenger: "Jon Doe",
    seat,
    terminal: String((index % 5) + 1),
    to: placeOf(to),
  })
);
