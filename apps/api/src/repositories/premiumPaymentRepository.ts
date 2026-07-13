import { getDb } from "@/config/localStore";

const COLLECTION = "premiumPayments";

export interface PremiumPaymentRecord {
  txHash: string;
  reportType: string;
  payer: string;
  amount: number; // display USDC
  usedAt: string;
}

/** Keyed by tx hash — one payment authorizes exactly one execution (the x402 replay guard). */
export async function findPremiumPaymentByTxHash(txHash: string): Promise<PremiumPaymentRecord | null> {
  const snap = await getDb().collection(COLLECTION).doc(txHash.toLowerCase()).get();
  return snap.exists ? (snap.data() as PremiumPaymentRecord) : null;
}

export async function recordPremiumPayment(record: PremiumPaymentRecord): Promise<void> {
  await getDb().collection(COLLECTION).doc(record.txHash.toLowerCase()).set(record);
}
