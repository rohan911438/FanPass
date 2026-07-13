export type WalletAddress = `0x${string}`;

export type TicketStatus =
  | "unverified"
  | "verified"
  | "listed"
  | "in_escrow"
  | "sold"
  | "checked_in"
  | "used";

export type ListingStatus = "active" | "pending_escrow" | "sold" | "cancelled";

export type EscrowStatus = "none" | "funded" | "released" | "refunded" | "disputed";

export type ReputationTier = "new" | "verified" | "trusted" | "elite";

export type TrustEntityType = "ticket" | "user";

export type Currency = "USDC";

/** tickets/{ticketId} — the Digital Ticket Identity. See ARCHITECTURE.md §4. */
export interface Ticket {
  ticketId: string;
  eventName: string;
  eventDate: string; // ISO
  venue: string;
  seatInfo?: string;
  sellerAddress: WalletAddress;
  qrHash: string | null;
  originalIssuer?: string;
  imageUrl: string;
  status: TicketStatus;
  createdAt: string;
  updatedAt: string;
}

/** verificationReports/{ticketId} — source of the expandable Trust Score card. */
export interface VerificationReport {
  ticketId: string;
  stage: string; // VerificationStage | "complete"
  completedStages: string[];
  agentResults: Record<string, unknown>;
  flags: string[];
  createdAt: string;
  updatedAt: string;
}

/** ownershipCertificates/{certId} — mocked Firestore record until Phase 4 swaps in the real contract. */
export interface OwnershipCertificate {
  certId: string;
  ticketId: string;
  tokenId: string | null;
  contractAddress: string | null;
  currentOwner: WalletAddress;
  history: Array<{ walletAddress: WalletAddress; txHash: string | null; timestamp: string }>;
  mintedAt: string;
}

/** agentLogs/{logId} — every agent invocation, audit + debugging. */
export interface AgentLog {
  logId: string;
  agentName: string;
  ticketId?: string;
  input: unknown;
  output: unknown;
  confidence: number;
  latencyMs: number;
  createdAt: string;
}
