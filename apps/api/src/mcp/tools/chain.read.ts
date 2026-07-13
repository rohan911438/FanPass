import { getEscrowOnChain, getListingOnChain } from "@/web3/escrowMarketplace";
import { getOwnerOnChain, getTicketStatusOnChain } from "@/web3/ownershipRegistry";
import type { McpTool } from "../types";

export type ChainReadInput =
  | { kind: "listing"; listingId: bigint }
  | { kind: "escrow"; listingId: bigint }
  | { kind: "ticketStatus"; tokenId: bigint }
  | { kind: "owner"; tokenId: bigint };

export type ChainReadOutput =
  | { kind: "listing"; value: Awaited<ReturnType<typeof getListingOnChain>> }
  | { kind: "escrow"; value: Awaited<ReturnType<typeof getEscrowOnChain>> }
  | { kind: "ticketStatus"; value: number }
  | { kind: "owner"; value: `0x${string}` };

/** Real: wraps apps/api/src/web3/* — the one seam Skills use to read on-chain state, never viem directly. */
export const chainReadTool: McpTool<ChainReadInput, ChainReadOutput> = {
  name: "chain.read",
  // Cached for one Injective block's worth of time — long enough to dedupe bursts, short enough to stay fresh.
  config: { timeoutMs: 5_000, retries: 3, cacheTtlMs: 2_000 },
  async run(input) {
    switch (input.kind) {
      case "listing":
        return { kind: "listing", value: await getListingOnChain(input.listingId) };
      case "escrow":
        return { kind: "escrow", value: await getEscrowOnChain(input.listingId) };
      case "ticketStatus":
        return { kind: "ticketStatus", value: await getTicketStatusOnChain(input.tokenId) };
      case "owner":
        return { kind: "owner", value: await getOwnerOnChain(input.tokenId) };
    }
  },
};
