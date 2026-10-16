/**
A city the demo flies to, with its airports and the names a traveler might type for it.
*/
export interface NetworkCity {
  city: string;
  codes: readonly string[];
  /**
  Lowercase names that find the city besides its own, e.g. "nyc".
  */
  aliases: readonly string[];
  /**
  The IANA time zone, e.g. "Europe/London", for local departure and arrival times.
  */
  zone: string;
}

/**
A flight on the demo timetable: a real flight number with its real route (adsbdb resolves it), and roughly how long it takes.
*/
export interface ScheduledFlight {
  flight: string;
  from: string;
  to: string;
  minutes: number;
}

export const CITIES: readonly NetworkCity[] = [
  {
    aliases: ["ams"],
    city: "Amsterdam",
    codes: ["AMS"],
    zone: "Europe/Amsterdam",
  },
  { aliases: ["dxb"], city: "Dubai", codes: ["DXB"], zone: "Asia/Dubai" },
  {
    aliases: ["fra", "frankfurt am main"],
    city: "Frankfurt",
    codes: ["FRA"],
    zone: "Europe/Berlin",
  },
  { aliases: ["lhr"], city: "London", codes: ["LHR"], zone: "Europe/London" },
  {
    aliases: ["la", "lax"],
    city: "Los Angeles",
    codes: ["LAX"],
    zone: "America/Los_Angeles",
  },
  {
    aliases: ["nyc", "jfk", "ewr", "newark"],
    city: "New York",
    codes: ["JFK", "EWR"],
    zone: "America/New_York",
  },
  { aliases: ["cdg"], city: "Paris", codes: ["CDG"], zone: "Europe/Paris" },
  {
    aliases: ["sf", "sfo"],
    city: "San Francisco",
    codes: ["SFO"],
    zone: "America/Los_Angeles",
  },
  {
    aliases: ["sin"],
    city: "Singapore",
    codes: ["SIN"],
    zone: "Asia/Singapore",
  },
  {
    aliases: ["arn"],
    city: "Stockholm",
    codes: ["ARN"],
    zone: "Europe/Stockholm",
  },
  { aliases: ["nrt"], city: "Tokyo", codes: ["NRT"], zone: "Asia/Tokyo" },
];

/**
Real flight numbers and the routes adsbdb gives for them. Replace this with your airline's schedule or a flight search API.
*/
export const TIMETABLE: readonly ScheduledFlight[] = [
  { flight: "AA 100", from: "JFK", minutes: 420, to: "LHR" },
  { flight: "AA 101", from: "LHR", minutes: 480, to: "JFK" },
  { flight: "AA 106", from: "JFK", minutes: 425, to: "LHR" },
  { flight: "AF 22", from: "CDG", minutes: 690, to: "LAX" },
  { flight: "AF 23", from: "LAX", minutes: 650, to: "CDG" },
  { flight: "AF 83", from: "SFO", minutes: 640, to: "CDG" },
  { flight: "AF 84", from: "CDG", minutes: 685, to: "SFO" },
  { flight: "BA 11", from: "LHR", minutes: 790, to: "SIN" },
  { flight: "BA 12", from: "SIN", minutes: 830, to: "LHR" },
  { flight: "BA 112", from: "JFK", minutes: 415, to: "LHR" },
  { flight: "BA 114", from: "JFK", minutes: 420, to: "LHR" },
  { flight: "BA 117", from: "LHR", minutes: 480, to: "JFK" },
  { flight: "BA 173", from: "LHR", minutes: 485, to: "JFK" },
  { flight: "BA 175", from: "LHR", minutes: 480, to: "JFK" },
  { flight: "BA 177", from: "LHR", minutes: 490, to: "JFK" },
  { flight: "BA 178", from: "JFK", minutes: 410, to: "LHR" },
  { flight: "BA 282", from: "LAX", minutes: 620, to: "LHR" },
  { flight: "BA 283", from: "LHR", minutes: 670, to: "LAX" },
  { flight: "EK 29", from: "DXB", minutes: 470, to: "LHR" },
  { flight: "EK 30", from: "LHR", minutes: 415, to: "DXB" },
  { flight: "KL 605", from: "AMS", minutes: 655, to: "SFO" },
  { flight: "KL 606", from: "SFO", minutes: 625, to: "AMS" },
  { flight: "KL 641", from: "AMS", minutes: 510, to: "JFK" },
  { flight: "KL 642", from: "JFK", minutes: 440, to: "AMS" },
  { flight: "LH 400", from: "FRA", minutes: 535, to: "JFK" },
  { flight: "LH 401", from: "JFK", minutes: 470, to: "FRA" },
  { flight: "LH 404", from: "FRA", minutes: 540, to: "JFK" },
  { flight: "LH 405", from: "JFK", minutes: 475, to: "FRA" },
  { flight: "NH 10", from: "NRT", minutes: 760, to: "JFK" },
  { flight: "SK 903", from: "ARN", minutes: 545, to: "EWR" },
  { flight: "SK 904", from: "EWR", minutes: 480, to: "ARN" },
  { flight: "SQ 25", from: "FRA", minutes: 735, to: "SIN" },
  { flight: "SQ 321", from: "LHR", minutes: 790, to: "SIN" },
  { flight: "SQ 322", from: "SIN", minutes: 830, to: "LHR" },
  { flight: "UA 14", from: "EWR", minutes: 415, to: "LHR" },
  { flight: "UA 15", from: "LHR", minutes: 490, to: "EWR" },
  { flight: "UA 837", from: "SFO", minutes: 660, to: "NRT" },
  { flight: "UA 838", from: "NRT", minutes: 570, to: "SFO" },
  { flight: "UA 900", from: "LHR", minutes: 675, to: "SFO" },
  { flight: "UA 901", from: "SFO", minutes: 630, to: "LHR" },
];

/**
The city a traveler typed, by name, alias or airport code, ignoring case. Null when the demo doesn't fly there.
*/
export function findCity(input: string): NetworkCity | null {
  const typed = input.trim().toLowerCase();
  return (
    CITIES.find(
      (entry) =>
        entry.city.toLowerCase() === typed ||
        entry.aliases.includes(typed) ||
        entry.codes.some((code) => code.toLowerCase() === typed)
    ) ?? null
  );
}

function cityOfCode(code: string) {
  return CITIES.find((entry) => entry.codes.includes(code));
}

/**
The flights from one city to another, any airport in each.
*/
export function flightsBetween(from: NetworkCity, to: NetworkCity) {
  return TIMETABLE.filter(
    (entry) => from.codes.includes(entry.from) && to.codes.includes(entry.to)
  );
}

/**
The cities with a flight from this one, in name order.
*/
export function destinationsFrom(from: NetworkCity): NetworkCity[] {
  const cities = new Set(
    TIMETABLE.filter((entry) => from.codes.includes(entry.from)).map(
      (entry) => cityOfCode(entry.to)?.city
    )
  );
  return CITIES.filter((entry) => cities.has(entry.city));
}

/**
The time zone of an airport the demo flies to; UTC for one it doesn't.
*/
export function zoneOf(code: string) {
  return cityOfCode(code)?.zone ?? "UTC";
}
