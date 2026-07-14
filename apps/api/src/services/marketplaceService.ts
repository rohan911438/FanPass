import type { ListingFilters, ListingSummary, MarketplaceListing, PricingAgentOutput } from "@fanpass/shared";
import { runMarketplaceAgent, type MarketplaceListingCandidate } from "@/ai/agents/marketplace.agent";
import { runPricingAgent } from "@/ai/agents/pricing.agent";
import { ApiError } from "@/middleware/errorHandler";
import { findActiveListingPricesForEvent, getListingById, listActiveListings } from "@/repositories/listingRepository";
import { getOwnershipCertificateByTicketId } from "@/repositories/ownershipCertificateRepository";
import { getTrustScore } from "@/repositories/trustScoreRepository";
import { getUser } from "@/repositories/userRepository";
import { syncFromChainTx } from "@/trustEngine/marketplace";

async function toListingSummary(listing: MarketplaceListing): Promise<ListingSummary> {
  const [trustScore, cert, seller] = await Promise.all([
    getTrustScore("ticket", listing.ticketId),
    getOwnershipCertificateByTicketId(listing.ticketId),
    getUser(listing.sellerAddress),
  ]);

  let sellerReputation: ListingSummary["sellerReputation"] = null;
  if (seller) {
    const sellerTrust = await getTrustScore("user", seller.walletAddress);
    sellerReputation = { tier: seller.reputationTier, score: sellerTrust?.score ?? 0 };
  }

  return {
    listing,
    trustScore,
    sellerReputation,
    transferCount: cert ? Math.max(0, cert.history.length - 1) : 0,
    aiSuggestedDeal: false,
  };
}

function toCandidate(summary: ListingSummary): MarketplaceListingCandidate {
  return {
    listingId: summary.listing.listingId,
    askPrice: summary.listing.askPrice,
    fairPrice: summary.listing.aiSuggestedPrice.fair,
    trustScore: summary.trustScore?.score ?? 0,
    sellerReputationScore: summary.sellerReputation?.score ?? 0,
    createdAt: summary.listing.createdAt,
  };
}

function passesFilters(summary: ListingSummary, filters: ListingFilters): boolean {
  if (filters.minPrice !== undefined && summary.listing.askPrice < filters.minPrice) return false;
  if (filters.maxPrice !== undefined && summary.listing.askPrice > filters.maxPrice) return false;
  if (filters.minTrustScore !== undefined && (summary.trustScore?.score ?? 0) < filters.minTrustScore) return false;
  if (filters.query) {
    const haystack = `${summary.listing.eventName} ${summary.listing.venue} ${summary.listing.seatInfo ?? ""}`.toLowerCase();
    if (!haystack.includes(filters.query.toLowerCase())) return false;
  }
  return true;
}

function applySort(summaries: ListingSummary[], sortBy: ListingFilters["sortBy"]): ListingSummary[] {
  if (!sortBy || sortBy === "recommended") return summaries;
  return [...summaries].sort((a, b) => {
    switch (sortBy) {
      case "price_asc":
        return a.listing.askPrice - b.listing.askPrice;
      case "price_desc":
        return b.listing.askPrice - a.listing.askPrice;
      case "trust_desc":
        return (b.trustScore?.score ?? 0) - (a.trustScore?.score ?? 0);
      case "recent":
        return b.listing.createdAt.localeCompare(a.listing.createdAt);
      default:
        return 0;
    }
  });
}

/** Real Marketplace Agent ranking + AI Suggested Deals over the live, filtered listing feed. */
export async function getListings(filters: ListingFilters): Promise<ListingSummary[]> {
  const activeListings = await listActiveListings();
  const allSummaries = await Promise.all(activeListings.map(toListingSummary));
  const filtered = allSummaries.filter((summary) => passesFilters(summary, filters));

  const ranking = await runMarketplaceAgent(filtered.map(toCandidate));
  const suggestedSet = new Set(ranking.output.suggestedDealListingIds);
  const summaryById = new Map(filtered.map((s) => [s.listing.listingId, s]));

  const ranked = ranking.output.rankedListingIds
    .map((id) => summaryById.get(id))
    .filter((s): s is ListingSummary => Boolean(s))
    .map((s) => ({ ...s, aiSuggestedDeal: suggestedSet.has(s.listing.listingId) }));

  return applySort(ranked, filters.sortBy);
}

export async function getListingDetail(listingId: string): Promise<ListingSummary> {
  const listing = await getListingById(listingId);
  if (!listing) throw new ApiError(404, `Listing not found: ${listingId}`);

  const summary = await toListingSummary(listing);
  const ranking = await runMarketplaceAgent([toCandidate(summary)]);
  return { ...summary, aiSuggestedDeal: ranking.output.suggestedDealListingIds.includes(listingId) };
}

/** Advisory-only: a fair-price preview shown while the seller composes their on-chain listing tx. */
export async function getPricingSuggestion(eventName: string, venue: string): Promise<PricingAgentOutput> {
  const comps = await findActiveListingPricesForEvent(eventName, venue);
  const pricing = await runPricingAgent({ eventName, venue, comps });
  return pricing.output;
}

/** Mirrors a confirmed list/buy/cancel transaction (signed by the connected wallet) into the local store. */
export function syncFromChain(txHash: `0x${string}`, listingId: string): Promise<{ processedEvents: string[] }> {
  return syncFromChainTx(txHash, listingId);
}
