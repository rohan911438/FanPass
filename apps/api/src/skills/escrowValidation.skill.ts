import type { EscrowValidationOutput } from "@fanpass/shared";
import { callTool } from "@/mcp/server";
import type { ChainReadInput, ChainReadOutput } from "@/mcp/tools/chain.read";
import type { Skill } from "./types";

const LISTING_STATUS = ["none", "active", "pending_escrow", "sold", "cancelled", "expired"] as const;
const ESCROW_STATE = ["none", "funded", "released", "refunded", "disputed"] as const;

/** Reads EscrowMarketplace via the chain.read MCP tool — a provable fact, not a mirror of local state. */
export const escrowValidationSkill: Skill<EscrowValidationOutput> = {
  name: "escrowValidation",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "premium",
  requiredTools: ["chain.read"],
  dependsOn: [],
  async execute(materials, context) {
    const start = Date.now();
    if (!materials.listingId) throw new Error("escrowValidation skill requires materials.listingId");

    const listingId = BigInt(materials.listingId);
    const [listingResult, escrowResult] = await Promise.all([
      callTool<ChainReadInput, ChainReadOutput>("chain.read", { kind: "listing", listingId }, context.ticketId),
      callTool<ChainReadInput, ChainReadOutput>("chain.read", { kind: "escrow", listingId }, context.ticketId),
    ]);

    const listing = listingResult.output?.kind === "listing" ? listingResult.output.value : undefined;
    const escrow = escrowResult.output?.kind === "escrow" ? escrowResult.output.value : undefined;
    const listingStatus = listing ? (LISTING_STATUS[listing.status] ?? "none") : "none";
    const escrowState = escrow ? (ESCROW_STATE[escrow.state] ?? "none") : "none";
    const fundsMatchListingPrice = !listing || !escrow || escrow.state === 0 || escrow.amount === listing.price;

    const flags: string[] = [];
    if (!fundsMatchListingPrice) flags.push("escrow_amount_mismatch");
    if (!listingResult.ok || !escrowResult.ok) flags.push("chain_read_unavailable");

    return {
      agent: "escrowValidation",
      confidence: listing ? 0.95 : 0.3,
      output: {
        listingStatus: listingStatus === "none" ? null : listingStatus,
        escrowState,
        fundsMatchListingPrice,
      },
      flags,
      latencyMs: Date.now() - start,
    };
  },
};
