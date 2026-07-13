import type { QrAgentOutput, Ticket } from "@fanpass/shared";
import { VERIFICATION_STAGES } from "@fanpass/shared";
import { runVerificationPipeline } from "@/ai/orchestrator";
import { logAgentInvocation } from "@/repositories/agentLogRepository";
import { createMockOwnershipCertificate } from "@/repositories/ownershipCertificateRepository";
import { updateTicket } from "@/repositories/ticketRepository";
import { upsertTrustScore } from "@/repositories/trustScoreRepository";
import {
  finalizeVerificationReport,
  initVerificationReport,
  recordStageResult,
} from "@/repositories/verificationRepository";
import { computeTrustScore } from "@/trustEngine/scoring";

export interface TicketVerificationSubmission {
  ticket: Ticket;
  fileBuffer: Buffer;
  mimetype: string;
}

/**
 * The mandatory choke point for verification (docs/ARCHITECTURE.md §7): runs the AI Orchestrator, writes
 * verificationReports + trustScores, and updates tickets.status — the only place all three meet. On
 * pass, writes a mocked ownershipCertificates record (real OwnershipRegistry.sol mint is Phase 4).
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
  const results = await runVerificationPipeline(
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
    async (stage, result) => {
      await recordStageResult(ticket.ticketId, stage, result);
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

  const scoring = computeTrustScore(results);
  await upsertTrustScore("ticket", ticket.ticketId, scoring.score, scoring.breakdown);

  const qrHash = (results.qr?.output as QrAgentOutput | undefined)?.qrHash ?? null;
  await updateTicket(ticket.ticketId, {
    qrHash,
    status: scoring.passed ? "verified" : ticket.status,
  });

  if (scoring.passed) {
    await createMockOwnershipCertificate(ticket.ticketId, ticket.sellerAddress);
  }

  await finalizeVerificationReport(ticket.ticketId, scoring.flags);
}
