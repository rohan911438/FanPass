import type { OwnershipCertificate, WalletAddress } from "@fanpass/shared";
import { getDb } from "@/config/firebaseAdmin";

const COLLECTION = "ownershipCertificates";

/**
 * Mocked Firestore record standing in for the on-chain Ownership Certificate NFT until Phase 4 wires
 * up OwnershipRegistry.sol. tokenId/contractAddress stay null so callers can tell mock from real.
 */
export async function createMockOwnershipCertificate(
  ticketId: string,
  ownerAddress: WalletAddress
): Promise<OwnershipCertificate> {
  const now = new Date().toISOString();
  const cert: OwnershipCertificate = {
    certId: `cert_${ticketId}`,
    ticketId,
    tokenId: null,
    contractAddress: null,
    currentOwner: ownerAddress,
    history: [{ walletAddress: ownerAddress, txHash: null, timestamp: now }],
    mintedAt: now,
  };
  await getDb().collection(COLLECTION).doc(cert.certId).set(cert);
  return cert;
}

export async function getOwnershipCertificateByTicketId(ticketId: string): Promise<OwnershipCertificate | null> {
  const snap = await getDb().collection(COLLECTION).doc(`cert_${ticketId}`).get();
  return snap.exists ? (snap.data() as OwnershipCertificate) : null;
}

/**
 * Transfers the mocked certificate to a new owner on escrow release — shaped exactly like the history
 * append a real OwnershipRegistry.sol transfer event would drive, so Phase 4 swaps the writer, not the
 * shape callers read.
 */
export async function transferOwnershipCertificate(
  ticketId: string,
  newOwner: WalletAddress,
  txHash: string | null = null
): Promise<OwnershipCertificate> {
  const certId = `cert_${ticketId}`;
  const now = new Date().toISOString();
  const ref = getDb().collection(COLLECTION).doc(certId);

  const snap = await ref.get();
  if (!snap.exists) {
    throw new Error(`No ownership certificate found for ticket ${ticketId}`);
  }
  const existing = snap.data() as OwnershipCertificate;
  const updated: OwnershipCertificate = {
    ...existing,
    currentOwner: newOwner,
    history: [...existing.history, { walletAddress: newOwner, txHash, timestamp: now }],
  };
  await ref.set(updated);
  return updated;
}

export async function findOwnershipCertificatesByOwner(ownerAddress: string): Promise<OwnershipCertificate[]> {
  const snap = await getDb().collection(COLLECTION).where("currentOwner", "==", ownerAddress).get();
  return snap.docs.map((d) => d.data() as OwnershipCertificate);
}
