import { Router } from "express";
import { healthRouter } from "@/routes/health.routes";

export const apiRouter = Router();
apiRouter.use("/health", healthRouter);

// v1 resource routers (tickets, marketplace, wallet, trust, attendance, premium) are added
// from Phase 2 onward — see docs/ARCHITECTURE.md §5.
