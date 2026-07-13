import type { AgentResult, ReputationTier, SellerReputationAgentOutput, TrustScoreBreakdown } from "@fanpass/shared";
import type { SellerReputationAgentInput } from "@/types/agentInputs";

type Stats = SellerReputationAgentInput["stats"];

function computeScore(stats: Stats): number {
  const totalDeals = stats.ticketsBought + stats.ticketsSold;
  let score = 60;
  if (totalDeals > 0) score += 15;
  score += Math.min(stats.ticketsSold, 5) * 3;
  score += Math.min(stats.ticketsBought, 5) * 2;
  score -= stats.disputesRaised * 10;
  score -= stats.disputesLost * 20;
  return Math.max(0, Math.min(100, score));
}

/** Gated on actual history, not just the score, so a zero-transaction wallet can never read as "verified". */
function tierForScore(score: number, hasHistory: boolean): ReputationTier {
  if (!hasHistory) return "new";
  if (score >= 90) return "elite";
  if (score >= 75) return "trusted";
  return "verified";
}

/**
 * Real — a deterministic function of a wallet's actual users/{address}.stats, recomputed after every
 * completed transaction. Reuses the ticket Trust Score's breakdown shape per the trustScores/{...}
 * schema (ARCHITECTURE.md §4), reinterpreted at user level:
 *  - verifiedSeller: has at least one completed deal (an established, non-anonymous track record)
 *  - noDuplicate: has never had a dispute raised against them
 *  - transferEligible: has completed at least one sale with no disputes lost
 *  - lowFraudRisk: has never lost a dispute
 *  - fairPrice / verifiedQr: not meaningful per-user yet (no pricing-fairness history tracked); true by
 *    default so a new wallet isn't penalized for a check that doesn't apply to it
 */
export async function runSellerReputationAgent(
  input: SellerReputationAgentInput
): Promise<AgentResult<SellerReputationAgentOutput>> {
  const start = Date.now();
  const { stats } = input;
  const totalDeals = stats.ticketsBought + stats.ticketsSold;
  const noDisputesLost = stats.disputesLost === 0;
  const noDisputesRaised = stats.disputesRaised === 0;

  const breakdown: TrustScoreBreakdown = {
    verifiedQr: true,
    fairPrice: true,
    verifiedSeller: totalDeals > 0,
    noDuplicate: noDisputesRaised,
    transferEligible: stats.ticketsSold > 0 && noDisputesLost,
    lowFraudRisk: noDisputesLost,
  };

  const score = computeScore(stats);
  const flags: string[] = [];
  if (!noDisputesRaised) flags.push("disputes_raised");
  if (!noDisputesLost) flags.push("disputes_lost");

  return {
    agent: "sellerReputation",
    confidence: totalDeals > 0 ? 0.9 : 0.5,
    output: { score, reputationTier: tierForScore(score, totalDeals > 0), breakdown },
    flags,
    latencyMs: Date.now() - start,
  };
}
