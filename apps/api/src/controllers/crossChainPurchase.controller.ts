import type { Request, Response } from "express";
import type { CctpSourceChain, WalletAddress } from "@fanpass/shared";
import * as crossChainPurchaseService from "@/cctp/crossChainPurchaseService";
import { ApiError } from "@/middleware/errorHandler";
import { getListingById } from "@/repositories/listingRepository";
import { asyncHandler } from "@/utils/asyncHandler";

export const postCreateCrossChainIntent = asyncHandler(async (req: Request, res: Response) => {
  const { buyerAddress, sourceChain } = req.body as { buyerAddress: WalletAddress; sourceChain: CctpSourceChain };
  const listing = await getListingById(req.params.id);
  if (!listing) throw new ApiError(404, `Listing not found: ${req.params.id}`);
  if (listing.status !== "active") throw new ApiError(400, `Listing is not active (status: ${listing.status}).`);

  const intent = await crossChainPurchaseService.createIntent({
    listingId: listing.listingId,
    buyerAddress,
    sourceChain,
    askPrice: listing.askPrice,
  });
  res.status(201).json(intent);
});

export const postConfirmBurn = asyncHandler(async (req: Request, res: Response) => {
  const { txHash } = req.body as { txHash: string };
  const intent = await crossChainPurchaseService.confirmBurn(req.params.intentId, txHash);
  res.json(intent);
});

export const getCrossChainIntentStatus = asyncHandler(async (req: Request, res: Response) => {
  const intent = await crossChainPurchaseService.getIntent(req.params.intentId);
  if (!intent) throw new ApiError(404, `Cross-chain intent not found: ${req.params.intentId}`);
  res.json(intent);
});
