import type { Request, Response } from "express";
import type { SkillContext } from "@fanpass/shared";
import { ApiError } from "@/middleware/errorHandler";
import type { PremiumReportType } from "@/premium/priceMap";
import { runPlanner } from "@/planner/planner";
import { findActiveListingByTicketId } from "@/repositories/listingRepository";
import { getTicketById } from "@/repositories/ticketRepository";
import type { SkillMaterials } from "@/skills/types";
import { asyncHandler } from "@/utils/asyncHandler";

function averageConfidence(results: Record<string, { confidence: number } | undefined>): number {
  const values = Object.values(results).filter((r): r is { confidence: number } => Boolean(r));
  if (values.length === 0) return 0;
  return Number((values.reduce((sum, r) => sum + r.confidence, 0) / values.length).toFixed(2));
}

function makePremiumHandler(reportType: PremiumReportType) {
  return asyncHandler(async (req: Request, res: Response) => {
    const { ticketId } = req.params;
    const ticket = await getTicketById(ticketId);
    if (!ticket) throw new ApiError(404, `Ticket not found: ${ticketId}`);

    const listing = await findActiveListingByTicketId(ticketId);
    const sellerAddress = listing?.sellerAddress ?? ticket.sellerAddress;
    const paymentRef = (req as Request & { paymentRef?: string }).paymentRef ?? "unknown";

    // Premium reports run against an already-verified ticket, not a fresh upload — Fraud Detection's
    // deterministic seed reuses the ticket's already-computed qrHash rather than re-reading the original
    // image bytes (image.forensics itself is still a stub either way; see mcp/tools/image.forensics.ts).
    const syntheticBytes = Buffer.from(ticket.qrHash ?? ticket.ticketId);

    const materials: SkillMaterials = {
      ticketId,
      eventName: ticket.eventName,
      venue: ticket.venue,
      sellerAddress,
      listingId: listing?.listingId,
      askPrice: listing?.askPrice,
      fileBuffer: syntheticBytes,
      mimetype: "application/octet-stream",
    };

    const context: SkillContext = {
      ticketId,
      requestType: "premium",
      premium: { reportType, paymentRef },
      priorResults: {},
    };

    res.writeHead(200, { "Content-Type": "application/x-ndjson" });

    const results = await runPlanner(materials, context, (name, result) => {
      res.write(`${JSON.stringify({ type: "progress", skill: name, flags: result.flags })}\n`);
    });

    const findings = Object.fromEntries(Object.entries(results).map(([name, result]) => [name, result?.output]));

    res.write(
      `${JSON.stringify({
        type: "result",
        data: {
          ticketId,
          reportType,
          generatedAt: new Date().toISOString(),
          paymentRef,
          findings,
          confidence: averageConfidence(results),
        },
      })}\n`
    );
    res.end();
  });
}

export const getFraudInvestigation = makePremiumHandler("fraud_investigation");
export const getImageForensics = makePremiumHandler("image_forensics");
export const getOwnershipInvestigation = makePremiumHandler("ownership_investigation");
export const getInsuranceEligibility = makePremiumHandler("insurance_eligibility");
export const getLegalVerification = makePremiumHandler("legal_verification");
export const getEnterpriseVerification = makePremiumHandler("enterprise_verification");
