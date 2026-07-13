import type { PricingAgentOutput } from "@fanpass/shared";
import { runPricingAgent } from "@/ai/agents/pricing.agent";
import { callTool } from "@/mcp/server";
import type { PriceHistoryInput, PriceHistoryOutput } from "@/mcp/tools/price.history";
import type { Skill } from "./types";

export const pricingSkill: Skill<PricingAgentOutput> = {
  name: "pricing",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "verification" || context.requestType === "premium",
  requiredTools: ["price.history"],
  dependsOn: [],
  async execute(materials, context) {
    if (!materials.eventName || !materials.venue) throw new Error("pricing skill requires materials.eventName/venue");

    // Verification-time pricing intentionally skips comps (Phase 2 behavior, unchanged) — premium/marketplace
    // contexts benefit from real comps, so only fetch them there.
    let comps: number[] | undefined;
    if (context.requestType === "premium") {
      const toolResult = await callTool<PriceHistoryInput, PriceHistoryOutput>(
        "price.history",
        { eventName: materials.eventName, venue: materials.venue },
        context.ticketId
      );
      comps = toolResult.output?.comps;
    }

    return runPricingAgent({ eventName: materials.eventName, venue: materials.venue, comps });
  },
};
