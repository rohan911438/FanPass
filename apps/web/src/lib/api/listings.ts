import type { ListingFilters, ListingSummary, PricingAgentOutput } from "@fanpass/shared";
import { apiGet, apiPostJson } from "@/lib/api/client";

function toQueryString(filters: Record<string, string | number | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined) params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

function listingFiltersToQueryString(filters: ListingFilters): string {
  return toQueryString({
    minPrice: filters.minPrice,
    maxPrice: filters.maxPrice,
    minTrustScore: filters.minTrustScore,
    query: filters.query,
    sortBy: filters.sortBy,
  });
}

export async function getListings(filters: ListingFilters = {}): Promise<ListingSummary[]> {
  return apiGet<ListingSummary[]>(`/marketplace${listingFiltersToQueryString(filters)}`);
}

export async function getListingDetail(listingId: string): Promise<ListingSummary> {
  return apiGet<ListingSummary>(`/marketplace/${listingId}`);
}

export async function getPricingSuggestion(eventName: string, venue: string): Promise<PricingAgentOutput> {
  return apiGet<PricingAgentOutput>(`/marketplace/pricing-suggestion${toQueryString({ eventName, venue })}`);
}

/** Mirrors a confirmed list/buy/cancel transaction (signed by the connected wallet) into the local store. */
export async function syncListingTx(txHash: string, listingId: string): Promise<{ processedEvents: string[] }> {
  return apiPostJson<{ processedEvents: string[] }>("/marketplace/sync", { txHash, listingId });
}
