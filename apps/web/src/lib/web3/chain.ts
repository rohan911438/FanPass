import { defineChain } from "viem";
import { INJECTIVE_EVM_TESTNET } from "@fanpass/shared";

/** Wraps the shared chain constants in viem's chain shape for wagmi/RainbowKit. */
export const injectiveEvmTestnet = defineChain({
  id: INJECTIVE_EVM_TESTNET.id,
  name: INJECTIVE_EVM_TESTNET.name,
  nativeCurrency: INJECTIVE_EVM_TESTNET.nativeCurrency,
  rpcUrls: {
    default: { http: [INJECTIVE_EVM_TESTNET.rpcUrl] },
  },
  blockExplorers: {
    default: { name: "Blockscout", url: INJECTIVE_EVM_TESTNET.blockExplorerUrl },
  },
  testnet: true,
});
