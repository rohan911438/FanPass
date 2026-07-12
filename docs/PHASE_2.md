# FanPass — Phase 2 Prompt: Verification Core

Use this as the standalone brief for Phase 2. It assumes Phase 1 is done (monorepo, design system, wallet
connect, Landing page, Express skeleton — see `docs/ARCHITECTURE.md` and the Phase 1 summary in
`README.md`) and full context from `docs/ARCHITECTURE.md` §4 (schema), §6 (AI architecture), §7 (Trust
Engine), §10 (user flow). Don't re-derive that context — read it first, then build against it.

---

## Goal

Make `/verify` real: a user uploads a ticket, watches AI verification run live, and gets an expandable
Trust Score card that explains *why* the score is what it is. Everything the ticket needs from here on
(marketplace listing, ownership, escrow) hangs off the `tickets/{ticketId}` object created here — nothing
downstream should bypass it.

## Scope

1. **`apps/api` — tickets resource.** Add `routes/tickets.routes.ts`, `controllers/tickets.controller.ts`,
   `services/ticketService.ts`, `repositories/ticketRepository.ts`, `repositories/verificationRepository.ts`,
   `repositories/trustScoreRepository.ts`. Validate incoming payloads with `ticketUploadSchema` from
   `@fanpass/shared` (extend it if fields are missing — keep it the single source of truth, mirror any
   additions into the frontend form).

2. **AI Orchestrator + 5 verification-time agents** (`apps/api/src/ai/`), per §6:
   - OCR Agent, Metadata Agent, Fraud Agent — mocked but **deterministic** (same input → same output, not
     `Math.random()`), believable outputs.
   - QR Agent — real: decode, hash, check against the `qrHash` duplicate registry in Firestore.
   - Ownership Agent — real: cross-checks claimed seller against current Firestore ownership state (no
     chain yet — contracts are Phase 4, see the "mocked ownership state" note in §5).
   - Orchestrator sequences them, aggregates into a `VerificationResult`, never lets one agent call another.

3. **Trust Engine** (`apps/api/src/trustEngine/verification.ts`): `verifyTicket(submission)` — runs the
   orchestrator, writes `verificationReports/{ticketId}` and `trustScores/ticket_{ticketId}`, updates
   `tickets/{ticketId}.status` to `verified` or leaves it flagged. No NFT mint yet — ownership certificate
   state is a mocked Firestore record (`ownershipCertificates`) until Phase 4 swaps in the real contract.

4. **Frontend (`apps/web`)**:
   - `lib/api/tickets.ts` — typed client, no raw `fetch` elsewhere.
   - Upload form on `/verify` — React Hook Form + `ticketUploadSchema` (Zod resolver), file upload to
     Firebase Storage (photo/PDF/QR) or a Storage-signed-URL flow via the API.
   - `components/ticket/VerificationStepper.tsx` — live animated progress through the stages from the
     product brief: OCR → Metadata Validation → QR Validation → Image Integrity → Ownership Check →
     Duplicate Detection → Pricing → Trust Score. Poll or subscribe (Firestore listener or React Query
     polling) to reflect real backend progress, not a fake timer.
   - `components/ticket/TrustScoreCard.tsx` — the score (e.g. "97/100") plus the six badges from §6's
     mapping table (Verified QR, Verified Seller, No Duplicate, Fair Price, Transfer Eligible, Low Fraud
     Risk), each **expandable** to show which agent produced it and why. This is the single most important
     UI moment in the product — it has to earn trust, not just display a number.
   - `components/ticket/TicketCard.tsx`, `TrustBadgeChip.tsx` — reusable, used again in Phase 3's
     marketplace grid.

5. **Pricing** — Pricing Agent can be a simple placeholder in Phase 2 (flat comps formula or a fixed
   band) since there's no listing history yet; it gets real in Phase 3 once listings exist.

## Explicitly out of scope

- Marketplace listing/browsing, buy/sell, escrow (Phase 3).
- Real smart contracts / on-chain mint (Phase 4) — keep the ownership-certificate interface stable so
  swapping in the real contract later doesn't touch callers.
- MCP tool bus, x402, USDC/CCTP (Phase 5).
- Attendance check-in, memory cards (Phase 3 wallet display uses mocked data; real check-in is Phase 4/6).

## Definition of done

- A wallet-connected user can go to `/verify`, submit a ticket, watch the stepper animate through real
  backend stages, and land on a Trust Score card whose every badge expands to an honest explanation.
- `tickets`, `verificationReports`, `trustScores`, `agentLogs` are all populated in Firestore for a real
  submission.
- Rejected/low-score tickets are handled gracefully in the UI, not just the happy path.
- Type-check and lint clean on both `apps/web` and `apps/api`, as in Phase 1.

Build incrementally — get one agent's mock working end-to-end through the UI before adding the rest, don't
build all five agents blind and wire them up at the end.
