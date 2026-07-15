# FanPass — For Judges

A short, verifiable summary of what's real, what's live, and how to check it yourself in under 5 minutes.
Team **BROTHERHOOD** — Rohan Kumar.

---

## 1. The one-liner

FanPass is an AI-powered Trust Network for peer-to-peer World Cup ticket resale. Not an NFT marketplace,
not a chatbot wrapper — it sells one thing: certainty that the ticket you're buying is real, unique, and
actually owned by the person selling it, with blockchain and AI working invisibly underneath.

## 2. The problem

The 2026 World Cup will be the largest ticketed event in history, and peer-to-peer resale runs on trust
falling apart: duplicated screenshots sold to multiple buyers, forged seat/date/venue details, no recourse
when a "ticket" turns out to be fake, and no honest price signal. Putting a ticket on-chain doesn't fix any
of this by itself — an NFT is only as trustworthy as the process that minted it. The real problem is
upstream: verifying a ticket is real **before** anything is tokenized or paid for.

## 3. The solution

A **6-agent AI Trust Engine** runs on every uploaded ticket. Only if it passes does FanPass mint an
on-chain **Ownership Certificate** (ERC-721). From there, every buy/sell/escrow action is signed by the
user's own wallet — FanPass's backend never holds funds and never signs a transaction on a user's behalf.

| Agent | Checks | Status |
|---|---|---|
| QR | Decodes the real QR in the image, flags duplicate fingerprints | **Real** — `jimp` + `jsqr` |
| Ownership | Claimed seller vs. wallet actually holding the certificate | **Real** — checked against live store state |
| Metadata | Claimed event/venue/date vs. a known-fixtures table | **Real** lookup |
| Pricing | Fair-price band from other active listings for the same event | **Real** comps calculation |
| OCR | Extracted fields vs. claimed fields | Deterministic mock (real Vision OCR planned) |
| Fraud | Tamper/editing-artifact/screenshot detection | Deterministic mock (real image-forensics planned) |

We disclose this table openly because "everything is AI-verified" is a claim judges should be able to
falsify — half of this pipeline is genuinely live today, and we say so rather than blur the line.

A ticket only becomes `verified` (and only then gets minted) when its Trust Score is ≥ 70 **and** none of
the critical-failure conditions trip: duplicate QR fingerprint, seller mismatch against the on-chain owner
of record, or an unexplainable tamper score.

## 4. What's actually deployed right now (verify these yourself)

- **Live app:** https://fanpass-web-six.vercel.app
- **Live API health check:** https://fanpass-api-production.up.railway.app/api/v1/health
- **Chain:** Injective EVM Testnet, chain ID `1439`, RPC `https://k8s.testnet.json-rpc.injective.network/`
- **Contracts (click through to Blockscout, read the deployed bytecode yourself):**

  | Contract | Address |
  |---|---|
  | OwnershipRegistry (ERC-721 Ownership Certificates) | [`0xa05aaa4931706010A1e9089f8E12B9A5c1cA400d`](https://testnet.blockscout.injective.network/address/0xa05aaa4931706010A1e9089f8E12B9A5c1cA400d) |
  | EscrowMarketplace (listings + non-custodial escrow) | [`0x69fF99DeF5B4c023f796b3a676a6B663c8307990`](https://testnet.blockscout.injective.network/address/0x69fF99DeF5B4c023f796b3a676a6B663c8307990) |
  | AttendanceRegistry (venue check-in) | [`0x0637ec0842009EA4fa3b900576d70D3423994175`](https://testnet.blockscout.injective.network/address/0x0637ec0842009EA4fa3b900576d70D3423994175) |
  | MockUSDC (testnet settlement token) | [`0x72803FA50A1deb16AEc66677F81C16bfc2708da8`](https://testnet.blockscout.injective.network/address/0x72803FA50A1deb16AEc66677F81C16bfc2708da8) |

- **Test suite (run it yourself):**
  ```bash
  cd apps/contracts
  npm run test
  ```
  51 passing tests across `OwnershipRegistry.test.ts`, `EscrowMarketplace.test.ts`,
  `AttendanceRegistry.test.ts`, `integration/FullLifecycle.test.ts`, and
  `security/Reentrancy.test.ts` — a dedicated reentrancy-attack test, not just happy-path coverage.

## 5. Architecture

```
apps/web (Next.js, wagmi + RainbowKit)
        │  wallet-signed txs only — backend never signs on a user's behalf
        ▼
apps/api (Express + TypeScript)
   AI Orchestrator → 6 agents (OCR, QR, Metadata, Fraud, Ownership, Pricing) → Trust Engine
        │
        ▼
Injective EVM Testnet
   OwnershipRegistry (ERC-721) · EscrowMarketplace (non-custodial escrow)
   AttendanceRegistry (check-in) · MockUSDC (test settlement)
```

**One real engineering decision worth knowing about:** the public Injective Testnet RPC's log/receipt
indexes (`eth_getLogs`, `eth_getTransactionReceipt`) proved unreliable during development — confirmed
transactions were sometimes unfindable by hash for minutes. So FanPass doesn't sync chain state by
watching event logs; it confirms by polling the sender's nonce and reconciles marketplace state by
reading current contract state directly (`listingOf`, `getListing`, `getEscrow`). That's a decision made
in response to a real problem hit on this specific testnet, not a theoretical design choice. Full rationale:
[`docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md`](./PHASE_4_BLOCKCHAIN_ARCHITECTURE.md).

## 6. Why non-custodial matters here

FanPass's backend never holds a private key on a user's behalf, never touches escrowed funds, and never
signs a marketplace transaction. Every meaningful state change — `createListing`, `approve`, `buy`,
`releaseEscrow` — is a transaction the user's own connected wallet signs. If FanPass's backend disappeared
tomorrow, funds already in escrow and certificates already minted would still be recoverable directly from
the contracts — nothing about ownership or fund custody depends on FanPass staying online.

## 7. Roadmap (Phase 5, in progress)

Full design docs already written and reviewed (`docs/PHASE_5_ECOSYSTEM_INTEGRATION.md`), implementation
next, in this order:

1. **Wallet/contract wiring completion** — `apps/api` calling `web3/*` directly instead of the local store
   standing in for it (prerequisite for everything below).
2. **CCTP cross-chain settlement** — a buyer holding USDC on Base/Ethereum clicks "Buy" and it just works,
   no manual bridging, no user-visible mention of "CCTP."
3. **x402 premium verification tiers** — six pay-per-use deep-verification endpoints (deep fraud
   investigation, image forensics, legal verification reports, etc.), priced per request instead of behind
   a subscription nobody wants for a once-a-year ticket purchase.
4. **MCP tool bus + Agent Skills** — internal architecture (not user-facing) that turns swapping mocked
   OCR/fraud for real vendors into a config change, not a rewrite.

## 8. What we deliberately did *not* build

- No subscriptions anywhere — x402 is designed to replace that need entirely.
- No upgradeable/proxy contracts — deliberate, see `PHASE_4_BLOCKCHAIN_ARCHITECTURE.md` §15.
- No public-facing MCP endpoint — MCP is internal-only by design, never called from the frontend.
- No mainnet deployment yet — testnet only, honestly labeled as such everywhere.

We'd rather ship something narrow and independently verifiable than something broad and hand-wavy.
