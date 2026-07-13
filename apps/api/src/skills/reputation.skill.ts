import type { SellerReputationAgentOutput } from "@fanpass/shared";
import { runSellerReputationAgent } from "@/ai/agents/sellerReputation.agent";
import { getUser } from "@/repositories/userRepository";
import type { Skill } from "./types";

const EMPTY_STATS = { ticketsBought: 0, ticketsSold: 0, disputesRaised: 0, disputesLost: 0 };

/**
 * Read-only reputation lookup for Planner-driven contexts (premium reports) — never increments stats.
 * The purchase-completion increment stays exactly where it already lives: trustEngine/marketplace.ts's
 * recomputeSellerReputation, called once per completed sale.
 */
export const reputationSkill: Skill<SellerReputationAgentOutput> = {
  name: "sellerReputation",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "premium",
  requiredTools: [],
  dependsOn: [],
  async execute(materials) {
    if (!materials.sellerAddress) throw new Error("reputation skill requires materials.sellerAddress");
    const user = await getUser(materials.sellerAddress);
    return runSellerReputationAgent({ walletAddress: materials.sellerAddress, stats: user?.stats ?? EMPTY_STATS });
  },
};
