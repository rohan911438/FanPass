import type { CctpSourceChain, WalletAddress } from "@fanpass/shared";

/**
 * The CCTP module's own responsibility ends at "minted" — USDC is now native on Injective, at the
 * buyer's own address. From there the buyer's already-connected wallet signs EscrowMarketplace.buy()
 * exactly like a same-chain purchase (see docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 1, and the Context
 * note in the Phase 5 implementation plan on why no RELAYER_ROLE/contract change was needed).
 */
export type CrossChainIntentState =
  | "awaiting_burn"
  | "attesting"
  | "attested"
  | "minting"
  | "minted"
  | "failed"
  | "refund_pending"
  | "refunded";

export interface CrossChainPurchaseIntent {
  id: string;
  listingId: string;
  buyerAddress: WalletAddress;
  sourceChain: CctpSourceChain;
  sourceDomain: number;
  amount: string; // 6-decimal USDC base units, as a string (bigint-safe over JSON)
  burnTxHash: string | null;
  messageHash: string | null;
  mintTxHash: string | null;
  state: CrossChainIntentState;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}
