# FanPass — Pitch Deck Generation Prompt

Copy the prompt below into an AI slide generator (Gamma, Canva Magic Design, Tome, ChatGPT, etc.)
to produce a 7-slide pitch deck for FanPass.

---

```
Create a 7-slide pitch deck for a hackathon/product presentation.

Team: BROTHERHOOD
Team Member: Rohan Kumar
Product: FanPass — An AI-powered Trust Network for peer-to-peer World Cup ticket resale

Slide 1 — Title Slide
- Product name: FanPass
- Tagline: "Certainty that the ticket you're buying is real, unique, and actually owned by the seller"
- Team: BROTHERHOOD
- Member: Rohan Kumar
- Clean, modern design, dark background, subtle blockchain/ticket motif

Slide 2 — Problem Statement
- Headline: "The 2026 World Cup will be the largest ticketed event in history — and resale is broken"
- Bullet points:
  - Duplicated tickets: one screenshot/PDF sold to 5 buyers, only 1 gets in
  - Forged/altered tickets: seat, date, venue edited with no way to verify
  - No recourse: peer-to-peer resale = wire transfer + prayer
  - No price signal: buyers can't tell fair resale price from scalping
- Closing line: "Putting it on the blockchain alone doesn't fix this — the real problem is verifying a ticket is real BEFORE it's tokenized or paid for"

Slide 3 — Our Solution
- Headline: "A 6-agent AI Trust Engine in front of every ticket"
- Two-column layout:
  Buyers get: Explainable Trust Score (0-100), fraud detection before money moves, escrow-held funds
  Sellers get: One verification pass turns a photo into a tradeable on-chain asset, fair-price guidance, compounding reputation
- Key line: "FanPass never touches anyone's money and never signs transactions on a user's behalf — fully non-custodial"

Slide 4 — How It Works (End to End)
- Simple 5-step flow diagram: Verify → Mint → List → Buy → Own
  1. Verify: seller uploads photo, 6 AI agents check it independently
  2. Mint: on-chain Ownership Certificate (ERC-721) minted only if verified
  3. List: seller signs their own createListing transaction
  4. Buy: buyer reviews Trust Score + reputation, signs approve/escrow/release
  5. Own: certificate transfers atomically with fund release
- Note: Trust Score ≥70 with no critical failures required to pass

Slide 5 — Architecture
- Three-layer diagram:
  1. Client (apps/web): Next.js + wagmi/RainbowKit for wallet-signed transactions
  2. Backend (apps/api): Express + TypeScript AI Orchestrator running 6 agents (OCR, QR, Metadata, Fraud, Ownership, Pricing) feeding a Trust Engine
  3. Chain (Injective EVM Testnet): OwnershipRegistry (ERC-721), EscrowMarketplace (non-custodial escrow), AttendanceRegistry (venue check-in), MockUSDC
- Tech stack footer: Next.js, React, Tailwind, Express, TypeScript, Solidity, Hardhat, OpenZeppelin, Injective EVM Testnet

Slide 6 — Current Status & Traction
- Phase 1-4 complete and deployed:
  - Full monorepo, wallet connect, ticket upload + 6-agent verification pipeline
  - Live marketplace: listing, browsing, non-custodial buy/escrow, seller reputation
  - 3 smart contracts live on Injective EVM Testnet
  - 51 passing tests (unit, integration, security — including reentrancy attack test)
- Live links: fanpass-web-six.vercel.app (app) / fanpass-api-production.up.railway.app (API)

Slide 7 — Future Roadmap
- Phase 5 (in progress): MCP tool bus for AI agents, x402 premium verification tiers, USDC/CCTP cross-chain settlement
- Next milestones:
  - Replace deterministic-mock OCR and Fraud agents with real Vision OCR + image-forensics models
  - Split VERIFIER_ROLE / VENUE_VERIFIER_ROLE onto separate signers (currently deployer wallet)
  - Mainnet deployment path beyond testnet
  - Scale Trust Engine to other high-fraud ticketed events beyond World Cup 2026
- Closing tagline: "Trust, minted before the trade — not after"

Design guidance: professional, fintech/blockchain aesthetic, dark navy or black background with a single accent color (electric blue or green), minimal text per slide, use icons for the 6 agents and the 4 smart contracts, include the sequence flow (Verify→Mint→List→Buy→Own) as a horizontal diagram on slide 4.
```
