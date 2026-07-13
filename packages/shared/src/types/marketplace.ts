import type {
  Attendance,
  MarketplaceListing,
  MemoryCard,
  OwnershipCertificate,
  Ticket,
  Transaction,
  UserProfile,
} from "./entities";
import type { TrustScore } from "./agents";

/**
 * GET /marketplace response shape — a listing merged with the ticket's Trust Score and the seller's
 * reputation, since Firestore has no joins. `aiSuggestedDeal` traces to the Marketplace Agent.
 */
export interface ListingSummary {
  listing: MarketplaceListing;
  trustScore: TrustScore | null;
  sellerReputation: { tier: UserProfile["reputationTier"]; score: number } | null;
  /** Prior owners on the mocked ownership certificate — history.length - 1 (the mint isn't a transfer). */
  transferCount: number;
  aiSuggestedDeal: boolean;
}

export interface ListingFilters {
  minPrice?: number;
  maxPrice?: number;
  minTrustScore?: number;
  query?: string; // matches event name, venue, or seat info
  sortBy?: "recommended" | "price_asc" | "price_desc" | "trust_desc" | "recent";
}

/** GET /wallet/:address response shape — everything a Wallet page tab needs, in one call. */
export interface WalletSummary {
  walletAddress: string;
  user: UserProfile;
  trustScore: TrustScore | null;
  tickets: Ticket[];
  certificates: OwnershipCertificate[];
  transactions: Transaction[];
  attendanceBadges: Attendance[];
  memoryCards: MemoryCard[];
  /** This wallet's own listings (any status) — what Owned Tickets needs to offer Cancel/Relist. */
  myListings: MarketplaceListing[];
}
