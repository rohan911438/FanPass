# FanPass — Phase 5 Ecosystem Integration (CCTP · x402 · MCP · Agent Skills)

**Status: design only. No code in this document has been written.** Per the same convention as
`docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md`, this is the architecture for review — implementation begins
only after this is approved, and in the priority order set in §0.

Role assumed for this document: Principal Injective Protocol Engineer / AI Systems Architect / Blockchain
Engineer / Senior Backend Engineer, picking up a product where Phases 1–4 are live: `/verify`, `/marketplace`,
and `/wallet` work end-to-end against a local off-chain store standing in for Firestore, and three contracts
(`OwnershipRegistry`, `EscrowMarketplace`, `AttendanceRegistry`) are deployed on Injective EVM Testnet but not
yet called by `apps/api` (that wiring — `apps/api/src/web3/*` + the event indexer — is Phase 4's remaining
step, tracked in the README, and is a **prerequisite** for everything below: CCTP and x402 both settle through
`EscrowMarketplace`, so §14 of the Phase 4 doc must land first).

This document supersedes and expands §16 of the Phase 4 doc (which sketched CCTP/x402/MCP at a paragraph
level) with full production detail, plus two things Phase 4 didn't cover at all: **Agent Skills**
modularization (Part 4) and the concrete backend architecture that carries all of it (Part 5).

---

## 0. What gets built, in what order, and why

Not every piece of the Injective/x402 ecosystem is a fit for FanPass. The filter is the same one Phase 4
used: **a feature earns its place only if it solves a real user problem or gives a judge/user something
they can see, not because it exists.**

| Priority | Feature | User-visible? | Why it clears the bar |
|---|---|---|---|
| P0 (prerequisite, already designed in Phase 4 §14) | Wallet + contract wiring | Yes | Nothing below settles without it |
| P1 | CCTP | Yes | Removes the single biggest real friction for a cross-border resale market: "I don't hold USDC on the right chain" |
| P1 | x402 | Yes | Monetizes genuinely expensive, occasional services without forcing a subscription nobody wants for a once-a-year ticket purchase |
| P2 | MCP | Backend only | Not a demo feature by itself — it's the seam that makes swapping mocked OCR/fraud for real vendors a config change, not a rewrite |
| P2 | Agent Skills | Backend only | Same category as MCP: invisible to the user, but the difference between "one monolith to debug" and "ten independently testable, independently swappable units" |

MCP and Agent Skills are **not judge-facing features** — they're the internal architecture that makes CCTP
and x402 (which *are* judge-facing) safe to build quickly without turning the orchestrator into an
unmaintainable pile of `if` statements. They're built because the two P1 features need them, not for their
own sake. That ordering — P1 features drive P2 infrastructure, not the reverse — is deliberate.

**Explicitly not built:** subscriptions of any kind (x402 replaces the need for one), a public-facing MCP
endpoint (§3.1), upgradeable/proxy contracts (unchanged from Phase 4 §15), badges/collectibles (still Phase 6+).

---

# PART 1 — CCTP: cross-border ticket purchasing

## 1.1 The problem this solves

Framing it as "cross-chain payments" undersells it and is also not what the user experiences. The actual
story:

```
An Indian fan wants a World Cup ticket listed by a seller who only wants USDC.
The fan's wallet holds USDC on Base. FanPass runs on Injective.
Today: the fan must know what a bridge is, find one, use it, then come back and buy.
After CCTP: the fan clicks "Buy." That's it.
```

The buyer never sees the word "CCTP," "bridge," "attestation," or "domain ID." They see a slightly longer
progress bar than a same-chain buy, with honest copy ("Confirming your payment…") — not a lie of omission,
but not a blockchain lecture either.

## 1.2 Frontend flow

```
Buyer clicks "Buy" on a listing
        │
        ▼
Frontend reads the connected wallet's chain (wagmi useChainId, already wired)
        │
        ├── chain === Injective EVM Testnet ──────► existing same-chain buy flow (Phase 3/4, unchanged)
        │
        └── chain !== Injective ───────────────────► "Pay with USDC from {chainName}" button
                                                       (not hidden, not a dead end — the button IS the
                                                        cross-chain path, no separate "bridge first" step)
                        │
                        ▼
        POST /api/v1/marketplace/:listingId/buy/cross-chain
              { sourceChain, buyerAddress }
                        │
                        ▼
        Buyer's wallet is prompted twice, in sequence, by the frontend (not the backend — the backend
        never holds the buyer's keys):
          1. approve(usdc, TokenMessenger, amount)   — one-time or per-purchase allowance
          2. depositForBurn(amount, injectiveDomain, escrowRecipient, usdcAddress) on the source chain
                        │
                        ▼
        Frontend hands the resulting burn tx hash to the backend:
        POST /api/v1/marketplace/:listingId/buy/cross-chain/confirm-burn { txHash }
                        │
                        ▼
        CrossChainPurchaseStepper (new component, same visual pattern as VerificationStepper —
        no new UI language to invent):
          "Confirming your payment on {chain}…"
          "Bringing your USDC to Injective…"        (this step is the long one, ~15 min mainnet /
                                                       seconds-to-minutes on testnet — copy says
                                                       "usually a few minutes," never "instant")
          "Reserving your ticket…"
          "Done — ticket is yours."
        Polled the same way the verification stepper already polls (GET .../buy/cross-chain/:intentId),
        reusing the "poll until backend catches up" pattern from Phase 4 §14 rather than inventing sockets.
```

## 1.3 Backend services (`apps/api/src/cctp/`, new)

```
apps/api/src/cctp/
├── crossChainPurchaseService.ts   # orchestrates the whole intent lifecycle, called by the controller
├── attestationClient.ts           # thin wrapper over Circle's Iris attestation API (the provider seam)
├── attestationPoller.ts           # background poller — see §1.8
├── relayer.ts                     # calls MessageTransmitter.receiveMessage on Injective once attested
├── domains.ts                     # per-network CCTP domain IDs, sourced from packages/shared chain constants
└── types.ts                       # CrossChainPurchaseIntent and its state machine
```

```ts
// cctp/types.ts
export type CrossChainIntentState =
  | "awaiting_burn"      // backend has the intent, buyer hasn't confirmed a burn tx yet
  | "burn_confirmed"     // burn tx seen and confirmed on the source chain
  | "attesting"          // polling Circle for the attestation
  | "attested"           // attestation received, ready to mint on Injective
  | "minting"            // receiveMessage() submitted, awaiting confirmation
  | "minted"             // USDC now native on Injective, ready to fund escrow
  | "escrow_funding"     // EscrowMarketplace.buy() submitted on the buyer's behalf
  | "completed"          // escrow released, same as a same-chain purchase's end state
  | "failed"             // terminal — see §1.9 for which failures are terminal vs retryable
  | "refund_pending"     // see §1.9
  | "refunded";

export interface CrossChainPurchaseIntent {
  id: string;                      // ULID, used as the poll key
  listingId: string;
  buyerAddress: `0x${string}`;
  sourceChain: string;              // e.g. "base", "ethereum" — keyed into domains.ts
  sourceDomain: number;
  amount: string;                   // 6-decimal USDC string, decimals verified per-chain (§1.11)
  burnTxHash: string | null;
  messageHash: string | null;
  attestationStatus: "pending" | "complete" | null;
  mintTxHash: string | null;
  escrowBuyTxHash: string | null;
  state: CrossChainIntentState;
  failureReason: string | null;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;                 // see §1.10
}
```

## 1.4 Payment lifecycle (state machine)

```
awaiting_burn ──(buyer submits burnTxHash)──► burn_confirmed ──► attesting
                                                                     │
                                                    (Circle attests, ~mins)
                                                                     ▼
                                                                 attested
                                                                     │
                                              (relayer calls receiveMessage)
                                                                     ▼
                                                                  minting ──► minted
                                                                                 │
                                        (relayer calls EscrowMarketplace.buy() on buyer's behalf)
                                                                                 ▼
                                                                          escrow_funding
                                                                                 │
                                                        (same-chain path from here — Phase 4 §8.2)
                                                                                 ▼
                                                                            completed

Any state before "minted" can branch to failed/refund_pending — see §1.9.
"minted" itself is never reversible (Circle's mint is final) — a failure after that point is an
escrow-level failure, handled by the *existing* EscrowMarketplace refund path (Phase 4 §4.4), not a new
CCTP-specific refund.
```

## 1.5 Escrow lifecycle — reuses Phase 4 unchanged

This is the deliberate design choice from Phase 4 §4.3: `buy()` and `releaseEscrow()` are already two
separate calls specifically *because* CCTP needs the "funded but not yet settled" window. Once a
cross-chain intent reaches `minted`, **every remaining step is the identical same-chain flow already
designed** — `EscrowMarketplace.buy()`, dispute window, `releaseEscrow()`. CCTP adds nothing new to the
escrow contract or its state machine; it only changes how USDC arrives at the point `buy()` is called.

## 1.6 Contract interactions

```ts
// cctp/relayer.ts (shape)
async function relayAttestedMessage(intent: CrossChainPurchaseIntent): Promise<`0x${string}`> {
  // calls MessageTransmitter.receiveMessage(message, attestation) on Injective EVM Testnet
  // idempotent: MessageTransmitter itself rejects a message hash it has already minted,
  // so a retried call after an ambiguous RPC failure is safe (§1.8)
}

async function fundEscrowOnBuyerBehalf(intent: CrossChainPurchaseIntent): Promise<`0x${string}`> {
  // calls EscrowMarketplace.buy(listingId, amount) using a relayer-held facilitator key,
  // NOT the buyer's key — the buyer never signs an Injective-side transaction.
  // This requires either:
  //   (a) the buyer pre-authorizes the relayer via an EIP-2612-style permit/allowance at
  //       intent-creation time, or
  //   (b) EscrowMarketplace exposes a buyFor(listingId, amount, buyer) variant restricted to a
  //       new RELAYER_ROLE, mirroring how VERIFIER_ROLE/MARKETPLACE_ROLE already work.
  // (b) is the cleaner fit — it's one more role grant (Phase 4 §9.1 pattern), not a new access model.
}
```

## 1.7 Firebase / local-store synchronization

Same posture as Phase 4 §14: **the chain write is the source of truth; the indexer is what updates the
store.** A new repository, `crossChainIntentRepository`, follows the exact same stable-signature convention
as `ticketRepository`/`listingRepository` — `createIntent`, `updateIntentState`, `getIntent`. The indexer
(Phase 4 §13's `apps/api/src/indexer/`) gains one more handler:

```
apps/api/src/indexer/handlers/
└── crossChainMessageReceived.ts   # reacts to MessageTransmitter's MintAndWithdraw event,
                                    # flips the intent to "minted", triggers fundEscrowOnBuyerBehalf
```

The frontend's poll endpoint (`GET /marketplace/:id/buy/cross-chain/:intentId`) reads only from this
repository — it never reaches into `cctp/` services directly, matching the existing controller → service →
repository layering.

## 1.8 Retry strategy

| Step | Failure mode | Retry policy |
|---|---|---|
| Polling Circle's attestation API | Network error, `pending` status | Poll every 20s (testnet attests fast) up to the timeout in §1.10; transient HTTP errors get 3 immediate retries with jitter before falling back to the normal poll cadence |
| `receiveMessage` call | RPC hiccup, gas estimation failure, nonce collision | Exponential backoff, 5 attempts (2s, 4s, 8s, 16s, 32s); safe to retry because `MessageTransmitter` rejects an already-minted message hash — no double-mint risk |
| `fundEscrowOnBuyerBehalf` | RPC hiccup, listing no longer active (someone else bought it — see §1.9) | 3 attempts with backoff; if the listing state check fails (not an RPC issue), stop retrying and move to refund_pending |

## 1.9 Failure recovery & refund flow

```
Case: burn succeeds, buyer disconnects / closes tab before confirm-burn is even POSTed
  → Nothing to recover: the intent never left "awaiting_burn" server-side. The burn is real and
    mintable by anyone holding the attested message — if the buyer returns later (even in a new
    session, same wallet), the frontend can re-derive the pending intent from the burn tx hash and
    resume from "burn_confirmed." No funds are ever unreachable; they're just unresolved.

Case: attestation never completes (Circle-side outage)
  → attestationPoller keeps polling indefinitely (bounded by §1.10's expiry, not by attempt count) —
    this is Circle's guarantee to honor, not FanPass's to route around. The listing stays "Active"
    the entire time (not falsely reserved), so another buyer isn't blocked by someone else's stuck
    cross-chain payment.

Case: attested, but fundEscrowOnBuyerBehalf fails because the listing was bought by someone else
  in the meantime (race: a same-chain buyer bought it while this buyer's attestation was pending)
  → This is the one genuine "refund" case, because the buyer's USDC is now real, native USDC sitting
    at the relayer/escrow-recipient address on Injective with no ticket to show for it.
    refund_pending → a refund service transfers the minted USDC back to the buyer's Injective-side
    address (or, better, offers "apply to another listing" as the primary UI action, refund as
    fallback) → refunded.

Case: relayer's own key is compromised / offline
  → Operational, not architectural: RELAYER_ROLE (§1.6) can be revoked/rotated exactly like
    VERIFIER_ROLE in Phase 4 §10 — a grantRole/revokeRole pair, not a redeploy.
```

## 1.10 Timeout handling

- Each intent carries `expiresAt` = created + 24h (generous — Circle's mainnet attestation is ~15 min,
  testnet faster; 24h absorbs any real-world outage without abandoning a buyer's burned funds prematurely).
- Past `expiresAt` with no mint, the intent is marked `failed` in the store (**not** the funds — those
  remain mintable forever per Circle's protocol guarantee) and support/ops tooling can manually trigger
  `relayAttestedMessage` later; this is a UX/bookkeeping timeout, not a funds-safety timeout.
- The listing itself is never held reserved during any of this — `EscrowMarketplace.buy()` (which actually
  changes listing state) is only called at `minted`, so a slow cross-chain buyer never blocks other buyers.

## 1.11 Transaction monitoring

- Every state transition in §1.4 is logged with the intent id, tx hash (where applicable), and elapsed
  time since `createdAt` — structured logs, same shape as §4.10's observability design, so CCTP intents
  show up in the same trace/log pipeline as everything else rather than a bespoke dashboard.
- A lightweight ops view (internal, not customer-facing): list of intents by state, sorted by age —
  lets a human spot a stuck `attesting` intent past a few minutes without needing new infrastructure.
- **Edge case flagged explicitly**: source-chain USDC is not always 6-decimal on every chain Circle
  supports — `domains.ts` must carry a decimals field per source chain, verified against the actual token
  contract, not assumed uniform.

---

# PART 2 — x402: premium verification APIs

## 2.1 Principle

x402 is for **occasional, expensive, single-use services** — never for gating a feature someone would use
every day (that's what a subscription is for, and FanPass isn't building one). The test for "does this
belong behind x402": would a user reasonably pay per-use rather than expect it bundled for free, and does
running it cost FanPass something non-trivial (compute, a paid third-party API, human review time)? If a
service fails that test, it stays a normal free endpoint.

## 2.2 The six premium endpoints

| Endpoint | Price (USDC, illustrative) | What it does | Backing Skill(s) (Part 4) |
|---|---|---|---|
| `POST /api/v1/premium/fraud-investigation/:ticketId` | 5.00 | Deep forensic pass beyond the free Fraud Detection skill — cross-references multiple fraud signal sources, slower/human-in-the-loop-ready | Fraud Detection (deep mode) + Fraud Database MCP tool |
| `POST /api/v1/premium/image-forensics/:ticketId` | 3.00 | Pixel-level tamper/editing analysis on the uploaded ticket image (ELA, clone detection) beyond the free tamper-score heuristic | Fraud Detection + Image Analysis MCP tool |
| `POST /api/v1/premium/ownership-investigation/:ticketId` | 4.00 | Full chain-of-custody trace: every `OwnershipRegistry`/`EscrowMarketplace` event for this `tokenId`, cross-checked against claimed seller history | Ownership Validation + Blockchain Reader MCP tool |
| `POST /api/v1/premium/insurance-eligibility/:ticketId` | 2.00 | Risk-priced eligibility report for a future ticket-protection product | Insurance skill |
| `POST /api/v1/premium/legal-verification-report/:ticketId` | 8.00 | Signed, formatted PDF referencing on-chain `verificationHash`/`tokenId`, suitable for a dispute or legal context | Ownership Validation + Escrow Validation, rendered to PDF |
| `POST /api/v1/premium/enterprise-verification/:ticketId` | 15.00 | Full bundle: every skill above run together, structured for a venue/enterprise buyer verifying at scale | All of the above |

Each is a **single flat price per request** — no metering by token/compute unit, no tiers. That simplicity
is deliberate: matching "the user never feels they're using blockchain," they also never feel like they're
being nickel-and-dimed by a usage meter.

## 2.3 Middleware architecture

```
apps/api/src/middleware/x402.ts   (new)
apps/api/src/premium/priceMap.ts  (new — the six routes above, each mapped to { price, payToAddress })

Express request pipeline for any /api/v1/premium/* route:

  requestLogger (existing) → x402Middleware (new) → validate() (existing, Zod) → controller

x402Middleware(req, res, next):
  1. Look up req.path in priceMap. If not found, next() — middleware is a no-op outside /premium/*.
  2. Read the X-Payment header (or equivalent proof per the x402 scheme in use).
  3. No header / invalid proof → respond 402 with:
       { price, currency: "USDC", payTo: priceMap[route].payToAddress, resource: req.path,
         network: "injective-testnet" }
     and STOP — controller never runs.
  4. Header present → verify it (§2.4). Valid → attach req.paymentProof, call next().
     Invalid/expired/already-used → 402 again (not 401/403 — the spec's point is "pay," not "you're
     unauthorized").
```

Every other route in the app is completely unaffected — `x402Middleware` only activates for paths present
in `priceMap`, so adding a seventh premium endpoint later is "write a controller, add one line to
`priceMap`," never a parallel auth system.

## 2.4 How the backend verifies payment

Two valid proof shapes, both ending in the same verification step:

1. **Facilitator-verified scheme** (recommended default): the client's wallet signs an x402 payment
   payload; the backend calls a facilitator service (or Circle/x402 reference facilitator) to verify the
   signature and settle the payment, getting back a settlement confirmation the middleware trusts.
2. **Direct on-chain proof**: the client pays via a plain USDC transfer to `payToAddress` on Injective
   Testnet and passes the tx hash as proof; the middleware calls `viem`'s `getTransactionReceipt` +
   checks the `Transfer` event's `to`/`value` match the expected price — no facilitator dependency, useful
   as a testnet-friendly fallback if a facilitator isn't reachable.

**Replay protection**: every verified payment (tx hash or facilitator settlement id) is recorded in a new
`premiumPaymentRepository` keyed by that id before the controller runs. A second request presenting the
*same* proof is rejected with 402 (not re-executed) — one payment authorizes exactly one execution.

**Audit trail**: every settled premium request is written as a `transactions`-shaped record
(`type: "premium_service"`, reusing the existing `transactionRepository`, not a new collection) — same
posture as Phase 4 §16.2 already specified.

## 2.5 Request lifecycle

```
Client                         apps/api                              Facilitator / Injective RPC
  │ POST /premium/fraud-investigation/:id   (no payment)
  ├──────────────────────────►│
  │        402 + {price, payTo, resource}
  │◄──────────────────────────┤
  │
  │  [wallet pays — one signature or one on-chain tx]
  │
  │ POST /premium/fraud-investigation/:id   (X-Payment: proof)
  ├──────────────────────────►│
  │                           │  verify proof ─────────────────────►│
  │                           │◄────────────────────────────────────┤ valid
  │                           │  record payment (replay guard)
  │                           │  controller invokes Planner (Part 4) with `premium: true, skill: "fraud"`
  │                           │  streams progress (§2.6)
  │  200, streamed then final structured JSON (§2.7)
  │◄──────────────────────────┤
```

## 2.6 Streaming progress

Premium requests are slower than the free verification pass (deeper analysis, possibly multiple MCP tool
calls in sequence) — the client shouldn't stare at a spinner with no feedback. Implementation: **HTTP
chunked response with newline-delimited JSON (NDJSON)**, not a WebSocket (no new infra, works through the
same Express response object, and the frontend already knows how to poll/stream-consume from the
`VerificationStepper` pattern):

```
{"type":"progress","step":"payment_verified","pct":10}
{"type":"progress","step":"running_deep_fraud_scan","pct":40}
{"type":"progress","step":"cross_checking_fraud_db","pct":70}
{"type":"progress","step":"compiling_report","pct":90}
{"type":"result","data": { ...final structured JSON, see §2.7... } }
```

The controller writes each line via `res.write()` and calls `res.end()` after the final `result` line —
no client library beyond a stream reader is required.

## 2.7 Structured JSON per endpoint (shape, not exhaustive)

```ts
// Shared envelope — every premium endpoint's final "result" line has this shape
interface PremiumReport<TFindings> {
  ticketId: string;
  reportType: "fraud_investigation" | "image_forensics" | "ownership_investigation"
            | "insurance_eligibility" | "legal_verification" | "enterprise_verification";
  generatedAt: string;
  paymentRef: string;          // the settled payment/tx id, for the client's own records
  findings: TFindings;
  confidence: number;          // 0-1, same convention as AgentResult
}

interface DeepFraudFindings {
  tamperScore: number;
  crossReferencedSources: string[];   // which fraud DBs/signals were checked
  matchesKnownFraudPattern: boolean;
  recommendation: "clear" | "caution" | "high_risk";
}

interface LegalVerificationFindings {
  tokenId: string;
  verificationHash: string;
  onChainOwnerHistory: { owner: string; txHash: string; timestamp: string }[];
  pdfUrl: string;              // signed report, generated and stored via the existing storageRepository
}
```

## 2.8 Failure modes

- **Payment verified, agent execution throws**: the request already consumed a valid, single-use payment
  proof (§2.4's replay guard already recorded it) — the controller must catch the failure and either (a)
  return a partial report with an explicit `error` field rather than a bare 500, or (b) mark the payment
  record `refundable` and expose a `POST /premium/:paymentRef/refund` path. (a) is simpler and sufficient
  for v1; (b) is a stated future improvement, not required to ship.
- **Facilitator unreachable**: middleware falls back to the direct on-chain proof path (§2.4 option 2)
  rather than hard-failing every premium request because one facilitator is down.

---

# PART 3 — MCP: the tool bus behind verification

## 3.1 The one architectural rule

**The frontend never calls MCP. Ever.** MCP is an internal process boundary inside `apps/api`, not a
network-exposed API. The only path in is:

```
Verification Request (controller)
        │
        ▼
   Planner (Part 4 §4.4)
        │
        ▼
  MCP client (in-process call, not HTTP — see §3.2)
        │
        ▼
  MCP server: tool registry (§3.3)
        │
   ┌────┼────────┬──────────────┬────────────────┬──────────────┬────────────────┐
   ▼    ▼        ▼              ▼                ▼              ▼                ▼
 OCR   QR      Metadata   Blockchain Reader   Image Analysis   Price Oracle   Fraud Database
        │
        ▼
   Trust Engine (existing trustEngine/scoring.ts)
        │
        ▼
   Verification Report
```

This mirrors exactly what `apps/api/src/mcp/README.md` already sketches — this document is that stub filled
in with production detail.

## 3.2 Server architecture

MCP is used here in its literal sense — a typed tool-calling protocol — but run **in-process**, not as a
separate deployed service. Reasoning: every tool wraps something `apps/api` already has local access to
(the local store, `viem` clients, uploaded files) or a vendor SDK `apps/api` already holds credentials for.
Standing up a second network service to call back into the same process it's already running in would add
a network hop and a deployment unit for zero isolation benefit. If a tool later needs genuine process
isolation (e.g. a heavyweight vision model in its own container), it becomes an MCP tool that happens to
call out over HTTP internally — the *tool's* implementation changes, not the calling contract.

```
apps/api/src/mcp/
├── server.ts              # tool registry + dispatch, in-process singleton
├── types.ts                # McpTool<TInput, TOutput> interface, ToolCallResult<T>
├── tools/
│   ├── ocr.extract.ts
│   ├── qr.decode.ts
│   ├── metadata.lookup.ts
│   ├── chain.read.ts             # wraps apps/api/src/web3/*.ts (Phase 4)
│   ├── image.forensics.ts        # new — backs Part 2's Image Forensics endpoint
│   ├── price.history.ts
│   └── fraud.dbLookup.ts         # new — external fraud-signal DB, stub/no-op until a vendor is chosen
├── registry.ts             # tool metadata: timeout, retry policy, cache policy (§3.3)
├── cache.ts                 # keyed cache, see §3.8
└── observability.ts          # trace/log wrapper, see §3.10
```

```ts
// mcp/types.ts
export interface McpTool<TInput, TOutput> {
  name: string;                              // e.g. "chain.read"
  execute(input: TInput): Promise<TOutput>;
  fallback?: (input: TInput) => Promise<TOutput>;  // e.g. mocked-deterministic OCR if the vision API times out
}

export interface ToolCallResult<T> {
  tool: string;
  ok: boolean;
  output: T | null;
  error: string | null;
  cached: boolean;
  latencyMs: number;
  attempts: number;
}
```

## 3.3 Tool registry

| Tool | Wraps | Timeout | Retries | Cache TTL | Fallback |
|---|---|---|---|---|---|
| `ocr.extract` | Vision API (mocked-deterministic today, per Phase 2) | 8s | 2 | none (input-specific) | mocked-deterministic path |
| `qr.decode` | Existing `jimp`+`jsqr` pipeline (already real) | 3s | 1 | none | — (local computation, no external failure mode) |
| `metadata.lookup` | `ai/fixtures.ts` (already real) | 1s | 0 | request lifetime | — |
| `chain.read` | `apps/api/src/web3/*` — `statusOf`, `ownerOf`, listing state | 5s | 3 (RPC flakiness is the expected failure mode) | 1 block (~ Injective block time) | returns typed error, folded into calling skill's `flags` |
| `image.forensics` | New vendor (ELA/clone-detection API) | 15s | 1 (expensive; don't hammer a paid API) | none | degrade to free-tier tamper score, flag `deep_forensics_unavailable` |
| `price.history` | `listingRepository` comps lookup (already real) | 2s | 1 | request lifetime | — |
| `fraud.dbLookup` | External fraud-signal DB (no-op stub until a vendor is chosen) | 5s | 2 | 10 min | returns `{ matched: false, source: "unavailable" }` — never blocks verification |

## 3.4 Retry logic

Bounded, per-tool (table above), exponential backoff (base 200ms, ×2 per attempt, ±20% jitter). Retries are
scoped to **transient** failures only (timeout, 5xx, RPC connection reset) — a tool returning a well-formed
"not found" or "no match" is not retried, since retrying a correct-but-negative answer wastes the timeout
budget for nothing.

## 3.5 Timeout handling

Two levels:
- **Per-tool timeout** (table above) — a tool that exceeds it is treated as failed for that attempt.
- **Per-verification-pass budget** (new, e.g. 20s for the free pipeline, 60s for premium/deep passes) — the
  Planner (Part 4) tracks cumulative elapsed time across all tool calls for one request; if the budget is
  about to be exceeded, remaining optional tools are skipped (with a flag noting so) rather than the whole
  request timing out with no partial result. Required tools (e.g. `qr.decode` for duplicate detection)
  are never skippable — a request that can't complete a required tool degrades to "manual review" status,
  not a silent pass.

## 3.6 Error recovery

A tool that exhausts its retries returns a typed `ToolCallResult` with `ok: false`, not a thrown exception.
The calling Skill folds that into its own output's `flags` array (e.g. `"chain_read_unavailable"`) and
lowers its `confidence` accordingly — one flaky tool degrades one badge's confidence on the Trust Score
card, it never crashes the whole verification. This is the same posture Phase 4 §16.3 already stated;
this section makes it load-bearing rather than a comment.

**Circuit breaker**: if a tool fails N times in a row across *different* requests (not retries within one
request) within a rolling window, the registry marks it `degraded` and short-circuits straight to its
`fallback` for subsequent calls without spending the timeout budget — protects the per-request latency
budget from a tool that's fully down, not just slow.

## 3.7 Caching

Keyed by a hash of the tool's input (e.g. `chain.read` keyed by `{ tool, tokenId, blockNumber-rounded-down }`,
`price.history` keyed by `{ eventName, venue }` for the request's lifetime only — comps shouldn't go stale
*within* one verification pass, but must be fresh *across* passes). Cache is in-process (a `Map` with TTL
sweep) for v1 — no Redis dependency added for a problem this small; the interface is written so swapping
in a shared cache later (if multiple `apps/api` instances need to share it) is a provider swap, not a
rewrite (§5.6's provider-seam convention).

## 3.8 Parallel execution

Tools with no data dependency on each other run concurrently via `Promise.allSettled`, grouped by the
Planner's dependency graph (Part 4 §4.4) — e.g. `ocr.extract`, `qr.decode`, and `chain.read` for a given
ticket have no inputs derived from one another and run in parallel; `metadata.lookup` depends on `ocr`'s
output and runs after. This mirrors the existing Orchestrator's structure (`ownership` already depends on
`qr`'s duplicate result, per the current `orchestrator.ts`) — the Planner formalizes an existing informal
dependency into an explicit graph instead of hardcoded sequential `await`s.

## 3.9 Observability & logging

Every tool call is logged with: a `traceId` (one per verification/premium request, generated at the
controller and threaded through the Planner → MCP → tool call chain), `tool` name, `ok`/`cached`/`attempts`/
`latencyMs`, and — for failures — the error class (timeout vs. bad-input vs. vendor-error). This lets one
verification request's full tool-call trace be reconstructed from logs by `traceId` alone, and gives three
concrete metrics for free: per-tool p50/p95 latency, per-tool error rate, and cache hit rate — the numbers
that actually matter for deciding "which mocked tool most urgently needs a real vendor."

---

# PART 4 — Agent Skills: modular, planner-directed AI

## 4.1 What changes and what doesn't

The existing `apps/api/src/ai/orchestrator.ts` hardcodes one fixed sequence of 6 verification-time agents.
That's fine for "every ticket runs the same 6 checks," but breaks down the moment different contexts need
different checks — a premium Legal Verification request needs Escrow Validation and Ownership Validation
but not Pricing; a marketplace re-list doesn't need OCR again. Agent Skills replace the fixed sequence with
a **registry of independently callable units** and a **Planner** that decides which ones run.

**What doesn't change**: the actual logic inside each existing agent (`ocr.agent.ts`, `fraud.agent.ts`,
etc.) barely changes — it's re-packaged behind a uniform `Skill` interface, not rewritten. The
`AgentResult<T>` shape already in `packages/shared/src/types/agents.ts` is kept as the output contract for
every Skill (renamed conceptually to `SkillResult<T>` but structurally identical) — this is a wrapping
change, not a logic change.

## 4.2 Skill → existing agent mapping

| Skill (this document's naming) | Existing agent it replaces | New? |
|---|---|---|
| OCR | `ocr.agent.ts` | No |
| QR Validation | `qr.agent.ts` | No |
| Metadata Validation | `metadata.agent.ts` | No |
| Fraud Detection | `fraud.agent.ts` (gains a `deep` mode for Part 2's premium endpoints) | No, extended |
| Ownership Validation | `ownership.agent.ts` | No |
| Pricing | `pricing.agent.ts` | No |
| Reputation | `sellerReputation.agent.ts` | No |
| Escrow Validation | `marketplace.agent.ts` (renamed/scoped — validates listing/escrow state rather than just ranking) | No, reframed |
| Insurance | — | **Yes** — backs Part 2's Insurance Eligibility endpoint |
| Ticket Timeline | `transfer.agent.ts` (renamed/scoped — the full ownership/transfer history view) | No, reframed |

## 4.3 The Skill contract

```ts
// skills/types.ts
export interface SkillContext {
  ticketId: string;
  requestType: "verification" | "marketplace" | "premium" | "attendance";
  premium?: { reportType: string; paymentRef: string };
  priorResults: Partial<Record<SkillName, SkillResult<unknown>>>;  // what already ran, for dependencies
}

export interface Skill<TInput, TOutput> {
  name: SkillName;
  version: string;
  /** Declarative — the Planner calls this to decide inclusion, never hardcodes a skill list itself. */
  appliesTo(context: SkillContext): boolean;
  /** MCP tools this skill needs — lets the Planner pre-warm/parallelize tool calls (§3.8). */
  requiredTools: string[];
  /** Skills this one depends on, by name — Planner uses this to build the execution graph (§4.4). */
  dependsOn: SkillName[];
  execute(input: TInput, context: SkillContext): Promise<SkillResult<TOutput>>;
}

export interface SkillResult<T> {
  skill: SkillName;
  confidence: number;
  output: T;
  flags: string[];
  latencyMs: number;
}
```

## 4.4 JSON interfaces per Skill

```ts
// OCR
interface OcrSkillInput { claimed: ClaimedTicketFields; fileBuffer: Buffer; mimetype: string }
interface OcrSkillOutput {           // identical to existing OcrAgentOutput
  extractedEventName: string; extractedEventDate: string; extractedVenue: string;
  extractedSeatInfo?: string; fieldsMatchClaim: boolean; mismatches: string[];
}

// QR Validation
interface QrValidationInput { ticketId: string; fileBuffer: Buffer; mimetype: string }
interface QrValidationOutput {       // identical to existing QrAgentOutput
  decoded: boolean; qrHash: string; duplicateFound: boolean; duplicateOfTicketId: string | null;
}

// Metadata Validation
interface MetadataValidationInput { claimed: ClaimedTicketFields; ocr: OcrSkillOutput }
interface MetadataValidationOutput {  // identical to existing MetadataAgentOutput
  fixtureRecognized: boolean; matchedFixtureId: string | null;
  eventNameMatch: boolean; venueMatch: boolean; dateMatch: boolean;
}

// Fraud Detection (free + deep mode)
interface FraudDetectionInput { fileBuffer: Buffer; mimetype: string; mode: "standard" | "deep" }
interface FraudDetectionOutput {
  tamperScore: number; screenshotDetected: boolean; editingArtifactsDetected: boolean;
  deep?: { crossReferencedSources: string[]; matchesKnownFraudPattern: boolean };  // only in deep mode
}

// Ownership Validation
interface OwnershipValidationInput { ticketId: string; claimedSeller: WalletAddress; duplicateOfTicketId: string | null }
interface OwnershipValidationOutput { // identical to existing OwnershipAgentOutput
  claimedSeller: string; currentOwnerOnRecord: string | null;
  sellerMatchesOwner: boolean; isFirstVerification: boolean;
}

// Pricing
interface PricingInput { eventName: string; venue: string }
interface PricingOutput { fairMin: number; fairMax: number; fairSuggested: number; currency: "USDC"; compsFound: boolean }

// Reputation
interface ReputationInput { address: WalletAddress }
interface ReputationOutput { score: number; reputationTier: ReputationTier; breakdown: TrustScoreBreakdown }

// Escrow Validation
interface EscrowValidationInput { listingId: string; tokenId: string }
interface EscrowValidationOutput {
  listingStatus: "active" | "pending_escrow" | "sold" | "expired" | "disputed";
  escrowState: "none" | "funded" | "released" | "refunded" | "disputed";
  fundsMatchListingPrice: boolean;
}

// Insurance (new)
interface InsuranceInput { ticketId: string; fairPriceUsd: number; sellerReputationScore: number }
interface InsuranceOutput { eligible: boolean; riskTier: "low" | "medium" | "high"; suggestedPremiumBps: number }

// Ticket Timeline
interface TicketTimelineInput { tokenId: string }
interface TicketTimelineOutput {
  events: { type: string; from: string | null; to: string; txHash: string; timestamp: string }[];
  transferEligible: boolean;
}
```

## 4.5 The AI Planner

```
apps/api/src/planner/
├── planner.ts        # builds and executes the skill dependency graph for one SkillContext
├── skillRegistry.ts  # registers every Skill, keyed by name — a Skill is added here, never in planner.ts
└── contexts.ts        # the decision table below, expressed as data, not branching code
```

**Decision table** (data-driven — adding a context or a skill is a table edit, not new `if` branches):

| `requestType` | Skills that run |
|---|---|
| `verification` (free, `/verify` upload) | OCR → Metadata Validation, QR Validation, Fraud Detection(standard), Ownership Validation, Pricing — same 6 as today, just planner-driven now |
| `marketplace` (listing an already-verified ticket) | Escrow Validation, Pricing, Reputation |
| `attendance` (venue check-in) | Ownership Validation, Ticket Timeline |
| `premium: fraud_investigation` | Fraud Detection(deep) |
| `premium: image_forensics` | Fraud Detection(deep, forensics-only) |
| `premium: ownership_investigation` | Ownership Validation, Ticket Timeline |
| `premium: insurance_eligibility` | Insurance (depends on Pricing + Reputation, pulled in transitively) |
| `premium: legal_verification` | Ownership Validation, Escrow Validation, Ticket Timeline |
| `premium: enterprise_verification` | all Skills |

**Algorithm**: `planner.ts` takes a `SkillContext`, looks up the applicable skill set from the table (or,
for premium, `context.premium.reportType`), topologically sorts by `dependsOn`, groups independent skills
into parallel batches (mirrors §3.8's tool-level parallelism, one level up), executes batch-by-batch via
`Promise.allSettled`, and folds any skill's failure into `flags` rather than aborting the remaining graph —
identical fault-isolation posture to the MCP tool layer, applied one layer higher.

## 4.6 Skill registry & versioning

`skillRegistry.ts` is a plain map (`Record<SkillName, Skill<unknown, unknown>>`) populated at boot. A skill
carries its own `version` string so a future v2 of, say, Fraud Detection can register alongside v1 during a
rollout and the Planner's context table picks which version to invoke — the same additive-not-migration
posture Phase 4 §15 already established for contracts, applied to AI logic.

---

# PART 5 — Backend integration architecture

## 5.1 Layered view

```
Routes ──► Controllers ──► Services ──► Planner ──► Skills ──► MCP tools ──► Providers (vendor SDKs)
                              │                                                    │
                              ▼                                                    ▼
                        Repositories ◄──────────── Indexer (contract + CCTP events)
                              │
                              ▼
                    Local store (Firebase-shaped, swappable — unchanged posture from Phases 1-4)

Cross-cutting: Middleware (x402, upload, validate, requestLogger, errorHandler)
               Workers/Queues (attestation polling, indexer replay, slow premium jobs)
               Events (internal AppEvent bus normalizing contract/CCTP/x402 events into one shape)
```

## 5.2 Folder structure (extends Phase 4 §13)

```
apps/api/src/
├── controllers/
│   ├── tickets.controller.ts          (existing)
│   ├── marketplace.controller.ts      (existing, gains cross-chain buy endpoints)
│   ├── wallet.controller.ts           (existing)
│   └── premium.controller.ts          (new — one handler per Part 2 endpoint, thin: verify → invoke Planner → stream)
├── routes/
│   ├── marketplace.routes.ts          (existing, + /buy/cross-chain, /buy/cross-chain/:intentId)
│   └── premium.routes.ts              (new)
├── services/
│   ├── marketplaceService.ts          (existing — Phase 4 §14 rewires its internals to call web3/)
│   ├── crossChainPurchaseService.ts   (new, see §1.3)
│   └── premiumPaymentService.ts       (new — x402 verification, replay guard, §2.4)
├── planner/                           (new, §4.5)
│   ├── planner.ts
│   ├── skillRegistry.ts
│   └── contexts.ts
├── skills/                            (new — replaces ai/agents/ conceptually; files move, logic barely changes)
│   ├── ocr.skill.ts  qr.skill.ts  metadata.skill.ts  fraud.skill.ts  ownership.skill.ts
│   ├── pricing.skill.ts  reputation.skill.ts  escrowValidation.skill.ts
│   ├── insurance.skill.ts  ticketTimeline.skill.ts
│   └── types.ts
├── mcp/                                (filled in, §3.2 — was a README stub)
│   ├── server.ts  types.ts  registry.ts  cache.ts  observability.ts
│   └── tools/ ...
├── cctp/                                (new, §1.3)
├── web3/                                (Phase 4 §13 — prerequisite, filled in before this phase)
├── indexer/                             (Phase 4 §13, gains crossChainMessageReceived.ts handler)
├── providers/                           (new — the vendor-swap seam, one file per external dependency)
│   ├── circleCctpProvider.ts
│   ├── x402FacilitatorProvider.ts
│   ├── visionProvider.ts                # backs ocr.extract / image.forensics tools
│   └── fraudDbProvider.ts
├── events/                               (new — internal AppEvent bus)
│   ├── appEvent.ts                       # normalized shape for contract events, CCTP state changes, x402 payments
│   └── bus.ts                             # in-process EventEmitter-based; interface written so swapping to a real
│                                           # message queue later is a provider swap, not a rewrite
├── workers/                              (new)
│   ├── attestationPollWorker.ts          # wraps cctp/attestationPoller.ts on an interval
│   └── indexerReplayWorker.ts             # Phase 4's replay.ts, formalized as a worker
├── queues/                                (new — in-process for v1, interface-compatible with a future
│   │                                        real queue like BullMQ without touching call sites)
│   └── premiumJobQueue.ts                 # for premium requests too slow to hold an HTTP connection open
├── middleware/
│   └── x402.ts                            (new, §2.3)
├── repositories/
│   ├── crossChainIntentRepository.ts      (new)
│   └── premiumPaymentRepository.ts        (new)
└── (trustEngine/, config/, utils/, validators/, types/ — unchanged)
```

## 5.3 Controllers

Controllers stay thin (existing convention) — parse/validate input, call one service or the Planner, shape
the HTTP response. `premium.controller.ts`'s six handlers are nearly identical boilerplate (verify payment
already done by middleware → invoke Planner with the right `premium.reportType` → stream via §2.6) —
duplication here is fine per this repo's "three similar lines beats a premature abstraction" bias; if a
seventh premium endpoint reveals a genuine shared pattern, extract then, not now.

## 5.4 Services

`crossChainPurchaseService.ts` and `premiumPaymentService.ts` are the only genuinely new services; every
other existing service (`marketplaceService`, `ticketService`, `walletService`) keeps its current
responsibilities, with `marketplaceService`'s internals swapping mock writes for `web3/` calls per Phase 4
§14 — a prerequisite, not new scope here.

## 5.5 Repositories

Two new repositories, both following the existing stable-signature convention (create/update/get, no
business logic inside): `crossChainIntentRepository`, `premiumPaymentRepository`. Neither changes any
existing repository's interface.

## 5.6 Providers — the vendor-swap seam

This is the concrete home for what Phase 2/4 already called "mocked-but-deterministic now, real vendor
later behind the same signature." Every external dependency this phase introduces gets exactly one
provider file wrapping it:

```ts
// providers/visionProvider.ts — the ONLY file that changes when OCR goes from mocked to real
export interface VisionProvider {
  extractText(image: Buffer, mimetype: string): Promise<{ text: string; confidence: number }>;
}
export const visionProvider: VisionProvider = process.env.VISION_API_KEY
  ? realVisionProvider   // calls the actual vendor SDK
  : mockedVisionProvider; // today's deterministic-hash behavior, unchanged
```

MCP tools call providers, never vendor SDKs directly — this is what makes "swap mock for real" a one-file,
one-env-var change instead of touching every Skill that happens to need OCR.

## 5.7 Events

A single internal `AppEvent` shape normalizes three previously-separate event sources into one bus so
downstream consumers (indexer handlers, logging, future webhooks) don't need three different listener
shapes:

```ts
type AppEvent =
  | { source: "contract"; name: "TicketRegistered" | "TicketPurchased" | /* ... */; data: unknown }
  | { source: "cctp"; name: "IntentStateChanged"; intentId: string; from: CrossChainIntentState; to: CrossChainIntentState }
  | { source: "x402"; name: "PaymentSettled"; paymentRef: string; route: string };
```

In-process `EventEmitter` for v1 (no new infrastructure) — the indexer's contract-event subscription
(Phase 4 §13) publishes onto this same bus instead of calling handlers directly, so a CCTP state change and
a contract event are observable through one consistent stream for logging/observability (§3.9) purposes.

## 5.8 Middleware

Only one new middleware: `x402.ts` (§2.3). Existing `upload.ts`, `validate.ts`, `requestLogger.ts`,
`errorHandler.ts` are unchanged and apply to premium/cross-chain routes exactly as they do everywhere else.

## 5.9 Workers & queues

`attestationPollWorker.ts` runs on a fixed interval (e.g. every 20s, matching §1.8), scanning
`crossChainIntentRepository` for intents in `attesting` state and driving them forward. `premiumJobQueue.ts`
exists for the rare premium request that might exceed a reasonable HTTP timeout (e.g. Enterprise
Verification running all ten skills) — v1 implementation is an in-process queue (a simple array + worker
loop), deliberately not standing up Redis/BullMQ for a hackathon-scale request volume; the queue's
interface (`enqueue`, `onComplete`) is written narrowly enough that swapping the implementation later
doesn't touch any call site.

## 5.10 Firebase / local-store synchronization

Unchanged principle from every prior phase: `apps/api/src/config/localStore.ts` stands in for Firestore
behind the exact repository interfaces the rest of the app already calls. Nothing in this phase requires
touching that module — new repositories (`crossChainIntentRepository`, `premiumPaymentRepository`) are
written against the same interface, so a future real-Firestore swap remains a one-module change.

## 5.11 Contract event listeners

Extends Phase 4 §13's indexer with one handler (`crossChainMessageReceived.ts`, §1.7) — everything else
about the indexer (subscribe-on-boot, replay-on-cold-start) is unchanged.

## 5.12 Wallet services

`walletService.ts` (existing, read-side aggregation for `/wallet`) is unaffected. The **new** wallet-shaped
concern this phase introduces is the **relayer wallet** (§1.6) — a backend-held key with `RELAYER_ROLE`,
distinct from the buyer's own wallet and from the Trust Engine's `VERIFIER_ROLE` signer, following the
exact same "named role, not a hardcoded owner" posture Phase 4 §10 already established.

## 5.13 Payment services

Two distinct payment concerns, deliberately not merged into one "payments" module since they solve
different problems: `cctp/` (getting the *right currency, on the right chain* to the escrow contract) and
`premiumPaymentService.ts` (gating a request behind a *single* payment, x402-style). They share nothing
except both ultimately touching USDC — forcing them into one abstraction would couple two unrelated
lifecycles.

## 5.14 AI orchestration

`ai/orchestrator.ts` is retired in favor of `planner/planner.ts` (§4.5) — the fixed-sequence logic it
contains today becomes the `verification` row of the Planner's context table (§4.5), so the free `/verify`
flow's actual behavior is unchanged, just re-expressed as data the Planner consults instead of code it
executes linearly.

---

# PART 6 — Demo workflow

The exact end-to-end path, with each Injective/x402/MCP piece called out at the moment it participates —
built as one continuous story (same principle as Phase 4 §17), not a checklist of five unrelated features:

```
1. User uploads a ticket on /verify
        │
2. Planner (Part 4) resolves requestType="verification" → runs OCR, Metadata Validation, QR Validation,
   Fraud Detection(standard), Ownership Validation, Pricing — in dependency-ordered parallel batches
        │  [AGENT SKILLS participate here — modular units, Planner-selected, not a hardcoded chain]
        ▼
3. Each Skill reaches its data exclusively through MCP tools (ocr.extract, qr.decode, chain.read, etc.)
        │  [MCP participates here — invisible to the user, the seam between Skills and real/mocked vendors]
        ▼
4. Trust Score generated (trustEngine/scoring.ts, unchanged) from the Skills' combined results
        ▼
5. Ownership verified → OwnershipRegistry.registerTicket() mints the Ownership Certificate
        │  [WALLET + CONTRACT participate here — Phase 4, the prerequisite layer]
        ▼
6. Seller lists the ticket → EscrowMarketplace.createListing()
        ▼
7. A buyer on a different chain wants it → clicks "Pay with USDC from {chain}"
        │  [CCTP participates here — Part 1: burn on source chain → attestation → mint on Injective,
        │   entirely behind a progress bar, buyer never sees "CCTP"]
        ▼
8. CCTP settlement completes → relayer calls EscrowMarketplace.buy() on the buyer's behalf
        ▼
9. Escrow release → releaseEscrow() (same-chain path, unchanged by CCTP per §1.5) → seller paid in USDC
        ▼
10. Ownership transfer → OwnershipRegistry.completeSale() moves the Ownership Certificate to the buyer
        ▼
11. (Optional, buyer-initiated) Before or after the sale, the buyer pays once for a Fraud Investigation
    Report on a high-value ticket
        │  [X402 participates here — Part 2: a single 402 → pay → verify → stream → report cycle,
        │   zero standing subscription state]
        ▼
12. Attendance → venue check-in calls AttendanceRegistry.checkIn()
        ▼
13. Memory Card → (Phase 6+, foundation only per Phase 4 §5.5) renders from the now-complete on-chain
    history: registration, listing, cross-chain purchase, escrow release, transfer, attendance — every
    fact traceable to a specific contract event or CCTP intent, none of it something FanPass could have
    quietly fabricated.
```

**Why this ordering matters for a demo**: every technology answers "why does this exist" at the exact
moment a judge would ask it — CCTP appears right when a cross-chain buyer would otherwise be stuck, x402
appears right when a buyer wants something extra rather than as an unexplained paywall, MCP and Agent
Skills never appear as their own demo beat at all (correctly — they're backend architecture, not features
a user asked for), and the whole chain is invisible except for the two moments (buy, premium report) where
paying is the entire point and hiding it would be dishonest.

---

## Explicitly out of scope for this document / this phase

- No CCTP/x402/MCP/Skills code — this document is the gate before that starts, same convention as Phase 4.
- No real vendor integrations chosen yet (vision API, fraud DB, x402 facilitator) — providers (§5.6) are
  designed as a swappable seam precisely so that choice can be made later without touching this design.
- Phase 4 §14's `web3/` + indexer wiring is **not** re-designed here — it's a stated prerequisite, assumed
  complete before this phase's contract-touching pieces (CCTP relayer, indexer's new handler) can work.
- No mainnet planning — Injective EVM Testnet only, matching every other phase.
- No subscription model of any kind, anywhere — the explicit non-goal stated in the brief for this phase.

## What happens next

Per the same review gate as Phase 4: this document needs sign-off before implementation starts. Suggested
build order, since each later piece depends on the one before it working: **(1)** Phase 4 §14 prerequisite
wiring, **(2)** Agent Skills + Planner (Part 4/5) — since CCTP and x402 both invoke the Planner, **(3)** MCP
tool bus (Part 3) underneath the Skills, **(4)** x402 (Part 2) — simpler than CCTP, no external bridge
dependency, **(5)** CCTP (Part 1) — the most operationally involved piece (relayer, attestation polling),
built last so it lands on a Planner/Skills/MCP foundation that's already been exercised end-to-end.
