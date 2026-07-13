# apps/contracts

Solidity contracts (Hardhat), deployed straight to Injective EVM Testnet — no local devnet container.

**Not scaffolded yet.** Full design (storage layout, interfaces, events, security model, deployment plan,
sequence diagrams, CCTP/x402/MCP integration) lives in `docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md` — read
that before writing any contract code. Three contracts, not five:

```
contracts/
├── interfaces/
│   ├── IOwnershipRegistry.sol
│   ├── IEscrowMarketplace.sol
│   └── IAttendanceRegistry.sol
├── OwnershipRegistry.sol      # ERC-721 Ownership Certificate — ownership, verification/metadata hashes
├── EscrowMarketplace.sol      # listing + escrow lifecycle (locks USDC, releases with ownership transfer)
├── AttendanceRegistry.sol     # check-in marking; deliberately minimal foundation for later badges/memory cards
└── mocks/
    └── MockUSDC.sol
```

Phase 1–3 use mocked ownership/escrow state in a local JSON store (`apps/api/src/trustEngine`,
`apps/api/src/config/localStore.ts`) so the frontend and backend can be built against a stable contract
**interface** before real Solidity exists. Phase 4 replaces the mock with real Hardhat-deployed contracts
without changing that interface — see `docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md` §14 for the exact
function-by-function migration plan.
