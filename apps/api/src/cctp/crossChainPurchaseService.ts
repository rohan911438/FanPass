import { randomUUID } from "node:crypto";
import { parseUnits } from "viem";
import { CCTP_SOURCE_DOMAINS, type CctpSourceChain, type WalletAddress } from "@fanpass/shared";
import {
  createCrossChainIntent,
  getCrossChainIntent,
  updateCrossChainIntent,
} from "@/repositories/crossChainIntentRepository";
import { cctpProvider } from "@/providers/cctpProvider";
import type { CrossChainPurchaseIntent } from "./types";

const USDC_DECIMALS = 6;
const INTENT_TTL_MS = 24 * 60 * 60 * 1000; // generous — a UX/bookkeeping timeout, not a funds-safety one

export interface CreateIntentParams {
  listingId: string;
  buyerAddress: WalletAddress;
  sourceChain: CctpSourceChain;
  askPrice: number;
}

export async function createIntent(params: CreateIntentParams): Promise<CrossChainPurchaseIntent> {
  const sourceDomain = CCTP_SOURCE_DOMAINS[params.sourceChain];
  const now = Date.now();

  return createCrossChainIntent({
    id: randomUUID(),
    listingId: params.listingId,
    buyerAddress: params.buyerAddress,
    sourceChain: params.sourceChain,
    sourceDomain,
    amount: parseUnits(String(params.askPrice), USDC_DECIMALS).toString(),
    expiresAt: new Date(now + INTENT_TTL_MS).toISOString(),
  });
}

async function requireIntent(id: string): Promise<CrossChainPurchaseIntent> {
  const intent = await getCrossChainIntent(id);
  if (!intent) throw new Error(`Cross-chain intent not found: ${id}`);
  return intent;
}

/**
 * The buyer's burn transaction on the source chain has confirmed (frontend already waited for it) —
 * derive the CCTP message hash and move the intent into attestation polling.
 */
export async function confirmBurn(intentId: string, burnTxHash: string): Promise<CrossChainPurchaseIntent> {
  const intent = await requireIntent(intentId);
  const messageHash = await cctpProvider.deriveMessageHash(burnTxHash, intent.sourceDomain);
  await updateCrossChainIntent(intentId, { burnTxHash, messageHash, state: "attesting" });
  return requireIntent(intentId);
}

export async function getIntent(intentId: string): Promise<CrossChainPurchaseIntent | null> {
  return getCrossChainIntent(intentId);
}
