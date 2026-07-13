/**
 * Circle CCTP domain IDs for source chains FanPass accepts a cross-chain buy from. These are Circle's
 * stable, long-published v1 domain assignments — not guessed. Injective's own CCTP testnet domain
 * (live since March 2026, per docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 1) is deliberately NOT hardcoded
 * here: it's supplied via CCTP_INJECTIVE_DOMAIN when a real (non-simulated) relayer is configured, rather
 * than inventing a number this document can't verify.
 */
export const CCTP_SOURCE_DOMAINS = {
  ethereum: 0,
  avalanche: 1,
  optimism: 2,
  arbitrum: 3,
  base: 6,
  polygon: 7,
} as const;

export type CctpSourceChain = keyof typeof CCTP_SOURCE_DOMAINS;
