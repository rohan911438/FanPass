import { formatUnits, zeroAddress } from "viem";
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
import { getEscrowOnChain, getListingOnChain } from "@/web3/escrowMarketplace";

const USDC_DECIMALS = 6;

// Mirrors IEscrowMarketplace.sol's enums exactly — see apps/contracts/contracts/interfaces/IEscrowMarketplace.sol.
const LISTING_STATUS = { NONE: 0, ACTIVE: 1, PENDING_ESCROW: 2, SOLD: 3, CANCELLED: 4, EXPIRED: 5 } as const;
const ESCROW_STATE = { NONE: 0, FUNDED: 1, RELEASED: 2, REFUNDED: 3, DISPUTED: 4 } as const;

function toDisplayAmount(baseUnits: bigint): number {
  return Number(formatUnits(baseUnits, USDC_DECIMALS));
}

/**
 * Listing/buy/cancel are now real transactions signed by the connected wallet (see
 * docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §14) — this reconciles the off-chain store against current
 * on-chain listing/escrow state for a given listingId, triggered on-demand by the frontend right after
 * its own transaction confirms, rather than a continuously-running indexer.
 *
 * Deliberately NOT event-log-based: eth_getTransactionReceipt and eth_getLogs are both unreliable on the
 * Injective Testnet RPC (verified live 2026-07-14 — a genuinely-mined, nonce-confirmed tx's receipt was
 * unfindable by hash after 40 retries over 120s, and eth_getLogs returned zero results even for the exact
 * block range containing it). listingOf/getListing/getEscrow view calls are the one thing this RPC serves
 * consistently, so reconciliation reads current state directly instead of decoding what one specific tx
 * changed. Every handler below checks current local state before mutating, so re-syncing the same
 * listingId twice — or syncing after several state transitions happened between two sync calls — is a
 * no-op / catch-up, not a double-count.
 */
export async function syncFromChainTx(txHash: `0x${string}`, listingId: string): Promise<{ processedEvents: string[] }> {
  const listing = await getListingOnChain(BigInt(listingId));
  if (listing.seller === zeroAddress) {
    throw new ApiError(400, `No listing found on-chain for listingId ${listingId}`);
  }

  const processedEvents: string[] = [];

  if (!(await getListingById(listingId))) {
    await handleListingCreated({
      listingId: BigInt(listingId),
      tokenId: listing.tokenId,
      seller: listing.seller,
      price: listing.price,
      expiresAt: listing.expiresAt,
    });
    processedEvents.push("ListingCreated");
  }

  if (listing.status === LISTING_STATUS.PENDING_ESCROW || listing.status === LISTING_STATUS.SOLD) {
    const escrow = await getEscrowOnChain(BigInt(listingId));
    if (escrow.buyer !== zeroAddress) {
      await handleFundsLocked({ listingId: BigInt(listingId), buyer: escrow.buyer, amount: escrow.amount }, txHash);
      processedEvents.push("FundsLocked");
    }
    if (listing.status === LISTING_STATUS.SOLD && escrow.state === ESCROW_STATE.RELEASED) {
      await handleTicketPurchased({ listingId: BigInt(listingId), buyer: escrow.buyer, seller: listing.seller }, txHash);
      processedEvents.push("TicketPurchased");
    }
  }

  if (listing.status === LISTING_STATUS.CANCELLED) {
    const escrow = await getEscrowOnChain(BigInt(listingId));
    if (escrow.buyer !== zeroAddress && escrow.state === ESCROW_STATE.REFUNDED) {
      await handleBuyerRefunded({ listingId: BigInt(listingId) });
      processedEvents.push("BuyerRefunded");
    } else {
      await handleListingCancelled({ listingId: BigInt(listingId) });
      processedEvents.push("ListingCancelled");
    }
  }

  if (listing.status === LISTING_STATUS.EXPIRED) {
    await handleListingExpired({ listingId: BigInt(listingId) });
    processedEvents.push("ListingExpired");
  }

  // An empty list here is a legitimate, harmless outcome (e.g. the frontend re-syncing a listing whose
  // on-chain state hasn't changed since the last sync) — not an error condition, unlike an unknown
  // listingId above.
  return { processedEvents };
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
