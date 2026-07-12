# apps/contracts

Solidity contracts (Hardhat), deployed straight to Injective EVM Testnet — no local devnet container.

**Not scaffolded yet — Phase 4.** Per `docs/ARCHITECTURE.md` §5, this app will hold five independent
contracts, each behind its own interface:

```
contracts/
├── interfaces/
│   ├── IOwnershipRegistry.sol
│   ├── IEscrow.sol
│   ├── IMarketplace.sol
│   ├── ITrustRegistry.sol
│   └── IAttendanceRegistry.sol
├── OwnershipRegistry.sol      # ERC-721 Ownership Certificate
├── Escrow.sol                 # locks buyer USDC + seller certificate until purchase completes
├── Marketplace.sol            # listing/purchase orchestration
├── TrustRegistry.sol          # on-chain trust checkpoint anchoring
└── AttendanceRegistry.sol     # check-in marking, triggers badge/memory-card generation
```

Phase 1–3 use mocked ownership/escrow state in Firestore (`apps/api/src/trustEngine`) so the frontend and
backend can be built against a stable contract **interface** before real Solidity exists. Phase 4 replaces
the mock with real Hardhat-deployed contracts without changing that interface.
