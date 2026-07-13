# apps/contracts

Solidity contracts (Hardhat), deployed to Injective EVM Testnet — no local devnet container.

Full design (storage layout, interfaces, events, security model, deployment plan, sequence diagrams,
CCTP/x402/MCP integration): [`docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md`](../../docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md).

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
    ├── MockUSDC.sol
    └── MaliciousReentrantERC20.sol   # security-test-only, proves the ReentrancyGuard actually blocks reentry
```

## Status: deployed to Injective EVM Testnet

51 passing tests (unit + integration + a reentrancy-attack security test — see `test/`). Deployed addresses
and role assignments: [`deployments/injectiveTestnet.json`](./deployments/injectiveTestnet.json), also
mirrored in the root `README.md`.

`apps/api` doesn't call these contracts yet. Phase 1–3 use mocked ownership/escrow state in a local JSON
store (`apps/api/src/trustEngine`, `apps/api/src/config/localStore.ts`) so the frontend and backend were
built against a stable contract **interface** before real Solidity existed. Wiring `apps/api/src/web3/*`
and an event indexer (§14 of the design doc) is the remaining step to make these contracts the actual
source of truth, without changing that interface.

## Commands (run from the repo root)

```bash
npm run contracts:compile
npm run contracts:test
npm run contracts:deploy:testnet   # resumable — see scripts/manual-deploy.ts
```

`scripts/manual-deploy.ts` is the deployment path actually used: the public testnet RPC
(`k8s.testnet.json-rpc.injective.network`) never responds to `eth_maxPriorityFeePerGas` and serves
`eth_getTransactionReceipt` inconsistently (a load-balanced backend with no session affinity), so it uses
legacy transactions, raw `fetch` with hard timeouts for every call, and confirms via nonce-advancement +
`eth_getCode`/`eth_call` instead of receipt polling. It's idempotent — rerunning resumes from whatever
`deployments/<network>.json` already has instead of redeploying. `scripts/01-04-*.ts` + `deploy-all.ts`
are the "well-behaved RPC" path per the design doc and work fine against Hardhat's local network.
