import { z } from "zod";

const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid transaction hash");

/**
 * Listing/buy/cancel are now real on-chain transactions signed by the connected wallet — the backend
 * never mutates marketplace state directly from user-submitted params. Once a transaction confirms
 * client-side, the frontend calls POST /marketplace/sync with the hash plus the listingId it already
 * knows (read directly from contract state, e.g. via listingOf — see apps/web/src/hooks/
 * useCreateListing.ts); the backend reconciles the local store against current on-chain listing/escrow
 * state for that id, rather than decoding the tx's event logs. eth_getTransactionReceipt AND eth_getLogs
 * on the Injective Testnet RPC are both unreliable by-hash/by-range lookups (see apps/api/src/web3/
 * escrowMarketplace.ts) — direct state reads (listingOf/getListing/getEscrow) are the only thing this
 * RPC serves consistently. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §14.
 */
export const syncTxSchema = z.object({
  txHash: txHashSchema,
  listingId: z.string().min(1, "listingId is required"),
});

export type SyncTxInput = z.infer<typeof syncTxSchema>;
