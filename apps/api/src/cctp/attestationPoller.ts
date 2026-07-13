import { cctpProvider } from "@/providers/cctpProvider";
import { listCrossChainIntentsByState, updateCrossChainIntent } from "@/repositories/crossChainIntentRepository";
import { relayAttestedMessage } from "./relayer";
import type { CrossChainPurchaseIntent } from "./types";

async function attemptRelay(intent: CrossChainPurchaseIntent): Promise<void> {
  if (!intent.messageHash) return;
  const attestation = await cctpProvider.fetchAttestation(intent.messageHash);
  if (attestation.status === "complete" && attestation.attestation) {
    await relayAttestedMessage(intent, attestation.attestation);
  }
}

/**
 * One tick: advance every intent currently waiting on Circle's attestation, and retry the mint for any
 * intent that got attested but failed to relay last tick. Per docs/PHASE_5_ECOSYSTEM_INTEGRATION.md
 * §1.10 — past its expiry, an unattested intent is marked failed (a bookkeeping timeout; the underlying
 * burn remains real and mintable per Circle's own guarantee, independent of this app's state).
 */
export async function pollAttestations(): Promise<void> {
  const attesting = await listCrossChainIntentsByState("attesting");
  for (const intent of attesting) {
    if (new Date(intent.expiresAt).getTime() < Date.now()) {
      await updateCrossChainIntent(intent.id, { state: "failed", failureReason: "Attestation window expired." });
      continue;
    }
    try {
      await attemptRelay({ ...intent, state: "attesting" });
    } catch (error) {
      console.error(`[cctp] attestation poll failed for intent ${intent.id}`, error);
    }
  }

  const attested = await listCrossChainIntentsByState("attested");
  for (const intent of attested) {
    try {
      await attemptRelay(intent);
    } catch (error) {
      console.error(`[cctp] relay retry failed for intent ${intent.id}`, error);
    }
  }
}
