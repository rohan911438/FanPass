import { formatUnits } from "viem";
import type { WalletAddress } from "@fanpass/shared";
import { runPricingAgent } from "@/ai/agents/pricing.agent";
import { runSellerReputationAgent } from "@/ai/agents/sellerReputation.agent";
import { ApiError } from "@/middleware/errorHandler";
import { logAgentInvocation } from "@/repositories/agentLogRepository";
import {
  createListing,
  findActiveListingPricesForEvent,
  getListingById,
  updateListing,
} from "@/repositories/listingRepository";
import { transferOwnershipCertificate } from "@/repositories/ownershipCertificateRepository";
import { findTicketByTokenId, updateTicket } from "@/repositories/ticketRepository";
import {
  createTransaction,
  findPendingPurchaseByListingId,
  updateTransaction,
} from "@/repositories/transactionRepository";
import { upsertTrustScore } from "@/repositories/trustScoreRepository";
import { incrementUserStats, updateUser } from "@/repositories/userRepository";
import { decodeMarketplaceEvents, getReceiptWithRetry, type MarketplaceEvent } from "@/web3/escrowMarketplace";

const USDC_DECIMALS = 6;

function toDisplayAmount(baseUnits: bigint): number {
  return Number(formatUnits(baseUnits, USDC_DECIMALS));
}

/**
 * Listing/buy/cancel are now real transactions signed by the connected wallet (see
 * docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §14) — this is the "backend listens to smart contract events
 * and updates the off-chain store" half of that flow, triggered on-demand by the frontend right after
 * its own transaction confirms, rather than a continuously-running indexer. Every handler checks current
 * local state before mutating, so re-syncing the same tx twice is a no-op, not a double-count.
 */
export async function syncFromChainTx(txHash: `0x${string}`): Promise<{ processedEvents: string[] }> {
  const receipt = await getReceiptWithRetry(txHash);
  const events = decodeMarketplaceEvents(receipt);
  if (events.length === 0) {
    throw new ApiError(400, "This transaction didn't emit any recognized EscrowMarketplace event.");
  }

  const processedEvents: string[] = [];
  for (const event of events) {
    await handleEvent(event, txHash);
    processedEvents.push(event.eventName);
  }
  return { processedEvents };
}

async function handleEvent(event: MarketplaceEvent, txHash: `0x${string}`): Promise<void> {
  switch (event.eventName) {
    case "ListingCreated":
      return handleListingCreated(event.args);
    case "FundsLocked":
      return handleFundsLocked(event.args, txHash);
    case "TicketPurchased":
      return handleTicketPurchased(event.args, txHash);
    case "ListingCancelled":
      return handleListingCancelled(event.args);
    case "ListingExpired":
      return handleListingExpired(event.args);
    case "BuyerRefunded":
      return handleBuyerRefunded(event.args);
    default:
      // FundsReleased always arrives alongside TicketPurchased (handled there); DisputeRaised/
      // DisputeResolved have no frontend surface yet (Phase 5+) — nothing to sync for either.
      return;
  }
}

async function handleListingCreated(args: { listingId: bigint; tokenId: bigint; seller: string; price: bigint; expiresAt: bigint }): Promise<void> {
  const listingId = args.listingId.toString();
  if (await getListingById(listingId)) return; // already synced

  const ticket = await findTicketByTokenId(args.tokenId.toString());
  if (!ticket) throw new ApiError(400, `No ticket found for tokenId ${args.tokenId}`);

  const comps = await findActiveListingPricesForEvent(ticket.eventName, ticket.venue);
  const pricing = await runPricingAgent({ eventName: ticket.eventName, venue: ticket.venue, comps });
  await logAgentInvocation({
    agentName: "pricing",
    ticketId: ticket.ticketId,
    input: { eventName: ticket.eventName, venue: ticket.venue, compsCount: comps.length },
    output: pricing.output,
    confidence: pricing.confidence,
    latencyMs: pricing.latencyMs,
  });

  await createListing({
    listingId,
    ticketId: ticket.ticketId,
    sellerAddress: args.seller as WalletAddress,
    askPrice: toDisplayAmount(args.price),
    currency: "USDC",
    aiSuggestedPrice: { min: pricing.output.fairMin, max: pricing.output.fairMax, fair: pricing.output.fairSuggested },
    expiresAt: args.expiresAt > 0n ? new Date(Number(args.expiresAt) * 1000).toISOString() : null,
    eventName: ticket.eventName,
    venue: ticket.venue,
    eventDate: ticket.eventDate,
    seatInfo: ticket.seatInfo,
    imageUrl: ticket.imageUrl,
  });
  await updateTicket(ticket.ticketId, { status: "listed" });
}

async function handleFundsLocked(args: { listingId: bigint; buyer: string; amount: bigint }, txHash: `0x${string}`): Promise<void> {
  const listing = await getListingById(args.listingId.toString());
  if (!listing || listing.status !== "active") return; // already synced or not our listing

  await createTransaction({
    type: "purchase",
    ticketId: listing.ticketId,
    listingId: listing.listingId,
    fromAddress: args.buyer as WalletAddress,
    toAddress: listing.sellerAddress,
    amount: toDisplayAmount(args.amount),
    currency: "USDC",
    txHash,
    status: "pending",
  });
  await updateListing(listing.listingId, { escrow: { status: "funded", onChainEscrowId: listing.listingId }, status: "pending_escrow" });
  await updateTicket(listing.ticketId, { status: "in_escrow" });
}

async function handleTicketPurchased(args: { listingId: bigint; buyer: string; seller: string }, txHash: `0x${string}`): Promise<void> {
  const listing = await getListingById(args.listingId.toString());
  if (!listing || listing.status === "sold") return;

  await transferOwnershipCertificate(listing.ticketId, args.buyer as WalletAddress, txHash);
  await updateTicket(listing.ticketId, { status: "sold" });
  await updateListing(listing.listingId, { status: "sold", escrow: { status: "released", onChainEscrowId: listing.listingId } });

  const pending = await findPendingPurchaseByListingId(listing.listingId);
  if (pending) await updateTransaction(pending.txId, { status: "completed" });

  await Promise.all([
    recomputeSellerReputation(args.seller as WalletAddress, { ticketsSold: 1 }),
    recomputeSellerReputation(args.buyer as WalletAddress, { ticketsBought: 1 }),
  ]);
}

async function handleListingCancelled(args: { listingId: bigint }): Promise<void> {
  const listing = await getListingById(args.listingId.toString());
  if (!listing || listing.status !== "active") return;
  await updateListing(listing.listingId, { status: "cancelled" });
  await updateTicket(listing.ticketId, { status: "verified" });
}

async function handleListingExpired(args: { listingId: bigint }): Promise<void> {
  const listing = await getListingById(args.listingId.toString());
  if (!listing || listing.status !== "active") return;
  await updateListing(listing.listingId, { status: "expired" });
  await updateTicket(listing.ticketId, { status: "verified" });
}

async function handleBuyerRefunded(args: { listingId: bigint }): Promise<void> {
  const listing = await getListingById(args.listingId.toString());
  if (!listing || listing.status !== "pending_escrow") return;

  const pending = await findPendingPurchaseByListingId(listing.listingId);
  if (pending) await updateTransaction(pending.txId, { status: "failed" });

  await updateListing(listing.listingId, { status: "cancelled", escrow: { status: "refunded", onChainEscrowId: listing.listingId } });
  await updateTicket(listing.ticketId, { status: "verified" });
}

async function recomputeSellerReputation(
  walletAddress: WalletAddress,
  delta: Partial<{ ticketsBought: number; ticketsSold: number }>
): Promise<void> {
  const user = await incrementUserStats(walletAddress, delta);
  const result = await runSellerReputationAgent({ walletAddress, stats: user.stats });
  await logAgentInvocation({
    agentName: "sellerReputation",
    input: { walletAddress, stats: user.stats },
    output: result.output,
    confidence: result.confidence,
    latencyMs: result.latencyMs,
  });
  await upsertTrustScore("user", walletAddress, result.output.score, result.output.breakdown);
  await updateUser(walletAddress, { reputationTier: result.output.reputationTier });
}
