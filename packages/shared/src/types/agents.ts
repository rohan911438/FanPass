export type AgentName =
  | "ocr"
  | "qr"
  | "metadata"
  | "fraud"
  | "ownership"
  | "pricing"
  | "sellerReputation"
  | "marketplace"
  | "insurance"
  | "transfer";

/** Every agent returns this shape — structured JSON, never a free-form string. */
export interface AgentResult<TOutput = unknown> {
  agent: AgentName;
  confidence: number; // 0-1
  output: TOutput;
  flags: string[];
  latencyMs: number;
}

/** Sub-badges shown on the Trust Score card — each traces to specific agent(s). See ARCHITECTURE.md §6. */
export interface TrustScoreBreakdown {
  verifiedQr: boolean;
  verifiedSeller: boolean;
  noDuplicate: boolean;
  fairPrice: boolean;
  transferEligible: boolean;
  lowFraudRisk: boolean;
}

export interface TrustScore {
  entityType: "ticket" | "user";
  entityId: string;
  score: number; // 0-100
  breakdown: TrustScoreBreakdown;
  updatedAt: string; // ISO timestamp
}
