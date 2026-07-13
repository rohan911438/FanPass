import { z } from "zod";
import { walletAddressSchema } from "./common";

export const createListingSchema = z.object({
  ticketId: z.string().min(1),
  sellerAddress: walletAddressSchema,
  askPrice: z.number().positive(),
  currency: z.literal("USDC"),
});

export type CreateListingInput = z.infer<typeof createListingSchema>;

export const buyListingSchema = z.object({
  buyerAddress: walletAddressSchema,
});

export type BuyListingInput = z.infer<typeof buyListingSchema>;

export const cancelListingSchema = z.object({
  sellerAddress: walletAddressSchema,
});

export type CancelListingInput = z.infer<typeof cancelListingSchema>;
