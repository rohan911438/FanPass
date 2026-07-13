import type { Request, Response } from "express";
import { walletAddressSchema, type WalletAddress } from "@fanpass/shared";
import { ApiError } from "@/middleware/errorHandler";
import { getWalletSummary } from "@/services/walletService";
import { asyncHandler } from "@/utils/asyncHandler";

export const getWallet = asyncHandler(async (req: Request, res: Response) => {
  const parsed = walletAddressSchema.safeParse(req.params.address);
  if (!parsed.success) throw new ApiError(400, "Invalid wallet address.");

  const summary = await getWalletSummary(parsed.data as WalletAddress);
  res.json(summary);
});
