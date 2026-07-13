import type { Ticket, TicketUploadInput, VerificationProgress } from "@fanpass/shared";
import { uploadTicketFile } from "@/repositories/storageRepository";
import { createTicket, generateTicketId, getTicketById } from "@/repositories/ticketRepository";
import { getTrustScore } from "@/repositories/trustScoreRepository";
import { getVerificationReport } from "@/repositories/verificationRepository";
import { ApiError } from "@/middleware/errorHandler";
import { verifyTicket } from "@/trustEngine/verification";

export interface UploadedFile {
  buffer: Buffer;
  mimetype: string;
}

export async function uploadTicket(input: TicketUploadInput, file: UploadedFile): Promise<Ticket> {
  const ticketId = generateTicketId();
  const { imageUrl } = await uploadTicketFile(ticketId, file.buffer, file.mimetype);

  const ticket = await createTicket({
    ticketId,
    eventName: input.eventName,
    eventDate: input.eventDate,
    venue: input.venue,
    seatInfo: input.seatInfo,
    sellerAddress: input.sellerAddress as Ticket["sellerAddress"],
    imageUrl,
  });

  // Fire-and-forget: the client watches progress via getVerificationProgress polling, not this response.
  void verifyTicket({ ticket, fileBuffer: file.buffer, mimetype: file.mimetype }).catch((error) => {
    console.error(`Background verification failed for ${ticketId}`, error);
  });

  return ticket;
}

export async function getTicket(ticketId: string): Promise<Ticket> {
  const ticket = await getTicketById(ticketId);
  if (!ticket) throw new ApiError(404, `Ticket not found: ${ticketId}`);
  return ticket;
}

export async function getVerificationProgress(ticketId: string): Promise<VerificationProgress> {
  const [ticket, report, trustScore] = await Promise.all([
    getTicketById(ticketId),
    getVerificationReport(ticketId),
    getTrustScore("ticket", ticketId),
  ]);

  if (!ticket) throw new ApiError(404, `Ticket not found: ${ticketId}`);
  if (!report) throw new ApiError(404, `Verification not started for ticket: ${ticketId}`);

  return {
    ticketId,
    ticketStatus: ticket.status,
    stage: report.stage as VerificationProgress["stage"],
    completedStages: report.completedStages as VerificationProgress["completedStages"],
    agentResults: report.agentResults as VerificationProgress["agentResults"],
    flags: report.flags,
    trustScore: report.stage === "complete" ? (trustScore ?? null) : null,
  };
}
