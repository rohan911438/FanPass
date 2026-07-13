import { seededRandom, sha256Hex } from "@/utils/hash";
import type { ClaimedTicketFields } from "@/types/agentInputs";
import type { McpTool } from "../types";

export interface OcrExtractInput {
  claimed: ClaimedTicketFields;
}

export interface OcrExtractOutput {
  extractedEventName: string;
  extractedEventDate: string;
  extractedVenue: string;
  extractedSeatInfo?: string;
  lowConfidenceField: "seatInfo" | null;
}

/**
 * Mocked but deterministic: seeded from the claimed fields, not Math.random() — the same submission
 * always extracts the same reading. Real Vision OCR swaps in later behind this same signature.
 */
export const ocrExtractTool: McpTool<OcrExtractInput, OcrExtractOutput> = {
  name: "ocr.extract",
  config: { timeoutMs: 8_000, retries: 2, cacheTtlMs: null },
  async run({ claimed }) {
    const seed = sha256Hex(JSON.stringify(claimed));
    const rand = seededRandom(`ocr:${seed}`);
    const mismatchRoll = rand();

    if (mismatchRoll < 0.12 && claimed.seatInfo) {
      return {
        extractedEventName: claimed.eventName,
        extractedEventDate: claimed.eventDate,
        extractedVenue: claimed.venue,
        extractedSeatInfo: `${claimed.seatInfo} (low OCR confidence)`,
        lowConfidenceField: "seatInfo",
      };
    }

    return {
      extractedEventName: claimed.eventName,
      extractedEventDate: claimed.eventDate,
      extractedVenue: claimed.venue,
      extractedSeatInfo: claimed.seatInfo,
      lowConfidenceField: null,
    };
  },
};
