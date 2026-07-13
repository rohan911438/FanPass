import { cctpProvider } from "@/providers/cctpProvider";
import { updateCrossChainIntent } from "@/repositories/crossChainIntentRepository";
import type { CrossChainPurchaseIntent } from "./types";

/**
 * Calls the permissionless MessageTransmitter.receiveMessage step — anyone holding a valid Circle
 * attestation may submit it, so this needs no special on-chain role (see the Context note in
 * docs/PHASE_5_ECOSYSTEM_INTEGRATION.md's implementation plan on why no RELAYER_ROLE was added).
 * Retry-safe: a failure here falls the intent back to "attested" so the next poll tick retries the mint,
 * never "attesting" (the attestation itself doesn't need to be re-fetched).
 */
export async function relayAttestedMessage(intent: CrossChainPurchaseIntent, attestation: string): Promise<void> {
  if (!intent.messageHash) throw new Error(`Intent ${intent.id} has no messageHash to relay`);

  await updateCrossChainIntent(intent.id, { state: "minting" });
  try {
    const mintTxHash = await cctpProvider.receiveMessage(intent.messageHash, attestation);
    await updateCrossChainIntent(intent.id, { state: "minted", mintTxHash });
  } catch (error) {
    await updateCrossChainIntent(intent.id, {
      state: "attested",
      failureReason: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
