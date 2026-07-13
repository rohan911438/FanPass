import { Router } from "express";
import { syncTxSchema } from "@fanpass/shared";
import { getListingDetail, getListings, getPricingSuggestion, postSync } from "@/controllers/marketplace.controller";
import { validate } from "@/validators/validate";

export const marketplaceRouter = Router();

marketplaceRouter.get("/", getListings);
marketplaceRouter.get("/pricing-suggestion", getPricingSuggestion);
marketplaceRouter.get("/:id", getListingDetail);
marketplaceRouter.post("/sync", validate(syncTxSchema), postSync);
