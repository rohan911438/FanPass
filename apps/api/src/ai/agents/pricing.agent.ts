import type { AgentResult, PricingAgentOutput } from "@fanpass/shared";
import { findFixtureByEventAndVenue } from "@/ai/fixtures";
import type { PricingAgentInput } from "@/types/agentInputs";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

const FALLBACK_BASE_PRICE = 150;

/**
 * Placeholder per docs/PHASE_2.md — flat comps formula off the known-fixtures table, no listing
 * history to learn from yet. Gets real once Phase 3 listings exist (comps from actual sale prices).
 */
export async function runPricingAgent(input: PricingAgentInput): Promise<AgentResult<PricingAgentOutput>> {
  const start = Date.now();
  const seed = sha256Hex(`${input.eventName}|${input.venue}`);
  const rand = seededRandom(`pricing:${seed}`);
  await delay(300 + Math.floor(rand() * 250));

  const fixture = findFixtureByEventAndVenue(input.eventName, input.venue);
  const basePrice = fixture?.basePrice ?? FALLBACK_BASE_PRICE;

  const output: PricingAgentOutput = {
    fairMin: Math.round(basePrice * 0.85),
    fairMax: Math.round(basePrice * 1.2),
    fairSuggested: basePrice,
    currency: "USDC",
    compsFound: fixture !== undefined,
  };

  return {
    agent: "pricing",
    confidence: fixture ? 0.85 : 0.5,
    output,
    flags: fixture ? [] : ["no_comps_found"],
    latencyMs: Date.now() - start,
  };
}
