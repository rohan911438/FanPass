import type { Ticket, TicketUploadInput, VerificationProgress } from "@fanpass/shared";
import { apiGet, apiPostFormData } from "@/lib/api/client";

export interface UploadTicketInput extends TicketUploadInput {
  file: File;
}

export async function uploadTicket(input: UploadTicketInput): Promise<Ticket> {
  const formData = new FormData();
  formData.set("eventName", input.eventName);
  formData.set("eventDate", input.eventDate);
  formData.set("venue", input.venue);
  if (input.seatInfo) formData.set("seatInfo", input.seatInfo);
  formData.set("sellerAddress", input.sellerAddress);
  formData.set("ticketFile", input.file);

  return apiPostFormData<Ticket>("/tickets", formData);
}

export async function getTicket(ticketId: string): Promise<Ticket> {
  return apiGet<Ticket>(`/tickets/${ticketId}`);
}

export async function getVerificationProgress(ticketId: string): Promise<VerificationProgress> {
  return apiGet<VerificationProgress>(`/tickets/${ticketId}/verification`);
}
