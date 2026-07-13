# ai

Home of the agent bodies in `agents/` (OCR, QR, Metadata, Fraud, Ownership, Pricing, Seller Reputation,
Marketplace ranking). Each returns a structured `AgentResult<T>` (see `packages/shared/src/types/agents.ts`).
MVP agents are mocked-but-deterministic; see `docs/ARCHITECTURE.md` §6.

As of Phase 5, these bodies are invoked through `apps/api/src/skills/*.skill.ts` wrappers, sequenced by
`apps/api/src/planner/planner.ts` rather than the old fixed-sequence `orchestrator.ts` (retired — see
`docs/PHASE_5_ECOSYSTEM_INTEGRATION.md` Part 4/5). `marketplace.agent.ts`'s ranking function is still
called directly by `marketplaceService.ts`, unwrapped — it's a listing-feed concern, not a per-ticket
verification skill.
