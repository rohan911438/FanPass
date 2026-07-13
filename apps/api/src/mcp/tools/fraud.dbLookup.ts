import type { McpTool } from "../types";

export interface FraudDbLookupInput {
  qrHash: string;
}

export interface FraudDbLookupOutput {
  matched: boolean;
  source: "unavailable" | string;
}

/**
 * Stub: no external fraud-signal DB is wired up yet (no vendor chosen — see
 * docs/PHASE_5_ECOSYSTEM_INTEGRATION.md §3.3). Returns a safe "no match" so callers (the Deep Fraud
 * Investigation premium report) degrade gracefully rather than failing outright.
 */
export const fraudDbLookupTool: McpTool<FraudDbLookupInput, FraudDbLookupOutput> = {
  name: "fraud.dbLookup",
  config: { timeoutMs: 5_000, retries: 2, cacheTtlMs: 10 * 60_000 },
  async run() {
    return { matched: false, source: "unavailable" };
  },
};
