import type { Transaction } from "@fanpass/shared";
import { getDb } from "@/config/localStore";

const COLLECTION = "transactions";

export type NewTransactionInput = Omit<Transaction, "txId" | "createdAt" | "updatedAt">;

export async function createTransaction(input: NewTransactionInput): Promise<Transaction> {
  const ref = getDb().collection(COLLECTION).doc();
  const now = new Date().toISOString();
  const transaction: Transaction = { ...input, txId: ref.id, createdAt: now, updatedAt: now };
  await ref.set(transaction);
  return transaction;
}

export async function updateTransaction(txId: string, patch: Partial<Transaction>): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(txId)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

/** The escrow-release lookup: the still-pending purchase transaction opened for this listing. */
export async function findPendingPurchaseByListingId(listingId: string): Promise<Transaction | null> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("listingId", "==", listingId)
    .where("status", "==", "pending")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as Transaction);
}

/** No composite OR-filter — fetch both sides separately and merge, so no Firestore index is required. */
export async function listTransactionsByAddress(walletAddress: string): Promise<Transaction[]> {
  const db = getDb();
  const [asBuyer, asSeller] = await Promise.all([
    db.collection(COLLECTION).where("toAddress", "==", walletAddress).get(),
    db.collection(COLLECTION).where("fromAddress", "==", walletAddress).get(),
  ]);

  const byTxId = new Map<string, Transaction>();
  for (const doc of [...asBuyer.docs, ...asSeller.docs]) {
    const transaction = doc.data() as Transaction;
    byTxId.set(transaction.txId, transaction);
  }
  return Array.from(byTxId.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
