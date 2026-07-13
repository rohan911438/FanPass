import type { MetadataAgentOutput, OcrAgentOutput } from "@fanpass/shared";
import { runMetadataAgent } from "@/ai/agents/metadata.agent";
import type { Skill } from "./types";

export const metadataSkill: Skill<MetadataAgentOutput> = {
  name: "metadata",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "verification",
  requiredTools: ["metadata.lookup"],
  dependsOn: ["ocr"],
  async execute(materials, context) {
    if (!materials.claimed) throw new Error("metadata skill requires materials.claimed");
    const ocrResult = context.priorResults.ocr;
    if (!ocrResult) throw new Error("metadata skill requires the ocr skill to have run first");
    return runMetadataAgent({ claimed: materials.claimed, ocr: ocrResult.output as OcrAgentOutput });
  },
};
