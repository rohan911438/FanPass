import type { OcrAgentOutput } from "@fanpass/shared";
import { runOcrAgent } from "@/ai/agents/ocr.agent";
import type { Skill } from "./types";

export const ocrSkill: Skill<OcrAgentOutput> = {
  name: "ocr",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "verification",
  requiredTools: ["ocr.extract"],
  dependsOn: [],
  async execute(materials) {
    if (!materials.claimed) throw new Error("ocr skill requires materials.claimed");
    return runOcrAgent({ claimed: materials.claimed });
  },
};
