import type { FraudAgentOutput } from "@fanpass/shared";
import { runFraudAgent } from "@/ai/agents/fraud.agent";
import type { Skill } from "./types";

const PREMIUM_REPORT_TYPES = new Set(["fraud_investigation", "image_forensics", "enterprise_verification"]);

export const fraudSkill: Skill<FraudAgentOutput> = {
  name: "fraud",
  version: "1.0.0",
  appliesTo: (context) =>
    context.requestType === "verification" ||
    (context.requestType === "premium" && PREMIUM_REPORT_TYPES.has(context.premium?.reportType ?? "")),
  requiredTools: ["fraud.dbLookup"],
  dependsOn: [],
  async execute(materials) {
    if (!materials.fileBuffer || !materials.mimetype) {
      throw new Error("fraud skill requires materials.fileBuffer/mimetype");
    }
    return runFraudAgent({ fileBuffer: materials.fileBuffer, mimetype: materials.mimetype });
  },
};
