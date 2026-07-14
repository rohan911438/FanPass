import type { Request, Response } from "express";
import type { ListingFilters, SyncTxInput } from "@fanpass/shared";
import { ApiError } from "@/middleware/errorHandler";
import * as marketplaceService from "@/services/marketplaceService";
import { asyncHandler } from "@/utils/asyncHandler";

function parseFilters(query: Request["query"]): ListingFilters {
  const filters: ListingFilters = {};
  if (typeof query.minPrice === "string") filters.minPrice = Number(query.minPrice);
  if (typeof query.maxPrice === "string") filters.maxPrice = Number(query.maxPrice);
  if (typeof query.minTrustScore === "string") filters.minTrustScore = Number(query.minTrustScore);
  if (typeof query.query === "string") filters.query = query.query;
  if (typeof query.sortBy === "string") filters.sortBy = query.sortBy as ListingFilters["sortBy"];
  return filters;
}

export const getListings = asyncHandler(async (req: Request, res: Response) => {
  const listings = await marketplaceService.getListings(parseFilters(req.query));
  res.json(listings);
});

export const getListingDetail = asyncHandler(async (req: Request, res: Response) => {
  const summary = await marketplaceService.getListingDetail(req.params.id);
  res.json(summary);
});

export const getPricingSuggestion = asyncHandler(async (req: Request, res: Response) => {
  const { eventName, venue } = req.query;
  if (typeof eventName !== "string" || typeof venue !== "string") {
    throw new ApiError(400, "eventName and venue query params are required.");
  }
  const suggestion = await marketplaceService.getPricingSuggestion(eventName, venue);
  res.json(suggestion);
});

export const postSync = asyncHandler(async (req: Request, res: Response) => {
  const { txHash, listingId } = req.body as SyncTxInput;
  const result = await marketplaceService.syncFromChain(txHash as `0x${string}`, listingId);
  res.json(result);
});
