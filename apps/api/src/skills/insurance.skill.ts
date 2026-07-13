import type { InsuranceAgentOutput, PricingAgentOutput, SellerReputationAgentOutput } from "@fanpass/shared";
import type { Skill } from "./types";

/** Deterministic risk pricing from the Pricing + Reputation skills' own outputs — no external vendor. */
export const insuranceSkill: Skill<InsuranceAgentOutput> = {
  name: "insurance",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "premium",
  requiredTools: [],
  dependsOn: ["pricing", "sellerReputation"],
  async execute(materials, context) {
    const start = Date.now();
    const pricing = context.priorResults.pricing?.output as PricingAgentOutput | undefined;
    const reputation = context.priorResults.sellerReputation?.output as SellerReputationAgentOutput | undefined;

    const fairPrice = pricing?.fairSuggested ?? 0;
    const reputationScore = reputation?.score ?? 50;
    const priceRisk = fairPrice > 0 ? Math.abs((materials.askPrice ?? fairPrice) - fairPrice) / fairPrice : 0;
    const riskScore = priceRisk * 0.6 + (1 - reputationScore / 100) * 0.4;

    const riskTier: InsuranceAgentOutput["riskTier"] = riskScore < 0.15 ? "low" : riskScore < 0.4 ? "medium" : "high";
    const suggestedPremiumBps = Math.round(200 + riskScore * 800); // 2%-10% of ticket price

    return {
      agent: "insurance",
      confidence: 0.8,
      output: { eligible: riskTier !== "high", riskTier, suggestedPremiumBps },
      flags: riskTier === "high" ? ["high_insurance_risk"] : [],
      latencyMs: Date.now() - start,
    };
  },
};
