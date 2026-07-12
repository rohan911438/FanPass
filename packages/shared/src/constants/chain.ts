/**
 * Injective EVM Testnet — verified against docs.injective.network (connect-with-metamask), not guessed.
 * Single source of truth: apps/web's wagmi config and apps/api's viem clients both import this.
 */
export const INJECTIVE_EVM_TESTNET = {
  id: 1439,
  name: "Injective EVM Testnet",
  nativeCurrency: {
    name: "Injective",
    symbol: "INJ",
    decimals: 18,
  },
  rpcUrl: "https://k8s.testnet.json-rpc.injective.network/",
  blockExplorerUrl: "https://testnet.blockscout.injective.network",
} as const;
