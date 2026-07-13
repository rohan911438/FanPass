import { Router } from "express";
import { buyListingSchema, cancelListingSchema, createListingSchema } from "@fanpass/shared";
import {
  getListingDetail,
  getListings,
  postBuyListing,
  postCancelListing,
  postListing,
} from "@/controllers/marketplace.controller";
import { validate } from "@/validators/validate";

export const marketplaceRouter = Router();

marketplaceRouter.post("/", validate(createListingSchema), postListing);
marketplaceRouter.get("/", getListings);
marketplaceRouter.get("/:id", getListingDetail);
marketplaceRouter.post("/:id/buy", validate(buyListingSchema), postBuyListing);
marketplaceRouter.post("/:id/cancel", validate(cancelListingSchema), postCancelListing);
