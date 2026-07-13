import { Router } from "express";
import { healthRouter } from "@/routes/health.routes";
import { ticketsRouter } from "@/routes/tickets.routes";

export const apiRouter = Router();
apiRouter.use("/health", healthRouter);
apiRouter.use("/tickets", ticketsRouter);

// v1 resource routers (marketplace, wallet, trust, attendance, premium) are added from Phase 3
// onward — see docs/ARCHITECTURE.md §5.
