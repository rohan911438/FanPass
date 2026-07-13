import type { McpTool } from "../types";

export interface ImageForensicsInput {
  fileBuffer: Buffer;
  mimetype: string;
}

export interface ImageForensicsOutput {
  available: boolean;
  cloneDetected: boolean | null;
  elaScore: number | null;
}

/**
 * Stub: no pixel-level forensics vendor is wired up yet. Backs the Image Forensics premium report —
 * returns `available: false` so the report degrades to the free tamper-score heuristic instead of failing.
 */
export const imageForensicsTool: McpTool<ImageForensicsInput, ImageForensicsOutput> = {
  name: "image.forensics",
  config: { timeoutMs: 15_000, retries: 1, cacheTtlMs: null },
  async run() {
    return { available: false, cloneDetected: null, elaScore: null };
  },
};
