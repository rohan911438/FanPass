import type { QrAgentOutput } from "@fanpass/shared";
import { runQrAgent } from "@/ai/agents/qr.agent";
import type { Skill } from "./types";

export const qrSkill: Skill<QrAgentOutput> = {
  name: "qr",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "verification",
  requiredTools: ["qr.decode"],
  dependsOn: [],
  async execute(materials) {
    if (!materials.fileBuffer || !materials.mimetype) {
      throw new Error("qr skill requires materials.fileBuffer/mimetype");
    }
    return runQrAgent({ ticketId: materials.ticketId, fileBuffer: materials.fileBuffer, mimetype: materials.mimetype });
  },
};
