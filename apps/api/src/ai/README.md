# ai

`orchestrator.ts` coordinates the 10 agents in `agents/` (OCR, QR, Metadata, Fraud, Ownership, Pricing,
Seller Reputation, Marketplace, Insurance, Transfer). Agents never call each other directly — only the
orchestrator sequences them. Each agent returns a structured `AgentResult<T>` (see
`packages/shared/src/types/agents.ts`). MVP agents are mocked-but-deterministic; see
`docs/ARCHITECTURE.md` §6. Filled in from Phase 2 onward.
