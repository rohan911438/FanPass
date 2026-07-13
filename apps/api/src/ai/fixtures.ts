/**
 * Static "known fixtures" comps table standing in for a real fixtures/pricing database. Metadata Agent
 * cross-checks claimed event/venue/date against this; Pricing Agent derives a fair-price band from it.
 * Venues are real World Cup 2026 host stadiums; match labels are illustrative, not real pairings.
 */
export interface Fixture {
  id: string;
  eventName: string;
  venue: string;
  eventDate: string; // ISO date, date-only precision is fine for matching
  basePrice: number; // USDC
}

export const KNOWN_FIXTURES: Fixture[] = [
  {
    id: "wc26-metlife-r16-51",
    eventName: "World Cup 2026 — Round of 16, Match 51",
    venue: "MetLife Stadium, East Rutherford",
    eventDate: "2026-06-30",
    basePrice: 340,
  },
  {
    id: "wc26-attstadium-qf-63",
    eventName: "World Cup 2026 — Quarterfinal, Match 63",
    venue: "AT&T Stadium, Arlington",
    eventDate: "2026-07-10",
    basePrice: 520,
  },
  {
    id: "wc26-sofi-group-30",
    eventName: "World Cup 2026 — Group Stage, Match 30",
    venue: "SoFi Stadium, Inglewood",
    eventDate: "2026-06-19",
    basePrice: 210,
  },
  {
    id: "wc26-azteca-group-8",
    eventName: "World Cup 2026 — Group Stage, Match 8",
    venue: "Estadio Azteca, Mexico City",
    eventDate: "2026-06-13",
    basePrice: 190,
  },
  {
    id: "wc26-bcplace-r32-38",
    eventName: "World Cup 2026 — Round of 32, Match 38",
    venue: "BC Place, Vancouver",
    eventDate: "2026-06-27",
    basePrice: 260,
  },
  {
    id: "wc26-mbstadium-sf-69",
    eventName: "World Cup 2026 — Semifinal, Match 69",
    venue: "Mercedes-Benz Stadium, Atlanta",
    eventDate: "2026-07-15",
    basePrice: 780,
  },
];

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

export function findFixture(eventName: string, venue: string, eventDate: string): Fixture | null {
  const targetDate = eventDate.slice(0, 10);
  return (
    KNOWN_FIXTURES.find(
      (f) =>
        normalize(f.eventName) === normalize(eventName) &&
        normalize(f.venue) === normalize(venue) &&
        f.eventDate === targetDate
    ) ?? null
  );
}

/** Looser lookup for pricing comps, which only cares about event identity, not exact date match. */
export function findFixtureByEventAndVenue(eventName: string, venue: string): Fixture | null {
  return (
    KNOWN_FIXTURES.find((f) => normalize(f.eventName) === normalize(eventName) && normalize(f.venue) === normalize(venue)) ??
    null
  );
}
