import { parseEventLogs, type TransactionReceipt } from "viem";
import { escrowMarketplaceAbi } from "@fanpass/shared";
import { env } from "@/config/env";
import { publicClient } from "./client";

const ADDRESS = env.web3.escrowMarketplaceAddress;
// This RPC serves eth_getTransactionReceipt inconsistently (load-balanced, no session affinity — see
// web3/client.ts) even for a tx whose sender nonce has already advanced, i.e. genuinely mined. 24s of
// retry budget wasn't enough in practice, and a live repro (2026-07-14) showed the by-hash lookup still
// failing for a confirmed tx 90+s in — 60s isn't reliably enough either. 120s stays safely under
// client.ts's 180s nonce-poll budget (which covers actual mining time, a different problem) while
// giving real headroom over the worst lag observed so far.
const RECEIPT_RETRY_ATTEMPTS = 40;
const RECEIPT_RETRY_DELAY_MS = 3_000;

/**
 * The frontend already waited for this transaction to confirm client-side before calling us — but
 * eth_getTransactionReceipt on this RPC is served inconsistently (see client.ts), so a single read can
 * still come back null even for a settled tx. Retry a handful of times before giving up.
 */
export async function getReceiptWithRetry(txHash: `0x${string}`): Promise<TransactionReceipt> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= RECEIPT_RETRY_ATTEMPTS; attempt++) {
    try {
      return await publicClient.getTransactionReceipt({ hash: txHash });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, RECEIPT_RETRY_DELAY_MS));
    }
  }
  throw new Error(`No receipt for ${txHash} after ${RECEIPT_RETRY_ATTEMPTS} attempts: ${(lastError as Error)?.message}`);
}

export type MarketplaceEvent = ReturnType<typeof parseEventLogs<typeof escrowMarketplaceAbi>>[number];

/** Decodes whichever EscrowMarketplace events are present in a receipt's logs — a tx can emit several. */
export function decodeMarketplaceEvents(receipt: TransactionReceipt): MarketplaceEvent[] {
  return parseEventLogs({
    abi: escrowMarketplaceAbi,
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === ADDRESS.toLowerCase()),
  });
}

export async function getListingOnChain(listingId: bigint) {
  return publicClient.readContract({ address: ADDRESS, abi: escrowMarketplaceAbi, functionName: "getListing", args: [listingId] });
}

export async function getEscrowOnChain(listingId: bigint) {
  return publicClient.readContract({ address: ADDRESS, abi: escrowMarketplaceAbi, functionName: "getEscrow", args: [listingId] });
}
