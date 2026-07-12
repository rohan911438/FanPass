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
