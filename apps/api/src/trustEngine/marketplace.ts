import type { MarketplaceListing, Transaction, WalletAddress } from "@fanpass/shared";
import { runPricingAgent } from "@/ai/agents/pricing.agent";
import { runSellerReputationAgent } from "@/ai/agents/sellerReputation.agent";
import { ApiError } from "@/middleware/errorHandler";
import { logAgentInvocation } from "@/repositories/agentLogRepository";
import {
  createListing,
  findActiveListingPricesForEvent,
  generateListingId,
  getListingById,
  updateListing,
} from "@/repositories/listingRepository";
import { getOwnershipCertificateByTicketId, transferOwnershipCertificate } from "@/repositories/ownershipCertificateRepository";
import { getTicketById, updateTicket } from "@/repositories/ticketRepository";
import {
  createTransaction,
  findPendingPurchaseByListingId,
  updateTransaction,
} from "@/repositories/transactionRepository";
import { upsertTrustScore } from "@/repositories/trustScoreRepository";
import { incrementUserStats, updateUser } from "@/repositories/userRepository";

function assertSameAddress(a: string, b: string, message: string): void {
  if (a.toLowerCase() !== b.toLowerCase()) throw new ApiError(403, message);
}

/**
 * Real Pricing Agent comps: other active listings for the same event + venue (Phase 2's ticket-
 * verification call site still passes zero comps and falls back to the fixtures table).
 */
export async function listTicket(
  ticketId: string,
  sellerAddress: WalletAddress,
  askPrice: number
): Promise<MarketplaceListing> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new ApiError(404, `Ticket not found: ${ticketId}`);
  if (ticket.status !== "verified") {
    throw new ApiError(400, `Ticket must be verified before it can be listed (current status: ${ticket.status}).`);
  }

  const cert = await getOwnershipCertificateByTicketId(ticketId);
  if (!cert) throw new ApiError(400, "No ownership certificate on record for this ticket.");
  assertSameAddress(cert.currentOwner, sellerAddress, "Only the current owner can list this ticket.");

  const comps = await findActiveListingPricesForEvent(ticket.eventName, ticket.venue);
  const pricing = await runPricingAgent({ eventName: ticket.eventName, venue: ticket.venue, comps });
  await logAgentInvocation({
    agentName: "pricing",
    ticketId,
    input: { eventName: ticket.eventName, venue: ticket.venue, compsCount: comps.length },
    output: pricing.output,
    confidence: pricing.confidence,
    latencyMs: pricing.latencyMs,
  });

  const listingId = generateListingId();
  const listing = await createListing({
    listingId,
    ticketId,
    sellerAddress,
    askPrice,
    currency: "USDC",
    aiSuggestedPrice: { min: pricing.output.fairMin, max: pricing.output.fairMax, fair: pricing.output.fairSuggested },
    eventName: ticket.eventName,
    venue: ticket.venue,
    eventDate: ticket.eventDate,
    seatInfo: ticket.seatInfo,
    imageUrl: ticket.imageUrl,
  });

  await updateTicket(ticketId, { status: "listed" });
  return listing;
}

/** Locks the buyer's (mocked) USDC — same signature/state transition the real Escrow.sol call will use. */
export async function openEscrow(
  listingId: string,
  buyerAddress: WalletAddress
): Promise<{ listing: MarketplaceListing; transaction: Transaction }> {
  const listing = await getListingById(listingId);
  if (!listing) throw new ApiError(404, `Listing not found: ${listingId}`);
  if (listing.status !== "active") throw new ApiError(400, `Listing is not active (status: ${listing.status}).`);
  if (listing.escrow.status !== "none") throw new ApiError(400, "Escrow already in progress for this listing.");
  if (listing.sellerAddress.toLowerCase() === buyerAddress.toLowerCase()) {
    throw new ApiError(400, "You can't buy your own listing.");
  }

  await updateListing(listingId, { escrow: { status: "funded", onChainEscrowId: null }, status: "pending_escrow" });
  const transaction = await createTransaction({
    type: "purchase",
    ticketId: listing.ticketId,
    listingId,
    fromAddress: buyerAddress,
    toAddress: listing.sellerAddress,
    amount: listing.askPrice,
    currency: "USDC",
    txHash: null,
    status: "pending",
  });

  const updated = await getListingById(listingId);
  return { listing: updated!, transaction };
}

/** Settles a funded escrow: transfers the mocked certificate, marks the sale complete, updates reputation. */
export async function releaseEscrow(
  listingId: string,
  buyerAddress: WalletAddress
): Promise<{ listing: MarketplaceListing; transaction: Transaction }> {
  const listing = await getListingById(listingId);
  if (!listing) throw new ApiError(404, `Listing not found: ${listingId}`);
  if (listing.escrow.status !== "funded") throw new ApiError(400, "Escrow is not funded.");

  const transaction = await findPendingPurchaseByListingId(listingId);
  if (!transaction) throw new ApiError(400, "No pending transaction found for this escrow.");
  assertSameAddress(transaction.toAddress, buyerAddress, "Buyer does not match the escrow's funding transaction.");

  await transferOwnershipCertificate(listing.ticketId, buyerAddress, null);
  await updateTicket(listing.ticketId, { status: "sold" });
  await updateListing(listingId, { escrow: { status: "released", onChainEscrowId: null }, status: "sold" });
  await updateTransaction(transaction.txId, { status: "completed" });

  await Promise.all([
    recomputeSellerReputation(listing.sellerAddress, { ticketsSold: 1 }),
    recomputeSellerReputation(buyerAddress, { ticketsBought: 1 }),
  ]);

  const updatedListing = await getListingById(listingId);
  return { listing: updatedListing!, transaction: { ...transaction, status: "completed" } };
}

export async function cancelListing(listingId: string, requesterAddress: WalletAddress): Promise<MarketplaceListing> {
  const listing = await getListingById(listingId);
  if (!listing) throw new ApiError(404, `Listing not found: ${listingId}`);
  if (listing.status !== "active") throw new ApiError(400, `Only active listings can be cancelled (status: ${listing.status}).`);
  assertSameAddress(listing.sellerAddress, requesterAddress, "Only the seller can cancel this listing.");

  await updateListing(listingId, { status: "cancelled" });
  await updateTicket(listing.ticketId, { status: "verified" });

  const updated = await getListingById(listingId);
  return updated!;
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
