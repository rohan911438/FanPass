import type { AgentResult, OcrAgentOutput } from "@fanpass/shared";
import type { OcrAgentInput } from "@/types/agentInputs";
import { delay } from "@/utils/delay";
import { seededRandom, sha256Hex } from "@/utils/hash";

/**
 * Mocked but deterministic: seeded from the claimed fields' content, not Math.random(), so the same
 * submission always extracts the same "OCR" reading. Real Vision OCR swaps in later behind this same
 * signature — see docs/ARCHITECTURE.md §6.
 */
export async function runOcrAgent(input: OcrAgentInput): Promise<AgentResult<OcrAgentOutput>> {
  const start = Date.now();
  const { claimed } = input;
  const seed = sha256Hex(JSON.stringify(claimed));
  const rand = seededRandom(`ocr:${seed}`);

  await delay(500 + Math.floor(rand() * 400));

  const mismatchRoll = rand();
  const mismatches: string[] = [];
  let extractedSeatInfo = claimed.seatInfo;
  let fieldsMatchClaim = true;

  if (mismatchRoll < 0.12 && claimed.seatInfo) {
    mismatches.push("seatInfo");
    extractedSeatInfo = `${claimed.seatInfo} (low OCR confidence)`;
    fieldsMatchClaim = false;
  }

  const confidence = fieldsMatchClaim ? 0.92 + rand() * 0.07 : 0.6 + rand() * 0.15;

  const output: OcrAgentOutput = {
    extractedEventName: claimed.eventName,
    extractedEventDate: claimed.eventDate,
    extractedVenue: claimed.venue,
    extractedSeatInfo,
    fieldsMatchClaim,
    mismatches,
  };

  return {
    agent: "ocr",
    confidence: Number(confidence.toFixed(2)),
    output,
    flags: fieldsMatchClaim ? [] : ["ocr_field_mismatch"],
    latencyMs: Date.now() - start,
  };
}
