import { z } from "zod";

const txHashSchema = z.string().regex(/^0x[a-fA-F0-9]{64}$/, "Must be a valid transaction hash");

/**
 * Listing/buy/cancel are now real on-chain transactions signed by the connected wallet — the backend
 * never mutates marketplace state directly from user-submitted params. Once a transaction confirms
 * client-side, the frontend calls POST /marketplace/sync with just the hash; the backend reads the
 * receipt's logs and mirrors whatever happened into the local store. See
 * docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §14.
 */
export const syncTxSchema = z.object({
  txHash: txHashSchema,
});

export type SyncTxInput = z.infer<typeof syncTxSchema>;
