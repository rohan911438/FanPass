import { getDefaultConfig } from "@rainbow-me/rainbowkit";
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
});
