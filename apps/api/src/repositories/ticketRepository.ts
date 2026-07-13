import type { Ticket } from "@fanpass/shared";
import { getDb } from "@/config/firebaseAdmin";

const COLLECTION = "tickets";

export type NewTicketInput = Omit<Ticket, "status" | "qrHash" | "createdAt" | "updatedAt">;

/** Reserves a ticket id before the file upload completes, so the storage path can be keyed by it. */
export function generateTicketId(): string {
  return getDb().collection(COLLECTION).doc().id;
}

export async function createTicket(input: NewTicketInput): Promise<Ticket> {
  const now = new Date().toISOString();
  const ticket: Ticket = {
    ...input,
    qrHash: null,
    status: "unverified",
    createdAt: now,
    updatedAt: now,
  };
  await getDb().collection(COLLECTION).doc(input.ticketId).set(ticket);
  return ticket;
}

export async function getTicketById(ticketId: string): Promise<Ticket | null> {
  const snap = await getDb().collection(COLLECTION).doc(ticketId).get();
  return snap.exists ? (snap.data() as Ticket) : null;
}

export async function updateTicket(ticketId: string, patch: Partial<Ticket>): Promise<void> {
  await getDb()
    .collection(COLLECTION)
    .doc(ticketId)
    .update({ ...patch, updatedAt: new Date().toISOString() });
}

/** Duplicate + ownership cross-check support: any other ticket already claiming this QR hash. */
export async function findTicketByQrHash(qrHash: string, excludeTicketId: string): Promise<Ticket | null> {
  const snap = await getDb().collection(COLLECTION).where("qrHash", "==", qrHash).limit(5).get();
  const match = snap.docs.map((d) => d.data() as Ticket).find((t) => t.ticketId !== excludeTicketId);
  return match ?? null;
}

/** Batch fetch for the Wallet aggregate — plain Promise.all rather than an `in` query to dodge its size cap. */
export async function findTicketsByIds(ticketIds: string[]): Promise<Ticket[]> {
  const tickets = await Promise.all(ticketIds.map((id) => getTicketById(id)));
  return tickets.filter((ticket): ticket is Ticket => ticket !== null);
}
