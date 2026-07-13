import type { UserProfile, WalletAddress } from "@fanpass/shared";
import { getDb } from "@/config/firebaseAdmin";

const COLLECTION = "users";

export async function getUser(walletAddress: string): Promise<UserProfile | null> {
  const snap = await getDb().collection(COLLECTION).doc(walletAddress).get();
  return snap.exists ? (snap.data() as UserProfile) : null;
}

/** No signup flow — a wallet address IS the user profile, created lazily on first marketplace activity. */
export async function getOrCreateUser(walletAddress: WalletAddress): Promise<UserProfile> {
  const existing = await getUser(walletAddress);
  if (existing) return existing;

  const now = new Date().toISOString();
  const user: UserProfile = {
    walletAddress,
    reputationTier: "new",
    stats: { ticketsBought: 0, ticketsSold: 0, disputesRaised: 0, disputesLost: 0 },
    createdAt: now,
    updatedAt: now,
  };
  await getDb().collection(COLLECTION).doc(walletAddress).set(user);
  return user;
}

export async function updateUser(walletAddress: string, patch: Partial<UserProfile>): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(walletAddress)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

/** Applies deltas (e.g. { ticketsSold: 1 }) to a user's running stats and returns the updated profile. */
export async function incrementUserStats(
  walletAddress: WalletAddress,
  delta: Partial<UserProfile["stats"]>
): Promise<UserProfile> {
  const user = await getOrCreateUser(walletAddress);
  const stats = { ...user.stats };
  for (const key of Object.keys(delta) as Array<keyof UserProfile["stats"]>) {
    stats[key] += delta[key] ?? 0;
  }
  await updateUser(walletAddress, { stats });
  return { ...user, stats };
}
