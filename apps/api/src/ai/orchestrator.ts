import type { AgentResult, VerificationAgentResults, VerificationStage, WalletAddress } from "@fanpass/shared";
import { runFraudAgent } from "@/ai/agents/fraud.agent";
import { runMetadataAgent } from "@/ai/agents/metadata.agent";
import { runOcrAgent } from "@/ai/agents/ocr.agent";
import { runOwnershipAgent } from "@/ai/agents/ownership.agent";
import { runPricingAgent } from "@/ai/agents/pricing.agent";
import { runQrAgent } from "@/ai/agents/qr.agent";
import type { ClaimedTicketFields } from "@/types/agentInputs";

export interface RunVerificationInput {
  ticketId: string;
  claimed: ClaimedTicketFields;
  claimedSeller: WalletAddress;
  fileBuffer: Buffer;
  mimetype: string;
}

export type OnStageComplete = (stage: VerificationStage, result: AgentResult<unknown>) => Promise<void>;

/**
 * Sequences the 6 verification-time agents (see docs/ARCHITECTURE.md §6). Agents never call each other
 * directly — any dependency between stages (e.g. Ownership needing the QR Agent's duplicate lookup) is
 * expressed here, by the Orchestrator passing one stage's output into the next stage's input.
 */
export async function runVerificationPipeline(
  input: RunVerificationInput,
  onStageComplete: OnStageComplete
): Promise<VerificationAgentResults> {
  const results: VerificationAgentResults = {};

  const ocr = await runOcrAgent({ claimed: input.claimed });
  results.ocr = ocr;
  await onStageComplete("ocr", ocr);

  const metadata = await runMetadataAgent({ claimed: input.claimed, ocr: ocr.output });
  results.metadata = metadata;
  await onStageComplete("metadata", metadata);

  const qr = await runQrAgent({
    ticketId: input.ticketId,
    fileBuffer: input.fileBuffer,
    mimetype: input.mimetype,
  });
  results.qr = qr;
  await onStageComplete("qr", qr);

  const fraud = await runFraudAgent({ fileBuffer: input.fileBuffer, mimetype: input.mimetype });
  results.fraud = fraud;
  await onStageComplete("fraud", fraud);

  const ownership = await runOwnershipAgent({
    ticketId: input.ticketId,
    claimedSeller: input.claimedSeller,
    duplicateOfTicketId: qr.output.duplicateOfTicketId,
  });
  results.ownership = ownership;
  await onStageComplete("ownership", ownership);

  const pricing = await runPricingAgent({ eventName: input.claimed.eventName, venue: input.claimed.venue });
  results.pricing = pricing;
  await onStageComplete("pricing", pricing);

  return results;
}
