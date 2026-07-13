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
