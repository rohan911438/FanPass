import type { AgentResult, MetadataAgentOutput } from "@fanpass/shared";
import type { MetadataAgentInput } from "@/types/agentInputs";
import { findFixture } from "@/ai/fixtures";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

/**
 * Mocked but deterministic: pure lookup against the known-fixtures comps table (@/ai/fixtures), cross-
 * checking the OCR agent's reading rather than the raw claim — so an OCR mismatch upstream can surface
 * here too. No randomness needed for the lookup itself; a seeded delay keeps the stepper feeling live.
 */
export async function runMetadataAgent(input: MetadataAgentInput): Promise<AgentResult<MetadataAgentOutput>> {
  const start = Date.now();
  const seed = sha256Hex(JSON.stringify(input));
  const rand = seededRandom(`metadata:${seed}`);
  await delay(400 + Math.floor(rand() * 350));

  const fixture = findFixture(input.ocr.extractedEventName, input.ocr.extractedVenue, input.ocr.extractedEventDate);

  const output: MetadataAgentOutput = {
    fixtureRecognized: fixture !== null,
    matchedFixtureId: fixture?.id ?? null,
    eventNameMatch: fixture !== null,
    venueMatch: fixture !== null,
    dateMatch: fixture !== null,
  };

  const flags = fixture ? [] : ["fixture_not_recognized"];
  const confidence = fixture ? 0.95 : 0.4;

  return {
    agent: "metadata",
    confidence,
    output,
    flags,
    latencyMs: Date.now() - start,
  };
}
