"use client";

import { useState } from "react";
import { ShieldQuestion } from "lucide-react";
import type { Ticket, VerificationProgress } from "@fanpass/shared";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
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
            <Button variant="outline" onClick={() => setFlow({ step: "upload" })} className="self-start">
              Verify another ticket
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
