export type WalletAddress = `0x${string}`;

export type TicketStatus =
  | "unverified"
  | "verified"
  | "listed"
  | "in_escrow"
  | "sold"
  | "checked_in"
  | "used";

export type ListingStatus = "active" | "pending_escrow" | "sold" | "cancelled" | "expired";

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
  /** OwnershipRegistry tokenId (decimal string) once minted on-chain — null until verification mints it. */
  tokenId: string | null;
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

/**
 * marketplaceListings/{listingId}. eventName/venue/eventDate/seatInfo/imageUrl are a denormalized
 * snapshot of the ticket at listing time — Firestore has no joins, and the grid/filters/pricing comps
 * all need these fields without an extra round-trip per card. See ARCHITECTURE.md §4.
 */
export interface MarketplaceListing {
  /** The on-chain EscrowMarketplace listingId (decimal string) — not a locally-generated id. */
  listingId: string;
  ticketId: string;
  sellerAddress: WalletAddress;
  askPrice: number;
  currency: Currency;
  aiSuggestedPrice: { min: number; max: number; fair: number };
  escrow: { status: EscrowStatus; onChainEscrowId: string | null };
  status: ListingStatus;
  /** ISO timestamp, null = no expiry (mirrors the contract's expiresAt == 0 convention). */
  expiresAt: string | null;
  eventName: string;
  venue: string;
  eventDate: string;
  seatInfo?: string;
  imageUrl: string;
  createdAt: string;
  updatedAt: string;
}

/** transactions/{txId} — full audit trail: purchase, transfer, refund. */
export type TransactionType = "purchase" | "refund";
export type TransactionStatus = "pending" | "completed" | "failed";

export interface Transaction {
  txId: string;
  type: TransactionType;
  ticketId: string;
  listingId: string;
  fromAddress: WalletAddress;
  toAddress: WalletAddress;
  amount: number;
  currency: Currency;
  txHash: string | null;
  status: TransactionStatus;
  createdAt: string;
  updatedAt: string;
}

/** users/{walletAddress}. The trust SCORE itself lives in trustScores/, not duplicated here. */
export interface UserProfile {
  walletAddress: WalletAddress;
  displayName?: string;
  reputationTier: ReputationTier;
  stats: {
    ticketsBought: number;
    ticketsSold: number;
    disputesRaised: number;
    disputesLost: number;
  };
  createdAt: string;
  updatedAt: string;
}

/** attendance/{attendanceId} — populated by real venue check-in in Phase 4/6; empty until then. */
export interface Attendance {
  attendanceId: string;
  ticketId: string;
  walletAddress: WalletAddress;
  venue: string;
  checkedInAt: string;
}

/** memoryCards/{cardId} — populated after attendance in Phase 4/6; empty until then. */
export interface MemoryCard {
  cardId: string;
  ticketId: string;
  walletAddress: WalletAddress;
  aiSummary: string;
  highlights: string[];
  shareImageUrl: string;
  mintedAt: string;
}
