import type { NextFunction, Request, Response } from "express";
import { env } from "@/config/env";
import { PREMIUM_ROUTES, type PremiumReportType } from "@/premium/priceMap";
import { verifyPremiumPayment } from "@/services/premiumPaymentService";

function paymentRequiredBody(reportType: PremiumReportType, req: Request, error?: string) {
  const route = PREMIUM_ROUTES[reportType];
  return {
    price: route.priceUsdc,
    currency: "USDC",
    payTo: env.premium.paymentReceiverAddress,
    resource: req.originalUrl,
    network: "injective-testnet",
    ...(error ? { error } : {}),
  };
}

/**
 * Mounted per-route (not globally) — every non-premium route is completely unaffected. No payment proof
 * -> 402 with price/payTo/resource. A proof -> verified on-chain -> next(). A used/invalid proof -> 402
 * again, never re-executed. See docs/PHASE_5_ECOSYSTEM_INTEGRATION.md §2.3/§2.4.
 */
export function x402Middleware(reportType: PremiumReportType) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const txHash = req.header("X-Payment") ?? (req.body as { txHash?: string } | undefined)?.txHash;

    if (!txHash) {
      res.status(402).json(paymentRequiredBody(reportType, req));
      return;
    }

    const result = await verifyPremiumPayment(reportType, txHash, req.header("X-Payer-Address") ?? undefined);
    if (!result.ok) {
      res.status(402).json(paymentRequiredBody(reportType, req, result.reason));
      return;
    }

    (req as Request & { paymentRef?: string }).paymentRef = txHash;
    next();
  };
}
