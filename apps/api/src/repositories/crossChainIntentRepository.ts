import type { CrossChainPurchaseIntent } from "@/cctp/types";
import { getDb } from "@/config/localStore";

const COLLECTION = "crossChainIntents";

export type NewCrossChainIntentInput = Omit<
  CrossChainPurchaseIntent,
  "state" | "burnTxHash" | "messageHash" | "mintTxHash" | "failureReason" | "createdAt" | "updatedAt"
>;

export async function createCrossChainIntent(input: NewCrossChainIntentInput): Promise<CrossChainPurchaseIntent> {
  const now = new Date().toISOString();
  const intent: CrossChainPurchaseIntent = {
    ...input,
    state: "awaiting_burn",
    burnTxHash: null,
    messageHash: null,
    mintTxHash: null,
    failureReason: null,
    createdAt: now,
    updatedAt: now,
  };
  await getDb().collection(COLLECTION).doc(intent.id).set(intent);
  return intent;
}

export async function getCrossChainIntent(id: string): Promise<CrossChainPurchaseIntent | null> {
  const snap = await getDb().collection(COLLECTION).doc(id).get();
  return snap.exists ? (snap.data() as CrossChainPurchaseIntent) : null;
}

export async function updateCrossChainIntent(id: string, patch: Partial<CrossChainPurchaseIntent>): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(id)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

export async function listCrossChainIntentsByState(
  state: CrossChainPurchaseIntent["state"]
): Promise<CrossChainPurchaseIntent[]> {
  const snap = await getDb().collection(COLLECTION).where("state", "==", state).get();
  return snap.docs.map((d) => d.data() as CrossChainPurchaseIntent);
}
