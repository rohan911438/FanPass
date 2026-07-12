# FanPass — Phase 3 Prompt: Marketplace & Wallet

Standalone brief for Phase 3. Assumes Phase 2 is done — verified tickets exist with real
`verificationReports` and `trustScores`, and the ownership-certificate state is a stable (mocked) Firestore
interface per `docs/ARCHITECTURE.md` §5. Read §4 (schema), §7 (Trust Engine), §10 (user flow) before
starting — don't re-derive that context, build against it.

---

## Goal

Make `/marketplace` and `/wallet` real. A seller can list a verified ticket; a buyer can browse, filter,
and buy it through a **mocked escrow** (real contracts are Phase 4 — the escrow *interface* must stay
stable so swapping in the real `Escrow.sol` later doesn't touch callers); a wallet shows everything a user
owns and has done.

## Scope

1. **`apps/api` — marketplace resource.** `routes/marketplace.routes.ts`,
   `controllers/marketplace.controller.ts`, `services/marketplaceService.ts`,
   `repositories/listingRepository.ts`, `repositories/transactionRepository.ts`. Validate with
   `createListingSchema` from `@fanpass/shared` (extend as needed, keep frontend/backend in lockstep).

2. **Trust Engine additions** (`apps/api/src/trustEngine/`):
   - `listTicket(ticketId, askPrice)` — Pricing Agent now has real comps to work with (other active
     listings for the same event/section) — make it real, not a placeholder.
   - `openEscrow(listingId, buyer)` / `releaseEscrow(escrowId)` — **mocked**: write escrow state into
     `marketplaceListings.escrow` (per §4's schema — status `none → funded → released/refunded/disputed`)
     and a `transactions` audit record. No chain calls yet; structure this exactly like the real
     `Escrow.sol` interaction will look in Phase 4 (same function signatures, same status transitions) so
     that phase is a swap, not a rewrite.
   - Seller Reputation Agent goes live for real: recomputes `trustScores/user_{address}` on every
     completed transaction and dispute.
   - Marketplace Agent goes live for real: ranks/filters the listing feed by trust score, price fairness,
     recency; powers "AI Suggested Deals."

3. **Frontend (`apps/web`) — Marketplace**:
   - `lib/api/listings.ts` typed client.
   - `components/marketplace/ListingGrid.tsx` — cards showing match, seat, price, trust score, seller
     reputation, transfer history summary, AI suggested price (reuse `TicketCard`/`TrustBadgeChip` from
     Phase 2).
   - `components/marketplace/ListingFilters.tsx` — price, section, trust score, seller reputation.
   - Listing detail via the intercepted route (`@modal/(.)listing/[id]`) as a slide-over sheet, per
     `docs/ARCHITECTURE.md` §2 — shareable URL, never feels like leaving the page.
   - Buy flow: review AI Trust Report → connect/confirm wallet → "pay" (mocked USDC deposit into the mock
     escrow) → confirmation. Seller flow: list / relist / cancel.

4. **Frontend (`apps/web`) — Wallet**:
   - `lib/api/wallet.ts` typed client (aggregate endpoint: owned tickets, certificates, badges, memory
     cards, transactions for a given address).
   - `components/wallet/AssetList.tsx`, `TransactionRow.tsx`, `MemoryCardTile.tsx`.
   - Tabs on `/wallet` (client state, still one route per §2): Owned Tickets, Ownership Certificates,
     Attendance Badges, Memory Cards, Activity (Purchased/Sold). Badges/memory cards can render from
     placeholder/mock data if attendance check-in hardware isn't built yet (that's Phase 4/6) — the UI and
     data shape should be real even if the trigger that populates them isn't.

## Explicitly out of scope

- Real smart contracts, real escrow, real USDC — everything here is Firestore-mocked behind a stable
  interface (Phase 4 swaps the implementation, not the callers).
- MCP tool bus, x402 premium tiers, CCTP (Phase 5).
- Real venue check-in scanning (Phase 4/6) — Wallet can still display attendance/memory-card data shapes
  from seeded/mock records.

## Definition of done

- A seller can verify a ticket (Phase 2) and list it; a buyer can find it via filters or AI Suggested
  Deals, review the Trust Report, and complete a mocked buy — ownership and escrow state update correctly,
  a `transactions` record is created, and both parties' trust scores update.
- Relist and cancel work and leave listing state consistent.
- `/wallet` shows a connected user's real Firestore-backed tickets/certificates/transactions, tabbed,
  matching the data actually created by the flows above (not hardcoded fixtures).
- Type-check and lint clean on both `apps/web` and `apps/api`.

Build the mocked escrow's state machine first and get one full buy transaction working end-to-end before
building out filters, AI Suggested Deals, or the wallet tabs — the transaction integrity is the part that
has to be right.
