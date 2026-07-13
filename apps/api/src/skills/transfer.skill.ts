import type { TransferAgentOutput } from "@fanpass/shared";
import { getOwnershipCertificateByTicketId } from "@/repositories/ownershipCertificateRepository";
import type { Skill } from "./types";

/** Ticket Timeline: full chain-of-custody trace, from the ownership certificate's history. */
export const transferSkill: Skill<TransferAgentOutput> = {
  name: "transfer",
  version: "1.0.0",
  appliesTo: (context) => context.requestType === "premium" || context.requestType === "attendance",
  requiredTools: ["chain.read"],
  dependsOn: [],
  async execute(materials) {
    const start = Date.now();
    const cert = await getOwnershipCertificateByTicketId(materials.ticketId);
    const history = cert?.history ?? [];
    const events: TransferAgentOutput["events"] = history.map((entry, index) => ({
      type: index === 0 ? "minted" : "transferred",
      from: index === 0 ? null : history[index - 1].walletAddress,
      to: entry.walletAddress,
      txHash: entry.txHash,
      timestamp: entry.timestamp,
    }));

    return {
      agent: "transfer",
      confidence: cert ? 0.95 : 0.3,
      output: { events, transferEligible: events.length > 0 },
      flags: cert ? [] : ["no_ownership_certificate"],
      latencyMs: Date.now() - start,
    };
  },
};
