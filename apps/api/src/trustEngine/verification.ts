import type {
  AgentResult,
  QrAgentOutput,
  SkillContext,
  Ticket,
  VerificationAgentResults,
  VerificationStage,
  WalletAddress,
} from "@fanpass/shared";
import { VERIFICATION_STAGES, hashTicketMetadata, hashVerificationReport, sha256HexToBytes32, ticketIdToTicketKey } from "@fanpass/shared";
import { env } from "@/config/env";
import { runPlanner } from "@/planner/planner";
import { logAgentInvocation } from "@/repositories/agentLogRepository";
import { createOwnershipCertificate } from "@/repositories/ownershipCertificateRepository";
import { updateTicket } from "@/repositories/ticketRepository";
import { upsertTrustScore } from "@/repositories/trustScoreRepository";
import {
  finalizeVerificationReport,
  initVerificationReport,
  recordStageResult,
} from "@/repositories/verificationRepository";
import { computeTrustScore } from "@/trustEngine/scoring";
import { registerTicketOnChain } from "@/web3/ownershipRegistry";

export interface TicketVerificationSubmission {
  ticket: Ticket;
  fileBuffer: Buffer;
  mimetype: string;
}

/**
 * The mandatory choke point for verification (docs/ARCHITECTURE.md §7): runs the AI Orchestrator, writes
 * verificationReports + trustScores, and updates tickets.status. On pass, mints the real Ownership
 * Certificate on-chain (VERIFIER_ROLE, the Trust Engine's own attestation — never a user-signed tx) and
 * mirrors it locally. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §14.
 */
export async function verifyTicket(submission: TicketVerificationSubmission): Promise<void> {
  const { ticket, fileBuffer, mimetype } = submission;

  await initVerificationReport(ticket.ticketId, VERIFICATION_STAGES[0]);

  try {
    await runVerification(ticket, fileBuffer, mimetype);
  } catch (error) {
    console.error(`verifyTicket(${ticket.ticketId}) failed`, error);
    await finalizeVerificationReport(ticket.ticketId, ["verification_error"]);
  }
}

async function runVerification(ticket: Ticket, fileBuffer: Buffer, mimetype: string): Promise<void> {
  const context: SkillContext = { ticketId: ticket.ticketId, requestType: "verification", priorResults: {} };
  const results = await runPlanner(
    {
      ticketId: ticket.ticketId,
      claimed: {
        eventName: ticket.eventName,
        eventDate: ticket.eventDate,
        venue: ticket.venue,
        seatInfo: ticket.seatInfo,
      },
      claimedSeller: ticket.sellerAddress,
      fileBuffer,
      mimetype,
    },
    context,
    async (stage, result) => {
      await recordStageResult(ticket.ticketId, stage as VerificationStage, result as AgentResult<unknown>);
      await logAgentInvocation({
        agentName: result.agent,
        ticketId: ticket.ticketId,
        input: { ticketId: ticket.ticketId, stage },
        output: result.output,
        confidence: result.confidence,
        latencyMs: result.latencyMs,
      });
    }
  );

  const scoring = computeTrustScore(results as VerificationAgentResults);
  await upsertTrustScore("ticket", ticket.ticketId, scoring.score, scoring.breakdown);

  const qrHash = (results.qr?.output as QrAgentOutput | undefined)?.qrHash ?? null;
  await updateTicket(ticket.ticketId, {
    qrHash,
    status: scoring.passed ? "verified" : ticket.status,
  });

  if (scoring.passed) {
    const ticketKey = ticketIdToTicketKey(ticket.ticketId);
    const { tokenId, txHash } = await registerTicketOnChain({
      ticketKey,
      owner: ticket.sellerAddress as WalletAddress,
      verificationHash: hashVerificationReport(results),
      metadataHash: hashTicketMetadata({
        eventName: ticket.eventName,
        venue: ticket.venue,
        eventDate: ticket.eventDate,
        seatInfo: ticket.seatInfo,
      }),
      qrHash: qrHash ? sha256HexToBytes32(qrHash) : ticketKey,
    });

    await updateTicket(ticket.ticketId, { tokenId: tokenId.toString() });
    await createOwnershipCertificate(
      ticket.ticketId,
      ticket.sellerAddress,
      tokenId.toString(),
      env.web3.ownershipRegistryAddress,
      txHash
    );
  }

  await finalizeVerificationReport(ticket.ticketId, scoring.flags);
}
