import { INJECTIVE_TESTNET_CONTRACTS, escrowMarketplaceAbi, mockUsdcAbi, ownershipRegistryAbi } from "@fanpass/shared";

/**
 * Wagmi-ready {address, abi} pairs. Listing/buy/cancel transactions are sent straight from these
 * configs using the connected wallet as signer — apps/web never proxies a marketplace transaction
 * through the backend. See docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md.
 */
export const escrowMarketplaceContract = {
  address: INJECTIVE_TESTNET_CONTRACTS.escrowMarketplace,
  abi: escrowMarketplaceAbi,
} as const;

export const ownershipRegistryContract = {
  address: INJECTIVE_TESTNET_CONTRACTS.ownershipRegistry,
  abi: ownershipRegistryAbi,
} as const;

export const mockUsdcContract = {
  address: INJECTIVE_TESTNET_CONTRACTS.usdc,
  abi: mockUsdcAbi,
} as const;

export const USDC_DECIMALS = 6;
