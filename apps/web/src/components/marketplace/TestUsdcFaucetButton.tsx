"use client";

import { toast } from "sonner";
import { Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FAUCET_AMOUNT, useMintTestUsdc } from "@/hooks/useMintTestUsdc";
import { useWallet } from "@/hooks/useWallet";

/** MockUSDC is testnet-only and self-mintable — a one-click way to get funds to try buying a ticket. */
export function TestUsdcFaucetButton() {
  const { address, isConnected } = useWallet();
  const mutation = useMintTestUsdc(address);

  if (!isConnected) return null;

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={mutation.isPending}
      onClick={() =>
        mutation.mutate(undefined, {
          onSuccess: () => toast.success(`${FAUCET_AMOUNT} test USDC minted to your wallet.`),
          onError: (error) => toast.error(error instanceof Error ? error.message : "Mint failed. Try again."),
        })
      }
      className="gap-1.5"
    >
      <Coins className="size-3.5" />
      {mutation.isPending ? "Confirm in wallet…" : `Get ${FAUCET_AMOUNT} test USDC`}
    </Button>
  );
}
