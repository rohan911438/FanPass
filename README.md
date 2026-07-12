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
page, nav/shell, and a working Express API skeleton. All four routes render, both dev servers verified
running. See §11 of the architecture doc for the full phase plan — Phase 2 (verification core) is next.
"# FanPass" 
