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

/**
 * This RPC never responds to eth_maxPriorityFeePerGas (hangs indefinitely), so any tx that lets
 * viem/wagmi estimate EIP-1559 fees itself hangs or surfaces as a generic wallet "interaction
 * failed" error before a signature prompt ever appears. Every write — backend (apps/api/src/web3/
 * client.ts) or wallet-signed frontend tx — must pass gasPrice explicitly to force a legacy tx.
 */
export const INJECTIVE_TESTNET_GAS_PRICE = 200_000_000n;
export const INJECTIVE_TESTNET_GAS_LIMIT = 6_000_000n;
