import "dotenv/config";
import { INJECTIVE_TESTNET_CONTRACTS, INJECTIVE_EVM_TESTNET } from "@fanpass/shared";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  web3: {
    rpcUrl: process.env.INJECTIVE_EVM_TESTNET_RPC ?? INJECTIVE_EVM_TESTNET.rpcUrl,
    chainId: INJECTIVE_EVM_TESTNET.id,
    // The Trust Engine's own signer — holds VERIFIER_ROLE (mint) and VENUE_VERIFIER_ROLE (check-in).
    // Never used to sign a user's own marketplace transactions (list/buy/cancel) — those are signed by
    // the connected wallet in apps/web. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md.
    trustEngineSignerPrivateKey: process.env.TRUST_ENGINE_SIGNER_PRIVATE_KEY,
    ownershipRegistryAddress: (process.env.OWNERSHIP_REGISTRY_ADDRESS ?? INJECTIVE_TESTNET_CONTRACTS.ownershipRegistry) as `0x${string}`,
    escrowMarketplaceAddress: (process.env.ESCROW_MARKETPLACE_ADDRESS ?? INJECTIVE_TESTNET_CONTRACTS.escrowMarketplace) as `0x${string}`,
    attendanceRegistryAddress: (process.env.ATTENDANCE_REGISTRY_ADDRESS ?? INJECTIVE_TESTNET_CONTRACTS.attendanceRegistry) as `0x${string}`,
    usdcAddress: (process.env.USDC_ADDRESS ?? INJECTIVE_TESTNET_CONTRACTS.usdc) as `0x${string}`,
  },
  premium: {
    // Backend only ever verifies incoming transfers here — never sends from this address, no key needed.
    // No real default: an unconfigured receiver means every premium payment check fails closed, not open.
    paymentReceiverAddress: (process.env.X402_PAYMENT_RECEIVER_ADDRESS ??
      "0x0000000000000000000000000000000000000000") as `0x${string}`,
  },
  cctp: {
    // Off by default — the simulated provider (deterministic, no external account needed) is the default,
    // matching this repo's existing "mocked-but-deterministic now, real vendor later" convention.
    live: process.env.CCTP_LIVE === "true",
    injectiveDomain: process.env.CCTP_INJECTIVE_DOMAIN ? Number(process.env.CCTP_INJECTIVE_DOMAIN) : null,
  },
} as const;
