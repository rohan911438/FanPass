export type PremiumReportType =
  | "fraud_investigation"
  | "image_forensics"
  | "ownership_investigation"
  | "insurance_eligibility"
  | "legal_verification"
  | "enterprise_verification";

export interface PremiumRoute {
  reportType: PremiumReportType;
  path: string; // relative to /api/v1/premium
  priceUsdc: number;
  label: string;
}

/** docs/PHASE_5_ECOSYSTEM_INTEGRATION.md §2.2 — one flat price per request, no metering, no subscription. */
export const PREMIUM_ROUTES: Record<PremiumReportType, PremiumRoute> = {
  fraud_investigation: {
    reportType: "fraud_investigation",
    path: "/fraud-investigation/:ticketId",
    priceUsdc: 5,
    label: "Deep Fraud Investigation",
  },
  image_forensics: {
    reportType: "image_forensics",
    path: "/image-forensics/:ticketId",
    priceUsdc: 3,
    label: "AI Image Forensics",
  },
  ownership_investigation: {
    reportType: "ownership_investigation",
    path: "/ownership-investigation/:ticketId",
    priceUsdc: 4,
    label: "Ownership Investigation",
  },
  insurance_eligibility: {
    reportType: "insurance_eligibility",
    path: "/insurance-eligibility/:ticketId",
    priceUsdc: 2,
    label: "Insurance Eligibility Report",
  },
  legal_verification: {
    reportType: "legal_verification",
    path: "/legal-verification/:ticketId",
    priceUsdc: 8,
    label: "Legal Verification Report",
  },
  enterprise_verification: {
    reportType: "enterprise_verification",
    path: "/enterprise-verification/:ticketId",
    priceUsdc: 15,
    label: "Enterprise Verification API",
  },
};
