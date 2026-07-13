import { Router } from "express";
import { healthRouter } from "@/routes/health.routes";
import { marketplaceRouter } from "@/routes/marketplace.routes";
import { premiumRouter } from "@/routes/premium.routes";
import { ticketsRouter } from "@/routes/tickets.routes";
import { walletRouter } from "@/routes/wallet.routes";

export const apiRouter = Router();
apiRouter.use("/health", healthRouter);
apiRouter.use("/tickets", ticketsRouter);
apiRouter.use("/marketplace", marketplaceRouter);
apiRouter.use("/wallet", walletRouter);
apiRouter.use("/premium", premiumRouter);

// v1 resource routers (trust, attendance) are added from Phase 6 onward — see docs/ARCHITECTURE.md §5.
