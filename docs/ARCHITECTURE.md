# FanPass — Architecture v2

AI-powered Ticket Trust Network for peer-to-peer World Cup ticket resale. Not an NFT marketplace, not a
chatbot wrapper. Users buy **verified tickets**; the Ownership Certificate NFT and the chain underneath are
invisible infrastructure. Every ticket has one immutable **Digital Ticket Identity** — verification,
ownership, marketplace state, escrow, attendance, and memory all hang off that one object, nothing bypasses it.

Hard constraints: no Docker anywhere, Firebase (Firestore + Storage) for data, no auth system — a connected
EVM wallet address on the **Injective EVM Testnet** *is* the user profile. Only four pages: Landing, Verify
Ticket, Marketplace, Wallet.

> **v2 changelog (reflection on v1):** the brief got significantly more specific, and three real
> architecture decisions follow from that specificity rather than just more detail:
> 1. **Backend splits out of Next.js into its own Express/TS service** (`apps/api`) with a real
>    controller → service → repository layering. Next.js API routes were fine for a weekend hack; a
>    layered Express service is what "production-quality, evolves into a startup" actually requires, and
>    it's still container-free (plain Node process).
> 2. **AI agent count goes 8 → 10** (Insurance Agent, Transfer Agent added) and the **MCP server flips role**:
>    in v1 it exposed the Trust Engine outward; in v2 it's primarily an *internal tool bus* that agents call
>    into (OCR, QR decode, metadata lookup, chain reads, price history, fraud DB) — this is what "every
>    verification module becomes an Agent Skill" actually means architecturally.
> 3. **Contracts go from 2 (+1 later) to 5 independent contracts** behind interfaces (OwnershipRegistry,
>    Escrow, Marketplace, TrustRegistry, AttendanceRegistry), so each responsibility is swappable/upgradable
>    without touching the others.
>
> Repo shape changes from a single Next.js app to a small monorepo (npm workspaces — no Turborepo/Nx, that
> would be over-building for a 4-page app). Everything else from v1 (Firestore, wallet-as-identity, no
> Docker, mock-first agents) still holds.

> **v3 changelog (Phase 4 blockchain design):** §5 below is superseded — **five contracts become three**.
> `TrustRegistry` is dropped (its one job, anchoring a trust-checkpoint hash, is already covered by
> `OwnershipRegistry.verificationHash`; a contract that exists only to re-anchor a hash of something
> already anchored is duplicated storage). `Escrow` and `Marketplace` merge into one `EscrowMarketplace`
> (they were never independently reusable — a listing has at most one active escrow, exactly like the
> off-chain `marketplaceListings.escrow` field always modeled it). Full rationale, interfaces, storage
> layout, sequence diagrams, security model, deployment plan, and the CCTP/x402/MCP designs live in
> `docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md` — that document is authoritative for the blockchain layer;
> treat §5/§8 here as the pre-Phase-4 sketch they were written as. Also note: Phase 1–3 already run on a
> local JSON file store (`apps/api/src/config/localStore.ts`), not Firestore — every "Firestore"/"Firebase"
> reference below predates that swap and should be read as "the off-chain store."

---

## 1. Monorepo & Folder Architecture

```
FanPass/
├── apps/
│   ├── web/                          # Next.js frontend (the only thing users see)
│   ├── api/                          # Express + TS backend
│   └── contracts/                    # Hardhat smart contracts
├── packages/
│   └── shared/                       # types + Zod schemas used by web, api, and contracts scripts
├── docs/
│   └── ARCHITECTURE.md
└── package.json                      # npm workspaces root, no build orchestrator needed yet
```

**Why `packages/shared`:** the Zod schema for "ticket upload payload" or "listing" is written once and
imported by the frontend form (React Hook Form + Zod resolver) *and* the backend validator middleware. One
schema, two enforcement points, zero drift — directly satisfies "never duplicate information unnecessarily."

### apps/web

```
apps/web/
├── src/
│   ├── app/
│   │   ├── page.tsx                        # Landing
│   │   ├── verify/page.tsx                 # Verify Ticket (upload → progress → Trust Score, one route)
│   │   ├── marketplace/
│   │   │   ├── page.tsx                    # Marketplace grid
│   │   │   └── @modal/(.)listing/[id]/page.tsx   # intercepted route: listing detail opens as a sheet,
│   │   │                                          # not a new top-level page — stays "4 pages"
│   │   └── wallet/page.tsx                 # Wallet (tabs: tickets/certs/badges/memory/tx — client state)
│   │
│   ├── components/
│   │   ├── ui/                             # shadcn primitives: button, card, sheet, tabs, skeleton…
│   │   ├── ticket/                         # TicketCard, TrustScoreCard, VerificationStepper, TrustBadgeChip
│   │   ├── marketplace/                    # ListingGrid, ListingFilters, PriceInsightCallout
│   │   ├── wallet/                         # AssetList, TransactionRow, MemoryCardTile
│   │   └── shared/                         # WalletConnectButton, EmptyState, PageHeader
│   │
│   ├── hooks/                              # useWallet, useVerifyTicket, useListings, useTrustScore
│   ├── store/                              # zustand: walletStore, uiStore (sheets/modals/toasts)
│   ├── lib/
│   │   ├── api/                            # typed fetch client for apps/api (one file per resource)
│   │   ├── web3/                           # wagmi config + injectiveEvmTestnet chain def
│   │   └── query/                          # React Query client + query key factory
│   └── styles/
├── public/
├── tailwind.config.ts
└── package.json
```

### apps/api

```
apps/api/
├── src/
│   ├── routes/                             # thin: path → controller, versioned under /api/v1
│   ├── controllers/                        # parse request, call service, shape response — NO business logic
│   ├── services/                           # business logic lives here (ticketService, marketplaceService…)
│   ├── trustEngine/                        # the heart of the system, detailed in §7
│   ├── ai/
│   │   ├── orchestrator.ts
│   │   └── agents/                         # 10 agents, one file each — see §6
│   ├── mcp/                                # internal MCP server + tool implementations — see §6
│   ├── repositories/                       # ONLY layer allowed to touch Firestore
│   ├── web3/                               # viem clients, contract ABIs, chain adapter — ONLY layer allowed to touch chain
│   ├── middleware/                         # error handler, request logger, x402 paywall gate
│   ├── validators/                         # zod schemas (re-exported from packages/shared where shared)
│   ├── utils/
│   ├── types/
│   └── config/                             # env, constants
├── tsconfig.json
└── package.json
```

### apps/contracts

```
apps/contracts/
├── contracts/
│   ├── interfaces/                         # IOwnershipRegistry, IEscrow, IMarketplace, ITrustRegistry, IAttendanceRegistry
│   ├── OwnershipRegistry.sol
│   ├── Escrow.sol
│   ├── Marketplace.sol
│   ├── TrustRegistry.sol
│   └── AttendanceRegistry.sol
├── scripts/deploy.ts
├── test/
└── hardhat.config.ts
```

**The one seam that must never be violated:** in `apps/web`, UI components only ever call `lib/api/*`
(HTTP). In `apps/api`, only `repositories/*` touch Firestore and only `web3/*` touches the chain — services
and the Trust Engine never import Firestore or viem directly. That's what keeps every layer swappable.

---

## 2. Routing

Strictly four top-level routes, matching the four pages:

| Route | Page | Notes |
|---|---|---|
| `/` | Landing | Hero + 3 primary CTAs (Verify / Marketplace / Wallet) |
| `/verify` | Verify Ticket | Single route; upload → live agent progress → Trust Score card, all client-state steps, not sub-routes |
| `/marketplace` | Marketplace | Grid + filters; listing detail opens via **intercepted route** (`@modal/(.)listing/[id]`) as a slide-over sheet — shareable URL, but never feels like leaving the page (Linear/Vercel pattern) |
| `/wallet` | Wallet | Tabbed content (Tickets / Certificates / Badges / Memory Cards / Transactions) via client state, one route |

No `/login`, no `/dashboard`, no `/admin`. Wallet connect is a persistent header action available from any
page, not a route.

---

## 3. Design System

- **Dark mode first** — design tokens defined for dark, light derived from the same scale, not
  bolted on.
- **Stack**: Tailwind CSS + shadcn/ui (Radix primitives — accessible by default) + Framer Motion for
  transitions/stepper animation/card reveals.
- **Typography**: one premium sans (e.g. Inter/Geist) with a tight type scale (display, h1–h3, body,
  caption) — reused everywhere, no per-page font decisions.
- **Spacing/radius/elevation**: single Tailwind config scale; glassmorphism reserved for exactly two
  surfaces (nav bar, Trust Score card) so it reads as a deliberate accent, not decoration.
- **Motion rules**: page-level fades, staggered card reveals on list load, a genuinely animated
  verification stepper (this is the moment that has to feel alive), micro-interactions on buttons/toggles.
  No motion on data that updates frequently (trust score polling) — only on state transitions.

### Component hierarchy

```
ui/ (atoms — shadcn primitives, project-agnostic)
  → shared/ (molecules — WalletConnectButton, EmptyState, PageHeader)
    → feature components (organisms — TrustScoreCard, ListingGrid, VerificationStepper, AssetList)
      → page sections (composed inside app/**/page.tsx)
```

Nothing in `ui/` knows about tickets, wallets, or trust scores — that boundary is what makes the primitives
reusable if this becomes a real product beyond ticketing.

---

## 4. Database Schema (Firestore)

Collection names match the product's actual nouns — no generic "items"/"records":

```
users/{walletAddress}
  walletAddress, displayName?, reputationTier: "new"|"verified"|"trusted"|"elite"
  stats: { ticketsBought, ticketsSold, disputesRaised, disputesLost }
  createdAt, updatedAt
  // trust SCORE itself lives in trustScores/ — not duplicated here

tickets/{ticketId}                          # the Digital Ticket Identity — the object everything hangs off
  eventName, eventDate, venue, seatInfo
  qrHash, originalIssuer?
  imageUrl                                  # Firebase Storage ref
  status: "unverified"|"verified"|"listed"|"in_escrow"|"sold"|"checked_in"|"used"
  createdAt, updatedAt

ownershipCertificates/{certId}              # mirrors OwnershipRegistry.sol for fast reads
  ticketId, tokenId, contractAddress
  currentOwner, history: [{ walletAddress, txHash, timestamp }]
  mintedAt

marketplaceListings/{listingId}
  ticketId, sellerAddress
  askPrice, currency: "USDC"
  aiSuggestedPrice: { min, max, fair }
  escrow: { status: "none"|"funded"|"released"|"refunded"|"disputed", onChainEscrowId? }
  status: "active"|"pending_escrow"|"sold"|"cancelled"
  createdAt

verificationReports/{ticketId}              # full AI breakdown — source of the expandable Trust Score card
  agentResults: { ocr, qr, metadata, fraud, ownership }   # each = structured agent output
  flags: string[]
  createdAt

trustScores/{entityType_entityId}           # single source of truth for BOTH ticket and seller scores
  entityType: "ticket"|"user"
  score: number                             # 0-100
  breakdown: { verifiedQr, verifiedSeller, noDuplicate, fairPrice, transferEligible, lowFraudRisk }
  updatedAt

transactions/{txId}                         # full audit trail: purchase, transfer, refund
  type, ticketId, fromAddress, toAddress, amount, txHash, status, createdAt

attendance/{attendanceId}
  ticketId, walletAddress, venue, checkedInAt

memoryCards/{cardId}
  ticketId, walletAddress
  aiSummary, highlights: string[], shareImageUrl
  mintedAt

agentLogs/{logId}                           # every agent invocation — audit + debugging, cheap to keep
  agentName, ticketId?, input, output, confidence, latencyMs, createdAt
```

Two dedup decisions worth calling out: (1) trust score is **not** stored on `users` or `tickets` — it lives
once in `trustScores`, keyed by entity, so a ticket's score and a seller's score are the same shape and
never drift from a cached copy; (2) escrow state lives inside the `marketplaceListings` doc it belongs to
rather than a separate top-level collection, since a listing has at most one active escrow.

---

## 5. Smart Contract Architecture (Injective EVM Testnet)

**Superseded by `docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md`** — see the v3 changelog above. Three
contracts, not five: `OwnershipRegistry`, `EscrowMarketplace`, `AttendanceRegistry`. Each still sits
behind its own interface in `contracts/interfaces/`, and a contract only ever depends on another
contract's **interface**, never its implementation — that's what lets any one of them be replaced later
without touching the others. Kept minimal and gas-efficient; state changes emit events liberally since the
backend indexes off those events into the off-chain store rather than polling.

| Contract | Responsibility | Notes |
|---|---|---|
| **OwnershipRegistry** | mints & tracks the Ownership Certificate (ERC-721) per ticket; single source of truth for "who owns this ticket on-chain"; anchors a `verificationHash` + `metadataHash` per ticket | `VERIFIER_ROLE` = Trust Engine backend signer, granted only after verification passes; transfers restricted to `MARKETPLACE_ROLE`/`ATTENDANCE_ROLE` callers only |
| **EscrowMarketplace** | listing creation/cancellation/expiry; locks buyer's USDC until a purchase completes; releases funds + ownership together; refund + dispute path | the only contract users' purchase transactions target directly; merges what used to be two separate `Escrow`/`Marketplace` contracts |
| **AttendanceRegistry** | marks a ticket as attended at check-in; emits the event that triggers badge/memory-card generation later | write access gated to a venue-check-in signer role; deliberately minimal — badges/memory cards are future contracts that subscribe to its events |

Deployed straight to Injective EVM Testnet RPC via Hardhat scripts — no local devnet container. Non-upgradeable
for the hackathon build (proxy/UUPS upgradeability is a deliberate later stretch, not MVP — adding it now
would be over-building before there's a v2 to migrate to). Full storage layout, interfaces, events, security
model, sequence diagrams, and deployment plan: `docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md`.

---

## 6. AI Architecture

**Not a chatbot** — ten single-purpose agents, each a pure function with a typed input and a **structured
JSON output**, coordinated only by the Orchestrator. Agents never call each other directly — if Fraud needs
something Metadata produced, that dependency is expressed as Orchestrator sequencing, not a cross-agent call.

```
Central AI Orchestrator (apps/api/src/ai/orchestrator.ts)
  ├── OCR Agent               — extract event/seat/date from uploaded ticket
  ├── QR Agent                — decode QR, hash it, check duplicate registry
  ├── Metadata Agent          — cross-check extracted data against known fixtures
  ├── Fraud Agent             — image integrity / tampering / screenshot detection
  ├── Ownership Agent         — claimed seller vs actual on-chain/Firestore owner
  ├── Pricing Agent           — fair price band from comps + demand
  ├── Seller Reputation Agent — recompute a seller's trustScores/user_{addr} entry
  ├── Marketplace Agent       — ranking/filtering/"AI Suggested Deals"
  ├── Insurance Agent         — premium (x402-gated): risk-priced purchase insurance quote
  └── Transfer Agent          — orchestrates the post-escrow-release handoff: certificate transfer,
                                 dynamic QR regeneration, Firestore + on-chain state sync
```

**Trust Score card mapping** — every badge on the card traces to a specific agent, so "explain WHY" is just
surfacing `verificationReports/{ticketId}.agentResults`:

| Card badge | Source agent(s) |
|---|---|
| Verified QR | QR Agent |
| No Duplicate | QR Agent (duplicate hash check) |
| Verified Seller | Ownership Agent + Seller Reputation Agent |
| Fair Price | Pricing Agent |
| Transfer Eligible | Ownership Agent + TrustRegistry on-chain state |
| Low Fraud Risk | Fraud Agent |

### MCP as the agents' tool bus

Rather than each agent hardcoding an OCR SDK call or a chain read, `apps/api/src/mcp/` hosts an **internal
MCP server** exposing tools: `ocr.extract`, `qr.decode`, `metadata.lookup`, `chain.read`, `price.history`,
`fraud.dbLookup`, `verification.crossCheck`. Agents are MCP **clients** that call these tools. This is the
literal implementation of "every verification module becomes an Agent Skill" — the tool is the skill, the
agent is the reasoning layer that decides which skills to invoke and how to weigh the result. It also means
swapping mock OCR for a real Vision API later is a one-tool change behind the MCP server, not an agent
rewrite.

MVP: OCR/Fraud/Metadata run against mocked-but-deterministic tool outputs; QR decode, chain reads, and price
history are real from day one (cheap, no external dependency).

---

## 7. Trust Engine Architecture

The Trust Engine (`apps/api/src/trustEngine/`) is the mandatory choke point — **services** call it,
it's the only thing that talks to the Orchestrator, `web3/`, and `repositories/` together:

```
trustEngine/
  verifyTicket(submission)        → orchestrator runs OCR/QR/Metadata/Fraud/Ownership
                                     → writes verificationReports + trustScores(ticket)
                                     → on pass: web3.mintCertificate → repositories.updateTicket
  listTicket(ticketId, askPrice)  → Pricing Agent suggestion → repositories.createListing
  openEscrow(listingId, buyer)    → web3.fundEscrow → repositories.updateListing(escrow.status)
  releaseEscrow(escrowId)         → Transfer Agent → web3 atomic swap → repositories writes
                                     → Seller Reputation Agent recompute
  checkIn(ticketId, walletAddress)→ web3.markAttendance → repositories.createAttendance
                                     → triggers memory card generation
  getRiskProfile(walletAddress)   → riskAnalysis (disputes/fraud history from agentLogs + trustScores)
  getTrustScore(entityType, id)   → repositories read of trustScores/{entityType_id}
  requestPremiumService(kind)     → x402 paywall middleware → Insurance/Fraud-investigation agents
```

Every mutating call ends in a `trustEvents`-equivalent write (a new `agentLogs` entry plus, where relevant,
a `trustScores` recompute) — one consistent path for score updates instead of ad hoc writes scattered across
services.

---

## 8. Injective Integration

- **Agent Skills** — each MCP tool (`ocr.extract`, `qr.decode`, …) is registered as an Agent Skill; agents
  compose skills rather than embedding vendor SDKs directly.
- **MCP Server** — internal tool bus described in §6; same server can optionally be exposed externally in a
  later phase for third-party agents to query trust data.
- **x402** — gates exactly the premium tier, nothing else: Priority Verification, Professional Verification,
  Fraud Investigation, Insurance quote, Legal Verification Report. Implemented as Express middleware that
  intercepts `/api/v1/premium/*` and requires a settled x402 payment before the controller runs.
- **USDC + CCTP** — buyer pays in USDC from any supported wallet; Escrow contract holds it; CCTP handles the
  cross-chain leg when the buyer's USDC originates off Injective; seller receives on successful transfer.

---

## 9. Application State Flow (Frontend)

- **Zustand** — `walletStore` (address, chainId, connection status — synced from wagmi), `uiStore` (active
  sheet/modal, toasts). Small, no persisted business data.
- **React Query** — all server state: tickets, listings, wallet summary, trust reports. Query key factory in
  `lib/query/` so invalidation after a mutation (buy, list, cancel) is centralized, not sprinkled per
  component.
- **React Hook Form + Zod** — every form (ticket upload, listing creation) validated against a schema
  imported from `packages/shared`, the same schema the backend validator middleware enforces.
- **Flow shape**: user action → RHF/Zod validated → `lib/api` call → backend Trust Engine → Firestore/chain
  write → React Query invalidates → UI re-renders from fresh server state. No client ever mutates local
  copies of trust/ownership data optimistically — those fields are too consequential to guess at.

---

## 10. User Flow (unchanged from v1, confirmed against this spec)

Connect wallet (no login) → upload ticket on `/verify` → live agent pipeline with animated stepper → Trust
Score card (expandable, badge-by-badge explanation) → mint Ownership Certificate → list on `/marketplace`
with AI price suggestion → buyer reviews Trust Report → pays USDC → Escrow locks → atomic transfer → dynamic
QR issued → `/wallet` updates instantly → venue check-in → Attendance Badge unlocks → post-match AI summary
+ Memory Card, shareable.

---

## 11. Development Roadmap

**Phase 1 — Foundation**
Monorepo setup, folder structure, design system + shadcn primitives, wallet connect (Injective EVM Testnet),
Firebase project wiring, Landing page, nav/shell.

**Phase 2 — Verification core**
Ticket upload (Storage), verification pipeline UI, mocked-but-deterministic AI agents, Trust Score card.

**Phase 3 — Marketplace & Wallet**
Listing CRUD, buy/sell/relist/cancel flows against mock escrow state, Wallet page with all asset tabs.

**Phase 4 — Chain integration**
Deploy the 5 contracts to Injective EVM Testnet, wire OwnershipRegistry/Escrow/Marketplace/AttendanceRegistry
into the Trust Engine for real (replacing mock escrow/ownership state).

**Phase 5 — Injective-native integrations**
MCP tool bus for agents, Agent Skills registration, x402 premium tier, USDC + CCTP settlement.

**Phase 6 — Polish**
Animation pass, error/empty/loading states, accessibility, performance, tests, README + this doc kept
current, deployment (Vercel for `apps/web`, a plain Node host for `apps/api`, Firebase, Injective testnet).

---

**Not building yet.** This is the shared map for the whole team (and for future-me). Per your instruction we
stop here for this pass — next step, when you give the go-ahead, is Phase 1: scaffold the monorepo
(`apps/web`, `apps/api`, `apps/contracts`, `packages/shared`) with working wallet connect and the design
system shell, nothing else, before moving to Phase 2.
