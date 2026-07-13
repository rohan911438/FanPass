import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { http } from "viem";
import { injectiveEvmTestnet } from "./chain";

/**
 * projectId is a public WalletConnect Cloud identifier (not a secret) — get a free one at
 * cloud.walletconnect.com and set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Injected wallets (MetaMask
 * etc.) still connect without it; only the WalletConnect QR flow needs a real id.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "FanPass",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "fanpass-dev-placeholder",
  chains: [injectiveEvmTestnet],
  ssr: true,
  // Every EIP-6963-announcing wallet extension gets rendered as its own RainbowKit list item keyed
  // by its rdns; with several installed, dev-mode Fast Refresh re-running this module re-registers
  // the same announcements and RainbowKit ends up with duplicate React keys. MetaMask and RainbowKit's
  // own curated connectors (Coinbase, WalletConnect, Rainbow, etc.) don't depend on this discovery.
  multiInjectedProviderDiscovery: false,
  // The Injective testnet RPC never responds to eth_maxPriorityFeePerGas and serves
  // eth_getTransactionReceipt inconsistently (load-balanced, no session affinity — see
  // docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md). A timeout + retries keeps receipt-polling from hanging.
  transports: {
    [injectiveEvmTestnet.id]: http(injectiveEvmTestnet.rpcUrls.default.http[0], {
      timeout: 20_000,
      retryCount: 3,
      retryDelay: 1_500,
    }),
  },
});
