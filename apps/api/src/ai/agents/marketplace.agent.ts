import type { AgentResult, MarketplaceAgentOutput } from "@fanpass/shared";

export interface MarketplaceListingCandidate {
  listingId: string;
  askPrice: number;
  fairPrice: number;
  trustScore: number; // 0-100, 0 if not yet scored
  sellerReputationScore: number; // 0-100, 0 if unknown
  createdAt: string; // ISO
}

const SUGGESTED_DEAL_TRUST_FLOOR = 70;
const MAX_SUGGESTED_DEALS = 3;

/**
 * Real ranking/filtering over the live listing feed — a pure function of trust score, price fairness,
 * and recency, no randomness. Powers both the default sort order and "AI Suggested Deals."
 */
export async function runMarketplaceAgent(
  candidates: MarketplaceListingCandidate[]
): Promise<AgentResult<MarketplaceAgentOutput>> {
  const start = Date.now();

  if (candidates.length === 0) {
    return {
      agent: "marketplace",
      confidence: 1,
      output: { rankedListingIds: [], suggestedDealListingIds: [] },
      flags: [],
      latencyMs: Date.now() - start,
    };
  }

  const now = Date.now();
  const oldestAgeMs = Math.max(...candidates.map((c) => now - new Date(c.createdAt).getTime()), 1);

  const scored = candidates.map((candidate) => {
    const trustNorm = candidate.trustScore / 100;
    const reputationNorm = candidate.sellerReputationScore / 100;
    const priceFairness =
      candidate.fairPrice > 0
        ? Math.max(0, 1 - Math.abs(candidate.askPrice - candidate.fairPrice) / candidate.fairPrice)
        : 0.5;
    const ageMs = now - new Date(candidate.createdAt).getTime();
    const recency = 1 - ageMs / oldestAgeMs;
    const composite = trustNorm * 0.45 + reputationNorm * 0.15 + priceFairness * 0.3 + recency * 0.1;
    const isGoodDeal = candidate.askPrice <= candidate.fairPrice;
    return { ...candidate, composite, isGoodDeal };
  });

  const ranked = [...scored].sort((a, b) => b.composite - a.composite);
  const suggestedDealListingIds = ranked
    .filter((c) => c.isGoodDeal && c.trustScore >= SUGGESTED_DEAL_TRUST_FLOOR)
    .slice(0, MAX_SUGGESTED_DEALS)
    .map((c) => c.listingId);

  return {
    agent: "marketplace",
    confidence: 0.9,
    output: { rankedListingIds: ranked.map((c) => c.listingId), suggestedDealListingIds },
    flags: [],
    latencyMs: Date.now() - start,
  };
}
