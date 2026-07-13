import type { TicketStatus } from "./entities";

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

// ---------------------------------------------------------------------------
// Verification-time agents (Phase 2) — one output shape per agent so the Trust
// Score card can render an honest, specific explanation instead of a blob.
// ---------------------------------------------------------------------------

export interface OcrAgentOutput {
  extractedEventName: string;
  extractedEventDate: string;
  extractedVenue: string;
  extractedSeatInfo?: string;
  fieldsMatchClaim: boolean;
  mismatches: string[];
}

export interface MetadataAgentOutput {
  fixtureRecognized: boolean;
  matchedFixtureId: string | null;
  eventNameMatch: boolean;
  venueMatch: boolean;
  dateMatch: boolean;
}

export interface FraudAgentOutput {
  tamperScore: number; // 0-1, higher = more likely tampered
  screenshotDetected: boolean;
  editingArtifactsDetected: boolean;
}

export interface QrAgentOutput {
  decoded: boolean;
  qrHash: string;
  duplicateFound: boolean;
  duplicateOfTicketId: string | null;
}

export interface OwnershipAgentOutput {
  claimedSeller: string;
  currentOwnerOnRecord: string | null;
  sellerMatchesOwner: boolean;
  isFirstVerification: boolean;
}

export interface PricingAgentOutput {
  fairMin: number;
  fairMax: number;
  fairSuggested: number;
  currency: "USDC";
  compsFound: boolean;
}

/** The five agents that run during ticket verification, in execution order. */
export const VERIFICATION_STAGES = [
  "ocr",
  "metadata",
  "qr",
  "fraud",
  "ownership",
  "pricing",
] as const;
export type VerificationStage = (typeof VERIFICATION_STAGES)[number];

export interface VerificationAgentResults {
  ocr?: AgentResult<OcrAgentOutput>;
  metadata?: AgentResult<MetadataAgentOutput>;
  qr?: AgentResult<QrAgentOutput>;
  fraud?: AgentResult<FraudAgentOutput>;
  ownership?: AgentResult<OwnershipAgentOutput>;
  pricing?: AgentResult<PricingAgentOutput>;
}

/** Polled by the frontend stepper — reflects real backend progress, not a client timer. */
export interface VerificationProgress {
  ticketId: string;
  ticketStatus: TicketStatus;
  stage: VerificationStage | "complete";
  completedStages: VerificationStage[];
  agentResults: VerificationAgentResults;
  flags: string[];
  trustScore: TrustScore | null;
}
