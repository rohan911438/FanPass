import type { SkillContext, SkillName } from "@fanpass/shared";

export const VERIFICATION_SKILLS: SkillName[] = ["ocr", "metadata", "qr", "fraud", "ownership", "pricing"];

export const ATTENDANCE_SKILLS: SkillName[] = ["transfer"];

/** One entry per Part 2 premium endpoint (docs/PHASE_5_ECOSYSTEM_INTEGRATION.md §2.2). */
export const PREMIUM_SKILLS: Record<string, SkillName[]> = {
  fraud_investigation: ["fraud"],
  image_forensics: ["fraud"],
  ownership_investigation: ["transfer"],
  insurance_eligibility: ["pricing", "sellerReputation", "insurance"],
  legal_verification: ["transfer", "escrowValidation"],
  enterprise_verification: ["fraud", "pricing", "sellerReputation", "insurance", "escrowValidation", "transfer"],
};

/** Data-driven routing — adding a context or skill is a table edit, never a new `if` branch here. */
export function resolveSkillNames(context: SkillContext): SkillName[] {
  switch (context.requestType) {
    case "verification":
      return VERIFICATION_SKILLS;
    case "attendance":
      return ATTENDANCE_SKILLS;
    case "premium":
      return context.premium ? (PREMIUM_SKILLS[context.premium.reportType] ?? []) : [];
    default:
      return [];
  }
}
