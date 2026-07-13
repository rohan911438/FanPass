import type { Request, Response } from "express";
import type { BuyListingInput, CancelListingInput, CreateListingInput, ListingFilters, WalletAddress } from "@fanpass/shared";
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

export const postListing = asyncHandler(async (req: Request, res: Response) => {
  const listing = await marketplaceService.createListing(req.body as CreateListingInput);
  res.status(201).json(listing);
});

export const getListings = asyncHandler(async (req: Request, res: Response) => {
  const listings = await marketplaceService.getListings(parseFilters(req.query));
  res.json(listings);
});

export const getListingDetail = asyncHandler(async (req: Request, res: Response) => {
  const summary = await marketplaceService.getListingDetail(req.params.id);
  res.json(summary);
});

export const postBuyListing = asyncHandler(async (req: Request, res: Response) => {
  const { buyerAddress } = req.body as BuyListingInput;
  const result = await marketplaceService.buyListing(req.params.id, buyerAddress as WalletAddress);
  res.json(result);
});

export const postCancelListing = asyncHandler(async (req: Request, res: Response) => {
  const { sellerAddress } = req.body as CancelListingInput;
  const listing = await marketplaceService.cancelListing(req.params.id, sellerAddress as WalletAddress);
  res.json(listing);
});
