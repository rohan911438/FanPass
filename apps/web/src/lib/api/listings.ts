import type {
  CreateListingInput,
  ListingFilters,
  ListingSummary,
  MarketplaceListing,
  Transaction,
} from "@fanpass/shared";
import { apiGet, apiPostJson } from "@/lib/api/client";

function toQueryString(filters: ListingFilters): string {
  const params = new URLSearchParams();
  if (filters.minPrice !== undefined) params.set("minPrice", String(filters.minPrice));
  if (filters.maxPrice !== undefined) params.set("maxPrice", String(filters.maxPrice));
  if (filters.minTrustScore !== undefined) params.set("minTrustScore", String(filters.minTrustScore));
  if (filters.query) params.set("query", filters.query);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function getListings(filters: ListingFilters = {}): Promise<ListingSummary[]> {
  return apiGet<ListingSummary[]>(`/marketplace${toQueryString(filters)}`);
}

export async function getListingDetail(listingId: string): Promise<ListingSummary> {
  return apiGet<ListingSummary>(`/marketplace/${listingId}`);
}

export async function createListing(input: CreateListingInput): Promise<MarketplaceListing> {
  return apiPostJson<MarketplaceListing>("/marketplace", input);
}

export async function buyListing(
  listingId: string,
  buyerAddress: string
): Promise<{ listing: MarketplaceListing; transaction: Transaction }> {
  return apiPostJson(`/marketplace/${listingId}/buy`, { buyerAddress });
}

export async function cancelListing(listingId: string, sellerAddress: string): Promise<MarketplaceListing> {
  return apiPostJson<MarketplaceListing>(`/marketplace/${listingId}/cancel`, { sellerAddress });
}
