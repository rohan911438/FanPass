import type { TrustEntityType, TrustScore, TrustScoreBreakdown } from "@fanpass/shared";
import { getDb } from "@/config/firebaseAdmin";

const COLLECTION = "trustScores";

function docId(entityType: TrustEntityType, entityId: string): string {
  return `${entityType}_${entityId}`;
}

export async function upsertTrustScore(
  entityType: TrustEntityType,
  entityId: string,
  score: number,
  breakdown: TrustScoreBreakdown
): Promise<TrustScore> {
  const trustScore: TrustScore = {
    entityType,
    entityId,
    score,
    breakdown,
    updatedAt: new Date().toISOString(),
  };
  await getDb().collection(COLLECTION).doc(docId(entityType, entityId)).set(trustScore);
  return trustScore;
}

export async function getTrustScore(entityType: TrustEntityType, entityId: string): Promise<TrustScore | null> {
  const snap = await getDb().collection(COLLECTION).doc(docId(entityType, entityId)).get();
  return snap.exists ? (snap.data() as TrustScore) : null;
}
