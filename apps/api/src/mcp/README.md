# mcp

Internal MCP server exposing tools agents call into: `ocr.extract`, `qr.decode`, `metadata.lookup`,
`chain.read`, `price.history`, `fraud.dbLookup`, `verification.crossCheck`. This is the literal
implementation of "every verification module becomes an Agent Skill" — see `docs/ARCHITECTURE.md` §6, §8.
Phase 5.
