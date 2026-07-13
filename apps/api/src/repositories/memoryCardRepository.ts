import type { MemoryCard } from "@fanpass/shared";
import { getDb } from "@/config/localStore";

const COLLECTION = "memoryCards";

/** Populated after attendance in Phase 4/6 — naturally empty until then, not seeded fixtures. */
export async function listMemoryCardsByAddress(walletAddress: string): Promise<MemoryCard[]> {
  const snap = await getDb().collection(COLLECTION).where("walletAddress", "==", walletAddress).get();
  return snap.docs.map((d) => d.data() as MemoryCard);
}
