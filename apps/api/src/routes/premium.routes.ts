import { Router } from "express";
import {
  getEnterpriseVerification,
  getFraudInvestigation,
  getImageForensics,
  getInsuranceEligibility,
  getLegalVerification,
  getOwnershipInvestigation,
} from "@/controllers/premium.controller";
import { x402Middleware } from "@/middleware/x402";
import { PREMIUM_ROUTES } from "@/premium/priceMap";

export const premiumRouter = Router();

premiumRouter.post(
  PREMIUM_ROUTES.fraud_investigation.path,
  x402Middleware("fraud_investigation"),
  getFraudInvestigation
);
premiumRouter.post(PREMIUM_ROUTES.image_forensics.path, x402Middleware("image_forensics"), getImageForensics);
premiumRouter.post(
  PREMIUM_ROUTES.ownership_investigation.path,
  x402Middleware("ownership_investigation"),
  getOwnershipInvestigation
);
premiumRouter.post(
  PREMIUM_ROUTES.insurance_eligibility.path,
  x402Middleware("insurance_eligibility"),
  getInsuranceEligibility
);
premiumRouter.post(
  PREMIUM_ROUTES.legal_verification.path,
  x402Middleware("legal_verification"),
  getLegalVerification
);
premiumRouter.post(
  PREMIUM_ROUTES.enterprise_verification.path,
  x402Middleware("enterprise_verification"),
  getEnterpriseVerification
);
