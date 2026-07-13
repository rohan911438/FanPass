import { Router } from "express";
import {
  getCrossChainIntentStatus,
  postConfirmBurn,
  postCreateCrossChainIntent,
} from "@/controllers/crossChainPurchase.controller";

/** Mounted at /marketplace/:id/buy/cross-chain — see docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 1. */
export const crossChainPurchaseRouter = Router({ mergeParams: true });

crossChainPurchaseRouter.post("/", postCreateCrossChainIntent);
crossChainPurchaseRouter.post("/:intentId/confirm-burn", postConfirmBurn);
crossChainPurchaseRouter.get("/:intentId", getCrossChainIntentStatus);
