import type { SkillContext, SkillName, SkillResult, WalletAddress } from "@fanpass/shared";
import type { ClaimedTicketFields } from "@/types/agentInputs";

/** The grab-bag of raw inputs a request might supply — each skill picks the fields it needs. */
export interface SkillMaterials {
  ticketId: string;
  claimed?: ClaimedTicketFields;
  claimedSeller?: WalletAddress;
  fileBuffer?: Buffer;
  mimetype?: string;
  eventName?: string;
  venue?: string;
  listingId?: string;
  sellerAddress?: WalletAddress;
  askPrice?: number;
}

export interface Skill<TOutput = unknown> {
  name: SkillName;
  version: string;
  /** Declarative — the Planner calls this to decide inclusion, never hardcodes a skill list itself. */
  appliesTo(context: SkillContext): boolean;
  /** MCP tools this skill needs — informational until Part 3 (M2) wires the tool bus in. */
  requiredTools: string[];
  /** Skills this one depends on, by name — the Planner uses this to build the execution graph. */
  dependsOn: SkillName[];
  execute(materials: SkillMaterials, context: SkillContext): Promise<SkillResult<TOutput>>;
}
