import type { AgentResult, OcrAgentOutput } from "@fanpass/shared";
import { callTool } from "@/mcp/server";
import type { OcrExtractInput, OcrExtractOutput } from "@/mcp/tools/ocr.extract";
import type { OcrAgentInput } from "@/types/agentInputs";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

/** Calls the ocr.extract MCP tool for the reading, then derives the match/confidence verdict against the claim. */
export async function runOcrAgent(input: OcrAgentInput): Promise<AgentResult<OcrAgentOutput>> {
  const start = Date.now();
  const { claimed } = input;
  const timingRand = seededRandom(`ocr-timing:${sha256Hex(JSON.stringify(claimed))}`);
  await delay(500 + Math.floor(timingRand() * 400));

  const toolResult = await callTool<OcrExtractInput, OcrExtractOutput>("ocr.extract", { claimed });
  const extraction = toolResult.output;
  const fieldsMatchClaim = extraction?.lowConfidenceField == null;
  const mismatches = extraction?.lowConfidenceField ? [extraction.lowConfidenceField] : [];

  const confidenceRand = seededRandom(`ocr-confidence:${sha256Hex(JSON.stringify(claimed))}`)();
  const confidence = fieldsMatchClaim ? 0.92 + confidenceRand * 0.07 : 0.6 + confidenceRand * 0.15;

  const output: OcrAgentOutput = {
    extractedEventName: extraction?.extractedEventName ?? claimed.eventName,
    extractedEventDate: extraction?.extractedEventDate ?? claimed.eventDate,
    extractedVenue: extraction?.extractedVenue ?? claimed.venue,
    extractedSeatInfo: extraction?.extractedSeatInfo,
    fieldsMatchClaim,
    mismatches,
  };

  const flags = fieldsMatchClaim ? [] : ["ocr_field_mismatch"];
  if (!toolResult.ok) flags.push("ocr_extract_tool_unavailable");

  return {
    agent: "ocr",
    confidence: Number(confidence.toFixed(2)),
    output,
    flags,
    latencyMs: Date.now() - start,
  };
}
