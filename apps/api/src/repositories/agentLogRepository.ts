import type { AgentName } from "@fanpass/shared";
import { getDb } from "@/config/firebaseAdmin";

const COLLECTION = "agentLogs";

export interface AgentLogEntry {
  agentName: AgentName;
  ticketId?: string;
  input: unknown;
  output: unknown;
  confidence: number;
  latencyMs: number;
}

export async function logAgentInvocation(entry: AgentLogEntry): Promise<void> {
  const ref = getDb().collection(COLLECTION).doc();
  await ref.set({ ...entry, logId: ref.id, createdAt: new Date().toISOString() });
}
