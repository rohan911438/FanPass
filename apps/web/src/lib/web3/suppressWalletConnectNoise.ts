const BENIGN_MESSAGE_PATTERNS = [/connection interrupted while trying to subscribe/i];

/**
 * Without a real WalletConnect/Reown Cloud project id (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID), the
 * relay client's background subscription rejects on load — harmless (injected wallets like MetaMask
 * are unaffected), but Next's dev overlay treats any unhandled rejection as a fatal-looking error. Get
 * a free project id at cloud.reown.com and this stops being reachable entirely.
 */
export function suppressWalletConnectNoise(): () => void {
  const handler = (event: PromiseRejectionEvent) => {
    const message = event.reason instanceof Error ? event.reason.message : String(event.reason);
    if (BENIGN_MESSAGE_PATTERNS.some((pattern) => pattern.test(message))) {
      event.preventDefault();
    }
  };

  window.addEventListener("unhandledrejection", handler);
  return () => window.removeEventListener("unhandledrejection", handler);
}
