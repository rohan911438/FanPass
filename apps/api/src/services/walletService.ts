import type { WalletAddress, WalletSummary } from "@fanpass/shared";
import { listAttendanceByAddress } from "@/repositories/attendanceRepository";
import { findListingsBySeller } from "@/repositories/listingRepository";
import { listMemoryCardsByAddress } from "@/repositories/memoryCardRepository";
import { findOwnershipCertificatesByOwner } from "@/repositories/ownershipCertificateRepository";
import { findTicketsByIds } from "@/repositories/ticketRepository";
import { listTransactionsByAddress } from "@/repositories/transactionRepository";
import { getTrustScore } from "@/repositories/trustScoreRepository";
import { getOrCreateUser } from "@/repositories/userRepository";

/** Everything a Wallet page tab needs, aggregated from real Firestore-backed collections in one call. */
export async function getWalletSummary(walletAddress: WalletAddress): Promise<WalletSummary> {
  const [user, certificates, transactions, attendanceBadges, memoryCards, trustScore, myListings] = await Promise.all([
    getOrCreateUser(walletAddress),
    findOwnershipCertificatesByOwner(walletAddress),
    listTransactionsByAddress(walletAddress),
    listAttendanceByAddress(walletAddress),
    listMemoryCardsByAddress(walletAddress),
    getTrustScore("user", walletAddress),
    findListingsBySeller(walletAddress),
  ]);

  const tickets = await findTicketsByIds(certificates.map((cert) => cert.ticketId));

  return {
    walletAddress,
    user,
    trustScore,
    tickets,
    certificates,
    transactions,
    attendanceBadges,
    memoryCards,
    myListings,
  };
}
