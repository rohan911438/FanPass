import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { metaMaskWallet, rainbowWallet, safeWallet, base, walletConnectWallet } from "@rainbow-me/rainbowkit/wallets";
import { createConnector } from "wagmi";
import { injected } from "wagmi/connectors";
import { http, type EIP1193Provider } from "viem";
import { injectiveEvmTestnet } from "./chain";

/**
 * Finds MetaMask's own injected provider via EIP-6963 (`eip6963:announceProvider`), which
 * identifies each wallet by a unique `rdns` string instead of self-reported boolean flags like
 * `isMetaMask`. Wagmi's built-in `injected({ target: "metaMask" })` heuristic only checks those
 * flags, and Keplr — which injects its own Ethereum-compatible provider for Injective's EVM side —
 * sets `isMetaMask: true` on it for dApp compatibility. That makes wagmi's heuristic grab Keplr's
 * provider instead of MetaMask's whenever Keplr is installed. rdns can't be confused this way.
 */
function findMetaMaskViaEip6963(): { id: string; name: string; provider: EIP1193Provider } | undefined {
  if (typeof window === "undefined") return undefined;
  let match: EIP1193Provider | undefined;
  const onAnnounce = (event: Event) => {
    const { info, provider } = (event as CustomEvent).detail ?? {};
    if (info?.rdns === "io.metamask") match = provider;
  };
  window.addEventListener("eip6963:announceProvider", onAnnounce);
  window.dispatchEvent(new Event("eip6963:requestProvider"));
  window.removeEventListener("eip6963:announceProvider", onAnnounce);
  return match ? { id: "metaMask", name: "MetaMask", provider: match } : undefined;
}

/**
 * RainbowKit's built-in metaMaskWallet routes through @metamask/sdk even when the extension is
 * already injected, and that SDK performs its own network handshake on connect(). If that call
 * can't complete (same class of failure as the WalletConnect/Reown relay 403ing below — a
 * restrictive dev network, VPN, or ad/tracker blocker), connect() just hangs forever: no popup,
 * no error, nothing. Keep the built-in wallet's branding/icon but swap its connector for wagmi's
 * plain `injected` connector, targeted at MetaMask's real provider via EIP-6963.
 */
const reliableMetaMaskWallet: typeof metaMaskWallet = (walletParams) => {
  const metaMaskDetails = metaMaskWallet(walletParams);
  return {
    ...metaMaskDetails,
    createConnector: (walletDetails) =>
      createConnector((config) => ({
        ...injected({ target: findMetaMaskViaEip6963 })(config),
        ...walletDetails,
      })),
  };
};

/**
 * projectId is a public WalletConnect Cloud identifier (not a secret) — get a free one at
 * cloud.walletconnect.com and set NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID. Injected wallets (MetaMask
 * etc.) still connect without it; only the WalletConnect QR flow needs a real id.
 */
export const wagmiConfig = getDefaultConfig({
  appName: "FanPass",
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? "fanpass-dev-placeholder",
  chains: [injectiveEvmTestnet],
  wallets: [
    {
      groupName: "Popular",
      wallets: [safeWallet, rainbowWallet, base, reliableMetaMaskWallet, walletConnectWallet],
    },
  ],
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
