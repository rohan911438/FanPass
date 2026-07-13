import type { AgentResult, VerificationReport, VerificationStage } from "@fanpass/shared";
import { FieldValue, getDb } from "@/config/localStore";

const COLLECTION = "verificationReports";

export async function initVerificationReport(ticketId: string, firstStage: VerificationStage): Promise<void> {
  const now = new Date().toISOString();
  const report: VerificationReport = {
    ticketId,
    stage: firstStage,
    completedStages: [],
    agentResults: {},
    flags: [],
    createdAt: now,
    updatedAt: now,
  };
  await getDb().collection(COLLECTION).doc(ticketId).set(report);
}

export async function recordStageResult(
  ticketId: string,
  stage: VerificationStage,
  result: AgentResult<unknown>
): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(ticketId)
    .update({
      [`agentResults.${stage}`]: result,
      completedStages: FieldValue.arrayUnion(stage),
      stage,
      updatedAt: new Date().toISOString(),
    });
}

export async function finalizeVerificationReport(ticketId: string, flags: string[]): Promise<void> {
  await getDb().collection(COLLECTION).doc(ticketId).update({
    stage: "complete",
    flags,
    updatedAt: new Date().toISOString(),
  });
}

export async function getVerificationReport(ticketId: string): Promise<VerificationReport | null> {
  const snap = await getDb().collection(COLLECTION).doc(ticketId).get();
  return snap.exists ? (snap.data() as VerificationReport) : null;
}
