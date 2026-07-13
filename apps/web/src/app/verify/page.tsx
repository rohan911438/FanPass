"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldQuestion } from "lucide-react";
import type { Ticket, VerificationProgress } from "@fanpass/shared";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { ListTicketForm } from "@/components/marketplace/ListTicketForm";
import { TicketUploadForm } from "@/components/ticket/TicketUploadForm";
import { TrustScoreCard } from "@/components/ticket/TrustScoreCard";
import { VerificationStepper } from "@/components/ticket/VerificationStepper";
import { useWallet } from "@/hooks/useWallet";

type FlowState =
  | { step: "upload" }
  | { step: "verifying"; ticket: Ticket }
  | { step: "complete"; ticket: Ticket; progress: VerificationProgress };

export default function VerifyPage() {
  const { isConnected } = useWallet();
  const [flow, setFlow] = useState<FlowState>({ step: "upload" });
  const [listingId, setListingId] = useState<string | null | undefined>(undefined);

  function reset() {
    setFlow({ step: "upload" });
    setListingId(undefined);
  }

  return (
    <div className="flex-1 pb-24">
      <PageHeader
        title="Verify a Ticket"
        description="Upload a ticket and watch the AI Trust Score come together, live."
      />
      <div className="mx-auto max-w-2xl px-6">
        {!isConnected ? (
          <EmptyState
            icon={ShieldQuestion}
            title="Connect your wallet to verify a ticket"
            description="Your connected wallet address is used as the seller identity for this submission."
          />
        ) : flow.step === "upload" ? (
          <TicketUploadForm onUploaded={(ticket) => setFlow({ step: "verifying", ticket })} />
        ) : flow.step === "verifying" ? (
          <VerificationStepper
            ticketId={flow.ticket.ticketId}
            onComplete={(progress) => setFlow({ step: "complete", ticket: flow.ticket, progress })}
          />
        ) : (
          <div className="flex flex-col gap-4">
            <TrustScoreCard ticket={flow.ticket} progress={flow.progress} />

            {flow.progress.ticketStatus === "verified" &&
              (listingId !== undefined ? (
                <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-sm text-success">
                  <CheckCircle2 className="size-4" />
                  Listed on the marketplace
                  {listingId && (
                    <>
                      {" — "}
                      <Link href={`/marketplace/listing/${listingId}`} className="underline underline-offset-2">
                        view it
                      </Link>
                    </>
                  )}
                  .
                </div>
              ) : (
                <ListTicketForm
                  ticketId={flow.ticket.ticketId}
                  suggestedPrice={flow.progress.agentResults.pricing?.output.fairSuggested}
                  onListed={setListingId}
                />
              ))}

            <Button variant="outline" onClick={reset} className="self-start">
              Verify another ticket
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
