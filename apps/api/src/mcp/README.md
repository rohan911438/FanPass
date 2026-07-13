# mcp

Internal MCP tool bus — in-process, never network-exposed, never called by the frontend (see
`docs/PHASE_5_ECOSYSTEM_INTEGRATION.md` Part 3). `server.ts` is the one entry point (`callTool`) every
Skill (`apps/api/src/skills/`) uses to reach a capability; it handles caching, bounded retries with
backoff, per-call timeouts, and a fallback once retries are exhausted.

Tools (`tools/`): `ocr.extract`, `qr.decode`, `metadata.lookup`, `chain.read`, `price.history` are real;
`fraud.dbLookup` and `image.forensics` are no-op stubs pending a chosen vendor (Part 2's premium reports).
`tools/index.ts` registers all of them as a side effect, imported once from `app.ts` at boot.
