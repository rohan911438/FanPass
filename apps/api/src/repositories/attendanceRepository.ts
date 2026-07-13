import type { Attendance } from "@fanpass/shared";
import { getDb } from "@/config/firebaseAdmin";

const COLLECTION = "attendance";

/** Populated by real venue check-in in Phase 4/6 — naturally empty until then, not seeded fixtures. */
export async function listAttendanceByAddress(walletAddress: string): Promise<Attendance[]> {
  const snap = await getDb().collection(COLLECTION).where("walletAddress", "==", walletAddress).get();
  return snap.docs.map((d) => d.data() as Attendance);
}
