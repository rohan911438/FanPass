import type { MarketplaceListing } from "@fanpass/shared";
import { getDb } from "@/config/localStore";

const COLLECTION = "marketplaceListings";

export type NewListingInput = Omit<MarketplaceListing, "escrow" | "status" | "createdAt" | "updatedAt">;

export async function createListing(input: NewListingInput): Promise<MarketplaceListing> {
  const now = new Date().toISOString();
  const listing: MarketplaceListing = {
    ...input,
    escrow: { status: "none", onChainEscrowId: null },
    status: "active",
    createdAt: now,
    updatedAt: now,
  };
  await getDb().collection(COLLECTION).doc(input.listingId).set(listing);
  return listing;
}

export async function getListingById(listingId: string): Promise<MarketplaceListing | null> {
  const snap = await getDb().collection(COLLECTION).doc(listingId).get();
  return snap.exists ? (snap.data() as MarketplaceListing) : null;
}

export async function updateListing(listingId: string, patch: Partial<MarketplaceListing>): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(listingId)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

export async function listActiveListings(): Promise<MarketplaceListing[]> {
  const snap = await getDb().collection(COLLECTION).where("status", "==", "active").get();
  return snap.docs.map((d) => d.data() as MarketplaceListing);
}

export async function findActiveListingByTicketId(ticketId: string): Promise<MarketplaceListing | null> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("ticketId", "==", ticketId)
    .where("status", "==", "active")
    .limit(1)
    .get();
  return snap.empty ? null : (snap.docs[0].data() as MarketplaceListing);
}

/** Wallet's "Owned Tickets" tab needs this to offer Cancel/Relist regardless of listing status. */
export async function findListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
  const snap = await getDb().collection(COLLECTION).where("sellerAddress", "==", sellerAddress).get();
  return snap.docs.map((d) => d.data() as MarketplaceListing);
}

/** Comps for the Pricing Agent: other active listings' ask prices for the same event + venue. */
export async function findActiveListingPricesForEvent(
  eventName: string,
  venue: string,
  excludeListingId?: string
): Promise<number[]> {
  const snap = await getDb()
    .collection(COLLECTION)
    .where("status", "==", "active")
    .where("eventName", "==", eventName)
    .where("venue", "==", venue)
    .get();
  return snap.docs
    .map((d) => d.data() as MarketplaceListing)
    .filter((listing) => listing.listingId !== excludeListingId)
    .map((listing) => listing.askPrice);
}
