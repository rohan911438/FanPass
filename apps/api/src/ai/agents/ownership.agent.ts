import type { AgentResult, OwnershipAgentOutput } from "@fanpass/shared";
import { getOwnershipCertificateByTicketId } from "@/repositories/ownershipCertificateRepository";
import type { OwnershipAgentInput } from "@/types/agentInputs";

/**
 * Real agent: cross-checks the claimed seller against the current Firestore ownership state (no chain
 * yet — contracts land in Phase 4). Depends on the QR Agent's duplicate lookup, which the Orchestrator
 * passes in as `duplicateOfTicketId`; agents never call each other directly.
 */
export async function runOwnershipAgent(input: OwnershipAgentInput): Promise<AgentResult<OwnershipAgentOutput>> {
  const start = Date.now();
  const isFirstVerification = input.duplicateOfTicketId === null;

  let currentOwnerOnRecord: string | null = null;
  let sellerMatchesOwner = true;

  if (!isFirstVerification && input.duplicateOfTicketId) {
    const cert = await getOwnershipCertificateByTicketId(input.duplicateOfTicketId);
    if (cert) {
      currentOwnerOnRecord = cert.currentOwner;
      sellerMatchesOwner = cert.currentOwner.toLowerCase() === input.claimedSeller.toLowerCase();
    }
  }

  const output: OwnershipAgentOutput = {
    claimedSeller: input.claimedSeller,
    currentOwnerOnRecord,
    sellerMatchesOwner,
    isFirstVerification,
  };

  const flags = sellerMatchesOwner ? [] : ["seller_mismatch"];

  return {
    agent: "ownership",
    confidence: sellerMatchesOwner ? 0.95 : 0.3,
    output,
    flags,
    latencyMs: Date.now() - start,
  };
}
