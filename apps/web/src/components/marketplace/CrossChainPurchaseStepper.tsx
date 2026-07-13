"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Check, Globe2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useBuyTicket } from "@/hooks/useBuyTicket";
import {
  useConfirmBurn,
  useCreateCrossChainIntent,
  useCrossChainIntentStatus,
  type CctpSourceChain,
  type CrossChainIntentState,
} from "@/hooks/useCrossChainBuy";
import { useMintTestUsdc } from "@/hooks/useMintTestUsdc";
import { cn } from "@/lib/utils";

interface StepDefinition {
  state: CrossChainIntentState;
  label: string;
}

const STEPS: StepDefinition[] = [
  { state: "awaiting_burn", label: "Confirming your payment on the source chain…" },
  { state: "attesting", label: "Bringing your USDC to Injective…" },
  { state: "attested", label: "Attestation received…" },
  { state: "minting", label: "Minting on Injective…" },
  { state: "minted", label: "Ready — reserving your ticket…" },
];

const STATE_ORDER: CrossChainIntentState[] = [
  "awaiting_burn",
  "attesting",
  "attested",
  "minting",
  "minted",
  "failed",
  "refunded",
];

interface CrossChainPurchaseStepperProps {
  listingId: string;
  askPrice: number;
  buyerAddress: `0x${string}`;
  sourceChain: CctpSourceChain;
  onDone: () => void;
}

/**
 * Demo/simulated by design (docs/PHASE_5_ECOSYSTEM_INTEGRATION.md Part 1 + the Phase 5 implementation
 * plan's Context note): this app's wagmi config only lists Injective, so there's no real second-chain
 * wallet to burn from here. The backend's cctpProvider defaults to a simulated attestation timeline;
 * this component drives the exact same state machine + UI a live burn→attest→mint flow would use, and
 * once "minted" it hands off to the same MockUSDC faucet + same-chain buy flow already built — the buyer
 * still never sees the words "CCTP," "bridge," or "attestation."
 */
export function CrossChainPurchaseStepper({
  listingId,
  askPrice,
  buyerAddress,
  sourceChain,
  onDone,
}: CrossChainPurchaseStepperProps) {
  const [intentId, setIntentId] = useState<string | null>(null);
  const [mintClaimed, setMintClaimed] = useState(false);

  const createIntent = useCreateCrossChainIntent(listingId);
  const confirmBurn = useConfirmBurn(listingId);
  const { data: intent } = useCrossChainIntentStatus(listingId, intentId ?? undefined);
  const mintTestUsdc = useMintTestUsdc(buyerAddress);
  const buyTicket = useBuyTicket(buyerAddress);

  useEffect(() => {
    if (intentId || createIntent.isPending) return;
    createIntent.mutate(
      { buyerAddress, sourceChain },
      {
        onSuccess: (created) => {
          setIntentId(created.id);
          confirmBurn.mutate({ intentId: created.id, txHash: crypto.randomUUID() });
        },
        onError: (error) => toast.error(error instanceof Error ? error.message : "Could not start the cross-chain buy."),
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const state = intent?.state ?? "awaiting_burn";
  const stateIndex = STATE_ORDER.indexOf(state);

  async function handleClaimAndBuy() {
    try {
      if (!mintClaimed) {
        await mintTestUsdc.mutateAsync();
        setMintClaimed(true);
      }
      await buyTicket.mutateAsync({ listingId, askPrice, buyerAddress });
      toast.success("Purchase complete — the ticket is now in your wallet.");
      onDone();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Purchase failed. Try again.");
    }
  }

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-card to-primary/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe2 className="size-4" />
          Paying with USDC from {sourceChain}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => {
            const isDone = stateIndex > index || state === "minted";
            const isActive = stateIndex === index;
            return (
              <motion.li
                key={step.state}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03 }}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                  isDone && "text-foreground",
                  isActive && "bg-primary/10 text-foreground",
                  !isDone && !isActive && "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex size-5 shrink-0 items-center justify-center rounded-full border",
                    isDone ? "border-success bg-success/15 text-success" : "border-border",
                    isActive && "border-primary text-primary"
                  )}
                >
                  {isDone ? <Check className="size-3" /> : isActive ? <Loader2 className="size-3 animate-spin" /> : null}
                </span>
                {step.label}
              </motion.li>
            );
          })}
        </ol>

        {state === "failed" && (
          <p className="text-xs text-destructive">
            {intent?.failureReason ?? "This cross-chain payment failed."} Your source-chain funds remain safe and
            mintable — try again or contact support.
          </p>
        )}

        {state === "minted" && (
          <Button disabled={mintTestUsdc.isPending || buyTicket.isPending} onClick={handleClaimAndBuy} className="w-fit gap-1.5">
            {mintTestUsdc.isPending
              ? "Receiving bridged USDC…"
              : buyTicket.isPending
                ? "Confirm in wallet…"
                : "Finish purchase"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
