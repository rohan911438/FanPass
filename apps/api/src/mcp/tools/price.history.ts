import { findFixtureByEventAndVenue } from "@/ai/fixtures";
import { findActiveListingPricesForEvent } from "@/repositories/listingRepository";
import type { McpTool } from "../types";

export interface PriceHistoryInput {
  eventName: string;
  venue: string;
}

export interface PriceHistoryOutput {
  comps: number[];
  fixtureBasePrice: number | null;
}

/** Real: other active listings' ask prices for the same event + venue, falling back to the fixtures table. */
export const priceHistoryTool: McpTool<PriceHistoryInput, PriceHistoryOutput> = {
  name: "price.history",
  config: { timeoutMs: 2_000, retries: 1, cacheTtlMs: null }, // request-lifetime only — comps shouldn't go stale mid-run, but must be fresh across runs
  async run({ eventName, venue }) {
    const comps = await findActiveListingPricesForEvent(eventName, venue);
    const fixture = findFixtureByEventAndVenue(eventName, venue);
    return { comps, fixtureBasePrice: fixture?.basePrice ?? null };
  },
};
