import { Router } from "express";
import { getWallet } from "@/controllers/wallet.controller";

export const walletRouter = Router();

walletRouter.get("/:address", getWallet);
