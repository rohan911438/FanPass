# FanPass

AI-powered Ticket Trust Network for peer-to-peer World Cup ticket resale. Not an NFT marketplace — users buy
verified tickets; blockchain is invisible infrastructure underneath.

Architecture, schema, roadmap: see [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md).

## Monorepo layout

```
apps/web         Next.js frontend (Landing, Verify Ticket, Marketplace, Wallet)
apps/api         Express + TypeScript backend (Trust Engine, AI orchestrator, Firestore repositories)
apps/contracts   Solidity contracts (Hardhat) — scaffolded in Phase 4
packages/shared  Types + Zod schemas shared between web and api
```

## Getting started

```bash
npm install
npm run dev:web    # http://localhost:3000
npm run dev:api    # http://localhost:4000
```

No Docker. Database is Firebase (Firestore + Storage). Identity is a connected EVM wallet address on the
Injective EVM Testnet — no login, no auth system.

## Status

Phase 1 complete: monorepo scaffold, design system shell, wallet connect (Injective EVM Testnet), Landing
page, nav/shell, and a working Express API skeleton.

Phase 2 complete: `/verify` is real end to end — ticket upload (multipart → Firebase Storage), a 6-agent
AI Orchestrator (OCR/Metadata/Fraud mocked-but-deterministic, QR/Ownership real against Firestore, Pricing
a flat-comps placeholder), the Trust Engine writing `verificationReports`/`trustScores`/`agentLogs`/mocked
`ownershipCertificates`, a live-polling `VerificationStepper`, and an expandable `TrustScoreCard`.

Phase 3 complete: `/marketplace` and `/wallet` are real. Sellers list verified tickets (Pricing Agent now
uses real comps from other active listings); buyers browse/filter a Marketplace Agent-ranked feed with "AI
Suggested Deals," review the reused `TrustScoreCard` Trust Report, and buy through a mocked Escrow state
machine (`none → funded → released`) shaped exactly like the real `Escrow.sol` call will look in Phase 4.
Every completed sale transfers the mocked ownership certificate, writes a `transactions` record, and
recomputes both parties' `trustScores/user_{address}` via a real (stats-driven) Seller Reputation Agent.
`/wallet` aggregates a connected address's real tickets, certificates, transactions, and listings in one
call; Attendance Badges and Memory Cards render the real (currently empty) data shape ahead of Phase 4/6.

Both phases require a real Firebase project (`apps/api/.env`, see `.env.example`) to exercise against
Firestore/Storage. See §11 of the architecture doc for the full phase plan — Phase 4 (chain integration)
is next.
