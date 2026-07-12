import { z } from "zod";

/** Extended in Phase 3 as the marketplace listing flow is built. */
export const createListingSchema = z.object({
  ticketId: z.string().min(1),
  sellerAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Must be a valid EVM wallet address"),
  askPrice: z.number().positive(),
  currency: z.literal("USDC"),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;
