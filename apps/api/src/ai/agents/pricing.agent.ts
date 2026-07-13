import type { AgentResult, PricingAgentOutput } from "@fanpass/shared";
import { findFixtureByEventAndVenue } from "@/ai/fixtures";
import type { PricingAgentInput } from "@/types/agentInputs";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

const FALLBACK_BASE_PRICE = 150;

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Real once other active listings exist for the same event + venue (Phase 3) — the fair band comes
 * from actual comps, not a formula. Falls back to the known-fixtures flat comps table (Phase 2
 * behavior) when there's no listing history yet, e.g. right after ticket verification.
 */
export async function runPricingAgent(input: PricingAgentInput): Promise<AgentResult<PricingAgentOutput>> {
  const start = Date.now();
  const seed = sha256Hex(`${input.eventName}|${input.venue}`);
  const rand = seededRandom(`pricing:${seed}`);
  await delay(300 + Math.floor(rand() * 250));

  const comps = input.comps ?? [];
  const hasRealComps = comps.length > 0;
  const fixture = findFixtureByEventAndVenue(input.eventName, input.venue);

  let output: PricingAgentOutput;
  if (hasRealComps) {
    const fairSuggested = Math.round(median(comps));
    output = {
      fairMin: Math.round(Math.min(...comps) * 0.95),
      fairMax: Math.round(Math.max(...comps) * 1.05),
      fairSuggested,
      currency: "USDC",
      compsFound: true,
    };
  } else {
    const basePrice = fixture?.basePrice ?? FALLBACK_BASE_PRICE;
    output = {
      fairMin: Math.round(basePrice * 0.85),
      fairMax: Math.round(basePrice * 1.2),
      fairSuggested: basePrice,
      currency: "USDC",
      compsFound: fixture !== null,
    };
  }

  return {
    agent: "pricing",
    confidence: hasRealComps ? 0.9 : fixture ? 0.85 : 0.5,
    output,
    flags: output.compsFound ? [] : ["no_comps_found"],
    latencyMs: Date.now() - start,
  };
}
