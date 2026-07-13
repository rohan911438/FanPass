import type { AgentResult, MetadataAgentOutput } from "@fanpass/shared";
import { callTool } from "@/mcp/server";
import type { MetadataLookupInput, MetadataLookupOutput } from "@/mcp/tools/metadata.lookup";
import type { MetadataAgentInput } from "@/types/agentInputs";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

/**
 * Calls the metadata.lookup MCP tool (real: the known-fixtures comps table), cross-checking the OCR
 * agent's reading rather than the raw claim — so an OCR mismatch upstream can surface here too.
 */
export async function runMetadataAgent(input: MetadataAgentInput): Promise<AgentResult<MetadataAgentOutput>> {
  const start = Date.now();
  const seed = sha256Hex(JSON.stringify(input));
  const rand = seededRandom(`metadata:${seed}`);
  await delay(400 + Math.floor(rand() * 350));

  const toolResult = await callTool<MetadataLookupInput, MetadataLookupOutput>("metadata.lookup", {
    eventName: input.ocr.extractedEventName,
    venue: input.ocr.extractedVenue,
    eventDate: input.ocr.extractedEventDate,
  });
  const fixture = toolResult.output?.fixture ?? null;

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
