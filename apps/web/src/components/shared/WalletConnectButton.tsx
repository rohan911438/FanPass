"use client";

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
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: { opacity: 0, pointerEvents: "none", userSelect: "none" },
            })}
          >
            {!connected ? (
              <Button onClick={openConnectModal} size="sm" className="rounded-full px-5">
                Connect Wallet
              </Button>
            ) : chain.unsupported ? (
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
            )}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
