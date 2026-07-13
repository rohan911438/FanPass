import { Router } from "express";
import { healthRouter } from "@/routes/health.routes";
import { marketplaceRouter } from "@/routes/marketplace.routes";
import { ticketsRouter } from "@/routes/tickets.routes";
import { walletRouter } from "@/routes/wallet.routes";

export const apiRouter = Router();
apiRouter.use("/health", healthRouter);
apiRouter.use("/tickets", ticketsRouter);
apiRouter.use("/marketplace", marketplaceRouter);
apiRouter.use("/wallet", walletRouter);

// v1 resource routers (trust, attendance, premium) are added from Phase 4/5 onward — see
// docs/ARCHITECTURE.md §5.
