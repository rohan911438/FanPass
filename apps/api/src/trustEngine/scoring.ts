import type {
  FraudAgentOutput,
  MetadataAgentOutput,
  OcrAgentOutput,
  OwnershipAgentOutput,
  PricingAgentOutput,
  QrAgentOutput,
  TrustScoreBreakdown,
  VerificationAgentResults,
} from "@fanpass/shared";

export const VERIFIED_THRESHOLD = 70;

export interface ScoringResult {
  score: number;
  breakdown: TrustScoreBreakdown;
  flags: string[];
  /** True only when the ticket should transition to "verified" — critical failures block this outright. */
  passed: boolean;
  /** A duplicate hash, seller mismatch, or heavy tampering — not just a borderline score. */
  criticalFailure: boolean;
}

/**
 * Pure aggregation of the 6 verification agents into the Trust Score card's badge breakdown + number.
 * No I/O here — trustEngine/verification.ts is the only caller, and only it touches repositories.
 */
export function computeTrustScore(results: VerificationAgentResults): ScoringResult {
  const ocr = results.ocr?.output as OcrAgentOutput | undefined;
  const metadata = results.metadata?.output as MetadataAgentOutput | undefined;
  const qr = results.qr?.output as QrAgentOutput | undefined;
  const fraud = results.fraud?.output as FraudAgentOutput | undefined;
  const ownership = results.ownership?.output as OwnershipAgentOutput | undefined;
  const pricing = results.pricing?.output as PricingAgentOutput | undefined;

  const flags = new Set<string>();
  for (const result of Object.values(results)) {
    result?.flags.forEach((flag: string) => flags.add(flag));
  }

  const verifiedQr = qr?.decoded === true;
  const noDuplicate = qr?.duplicateFound === false;
  const verifiedSeller = ownership?.sellerMatchesOwner === true;
  const fairPrice = pricing?.compsFound === true;
  const lowFraudRisk = (fraud?.tamperScore ?? 1) < 0.5 && fraud?.screenshotDetected !== true;
  const transferEligible = verifiedSeller && noDuplicate && lowFraudRisk;

  const breakdown: TrustScoreBreakdown = {
    verifiedQr,
    verifiedSeller,
    noDuplicate,
    fairPrice,
    transferEligible,
    lowFraudRisk,
  };

  let score = 100;
  if (!verifiedQr) score -= 15;
  if (!noDuplicate) score -= 35;
  if (!verifiedSeller) score -= 25;
  if (fraud) score -= Math.round(fraud.tamperScore * 40);
  if (fraud?.screenshotDetected) score -= 10;
  if (!fairPrice) score -= 5;
  if (ocr && !ocr.fieldsMatchClaim) score -= 5;
  if (metadata && !metadata.fixtureRecognized) score -= 10;
  score = Math.max(0, Math.min(100, score));

  const criticalFailure = !noDuplicate || !verifiedSeller || (fraud?.tamperScore ?? 0) > 0.7;
  if (criticalFailure) score = Math.min(score, 40);

  const passed = !criticalFailure && score >= VERIFIED_THRESHOLD;

  return { score, breakdown, flags: Array.from(flags), passed, criticalFailure };
}
