"use client";

import { Loader2 } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom-styled wrap around RainbowKit's connect flow so it reads as a native FanPass control
 * ("Connect Wallet" / address chip), not an embedded crypto widget.
 */
export function WalletConnectButton() {
  // On reload, wagmi restores a persisted session: `address`/`chainId` (and so RainbowKit's
  // `account`/`chain` render props below) populate before wagmi's own `isConnected` flips true.
  // RainbowKit swaps `openAccountModal` for a silent no-op until `isConnected` is true, so without
  // this check the chip briefly renders as connected while clicking it does nothing.
  const { isConnected, isReconnecting } = useAccount();

  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        // RainbowKit/wagmi's client-side init can take a few seconds to finish under dev-mode
        // webpack bundling — show a real disabled/loading button instead of an invisible,
        // unclickable one, so this doesn't read as "the button does nothing." Same treatment
        // while wagmi is restoring a persisted session, so this doesn't flash "Connect Wallet"
        // for the split second before `isConnected` catches up (see `connected` below).
        if (!mounted || isReconnecting) {
          return (
            <Button size="sm" disabled className="gap-1.5 rounded-full px-5">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </Button>
          );
        }

        const connected = isConnected && account && chain;

        return connected ? (
          chain.unsupported ? (
            <Button onClick={openChainModal} size="sm" variant="destructive" className="rounded-full px-5">
              Wrong network
            </Button>
          ) : (
            <button
              onClick={openAccountModal}
              className="flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-sm transition-colors hover:bg-accent"
            >
              <Badge variant="secondary" className="rounded-full bg-success/15 text-success">
                ●
              </Badge>
              {account.displayName}
            </button>
          )
        ) : (
          <Button onClick={openConnectModal} size="sm" className="rounded-full px-5">
            Connect Wallet
          </Button>
        );
      }}
    </ConnectButton.Custom>
  );
}
