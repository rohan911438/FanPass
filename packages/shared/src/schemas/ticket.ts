import { z } from "zod";

/**
 * Upload form (apps/web) and the verify controller (apps/api) both validate against this schema —
 * one definition, enforced on both ends. Extended in Phase 2 as the verify flow is built.
 */
export const ticketUploadSchema = z.object({
  eventName: z.string().min(2).max(120),
  eventDate: z.iso.datetime(),
  venue: z.string().min(2).max(120),
  seatInfo: z.string().max(60).optional(),
  sellerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM wallet address"),
});

export type TicketUploadInput = z.infer<typeof ticketUploadSchema>;
