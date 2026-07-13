"use client";

import { Loader2 } from "lucide-react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

/**
 * Custom-styled wrap around RainbowKit's connect flow so it reads as a native FanPass control
 * ("Connect Wallet" / address chip), not an embedded crypto widget.
 */
export function WalletConnectButton() {
  return (
    <ConnectButton.Custom>
      {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
        // RainbowKit/wagmi's client-side init can take a few seconds to finish under dev-mode
        // webpack bundling — show a real disabled/loading button instead of an invisible,
        // unclickable one, so this doesn't read as "the button does nothing."
        if (!mounted) {
          return (
            <Button size="sm" disabled className="gap-1.5 rounded-full px-5">
              <Loader2 className="size-3.5 animate-spin" />
              Loading…
            </Button>
          );
        }

        const connected = account && chain;

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
