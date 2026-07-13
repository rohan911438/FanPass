import type { AgentName, AgentResult } from "./agents";
import type { EscrowStatus, ListingStatus } from "./entities";

/**
 * A Skill IS an agent — same result shape, same name space — just organized behind a Planner + registry
 * (see apps/api/src/planner/) instead of one hardcoded sequence. See docs/PHASE_5_ECOSYSTEM_INTEGRATION.md
 * Part 4.
 */
export type SkillName = AgentName;
export type SkillResult<T = unknown> = AgentResult<T>;

export type SkillRequestType = "verification" | "marketplace" | "premium" | "attendance";

export interface SkillContext {
  ticketId: string;
  requestType: SkillRequestType;
  premium?: { reportType: string; paymentRef: string };
  priorResults: Partial<Record<SkillName, SkillResult<unknown>>>;
}

/** Escrow Validation skill output — a direct on-chain read, not a mirror of local listing state. */
export interface EscrowValidationOutput {
  listingStatus: ListingStatus | null;
  escrowState: EscrowStatus;
  fundsMatchListingPrice: boolean;
}

/** Insurance skill output — backs the Insurance Eligibility premium report. */
export interface InsuranceAgentOutput {
  eligible: boolean;
  riskTier: "low" | "medium" | "high";
  suggestedPremiumBps: number;
}

export interface TicketTimelineEvent {
  type: "minted" | "transferred";
  from: string | null;
  to: string;
  txHash: string | null;
  timestamp: string;
}

/** Output for the "transfer" agent slot — full ownership/transfer history for a ticket. */
export interface TransferAgentOutput {
  events: TicketTimelineEvent[];
  transferEligible: boolean;
}
