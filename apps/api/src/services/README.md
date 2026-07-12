# services

Business logic lives here (`ticketService`, `marketplaceService`, `walletService`…). Controllers call
services; services call the Trust Engine and repositories. Never Firestore or chain access directly here —
that's `repositories/` and `web3/`. Filled in from Phase 2 onward — see `docs/ARCHITECTURE.md` §1, §7.
