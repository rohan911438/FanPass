import { getTransactionCount } from "wagmi/actions";
import { wagmiConfig } from "@/lib/web3/config";

/**
 * eth_getTransactionReceipt on the Injective Testnet RPC is served inconsistently (load-balanced, no
 * session affinity — see apps/api/src/web3/client.ts and escrowMarketplace.ts for the same issue hit
 * server-side): a tx can be genuinely mined, with the sender's nonce already advanced, while
 * getTransactionReceipt/getTransaction on that exact hash still 404s for well over a minute. Confirming
 * by polling the sender's nonce instead (like the backend's waitForNonceToPass) sidesteps that entirely,
 * since account-state reads are reliable even when by-hash tx lookups aren't.
 */
const NONCE_POLL_INTERVAL_MS = 2_000;
const NONCE_POLL_ATTEMPTS = 60; // 2 minutes

export async function getPendingNonce(address: `0x${string}`): Promise<number> {
  return getTransactionCount(wagmiConfig, { address, blockTag: "pending" });
}

export async function waitForNonceToPass(address: `0x${string}`, priorNonce: number): Promise<void> {
  for (let attempt = 1; attempt <= NONCE_POLL_ATTEMPTS; attempt++) {
    const current = await getTransactionCount(wagmiConfig, { address, blockTag: "latest" });
    if (current > priorNonce) return;
    await new Promise((resolve) => setTimeout(resolve, NONCE_POLL_INTERVAL_MS));
  }
  throw new Error(`Transaction from ${address} never confirmed (nonce still ${priorNonce}) after ${NONCE_POLL_ATTEMPTS} polls.`);
}
