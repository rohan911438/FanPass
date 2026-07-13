import type { OwnershipAgentOutput, QrAgentOutput } from "@fanpass/shared";
import { runOwnershipAgent } from "@/ai/agents/ownership.agent";
import type { Skill } from "./types";

export const ownershipSkill: Skill<OwnershipAgentOutput> = {
  name: "ownership",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "verification",
  requiredTools: ["chain.read"],
  dependsOn: ["qr"],
  async execute(materials, context) {
    if (!materials.claimedSeller) throw new Error("ownership skill requires materials.claimedSeller");
    const qrResult = context.priorResults.qr;
    const duplicateOfTicketId = (qrResult?.output as QrAgentOutput | undefined)?.duplicateOfTicketId ?? null;
    return runOwnershipAgent({
      ticketId: materials.ticketId,
      claimedSeller: materials.claimedSeller,
      duplicateOfTicketId,
    });
  },
};
