import type { SkillName } from "@fanpass/shared";
import { escrowValidationSkill } from "@/skills/escrowValidation.skill";
import { fraudSkill } from "@/skills/fraud.skill";
import { insuranceSkill } from "@/skills/insurance.skill";
import { metadataSkill } from "@/skills/metadata.skill";
import { ocrSkill } from "@/skills/ocr.skill";
import { ownershipSkill } from "@/skills/ownership.skill";
import { pricingSkill } from "@/skills/pricing.skill";
import { qrSkill } from "@/skills/qr.skill";
import { reputationSkill } from "@/skills/reputation.skill";
import { transferSkill } from "@/skills/transfer.skill";
import type { Skill } from "@/skills/types";

export const skillRegistry: Partial<Record<SkillName, Skill<unknown>>> = {
  ocr: ocrSkill as Skill<unknown>,
  qr: qrSkill as Skill<unknown>,
  metadata: metadataSkill as Skill<unknown>,
  fraud: fraudSkill as Skill<unknown>,
  ownership: ownershipSkill as Skill<unknown>,
  pricing: pricingSkill as Skill<unknown>,
  sellerReputation: reputationSkill as Skill<unknown>,
  escrowValidation: escrowValidationSkill as Skill<unknown>,
  insurance: insuranceSkill as Skill<unknown>,
  transfer: transferSkill as Skill<unknown>,
};
