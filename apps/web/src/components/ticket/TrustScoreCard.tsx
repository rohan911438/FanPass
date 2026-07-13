"use client";

import { useState } from "react";
import { ChevronDown, QrCode, ShieldAlert, ShieldCheck, Tag, UserCheck, Repeat } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type {
  FraudAgentOutput,
  OwnershipAgentOutput,
  PricingAgentOutput,
  QrAgentOutput,
  Ticket,
  TrustScoreBreakdown,
  VerificationProgress,
} from "@fanpass/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsiblePanel, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const FLAG_MESSAGES: Record<string, string> = {
  ocr_field_mismatch: "Some ticket details didn't match what our OCR read from the file.",
  fixture_not_recognized: "We couldn't match this event against our known fixtures list.",
  screenshot_detected: "This looks like a screenshot rather than an original file.",
  editing_artifacts_detected: "We detected possible editing artifacts on the image.",
  qr_not_detected: "We couldn't decode a scannable QR code from this file.",
  duplicate_qr_hash: "This ticket's fingerprint matches one already submitted to FanPass.",
  seller_mismatch: "The claimed seller doesn't match the current owner on record.",
  no_comps_found: "We don't have comparable sales for this event yet.",
  verification_error: "Something went wrong while verifying this ticket. Please try again.",
};

interface BadgeDefinition {
  key: keyof TrustScoreBreakdown;
  label: string;
  icon: LucideIcon;
  agentLabel: string;
  explanation: string;
}

function buildBadgeDefinitions(progress: VerificationProgress): BadgeDefinition[] {
  const qr = progress.agentResults.qr?.output as QrAgentOutput | undefined;
  const ownership = progress.agentResults.ownership?.output as OwnershipAgentOutput | undefined;
  const pricing = progress.agentResults.pricing?.output as PricingAgentOutput | undefined;
  const fraud = progress.agentResults.fraud?.output as FraudAgentOutput | undefined;

  return [
    {
      key: "verifiedQr",
      label: "Verified QR",
      icon: QrCode,
      agentLabel: "QR Agent",
      explanation: qr?.decoded
        ? "We decoded a QR code from your upload and generated a unique fingerprint for it."
        : "We couldn't decode a scannable QR code from this file (common for PDFs or low-resolution photos), so we fingerprinted the file itself instead.",
    },
    {
      key: "noDuplicate",
      label: "No Duplicate",
      icon: Repeat,
      agentLabel: "QR Agent",
      explanation: qr?.duplicateFound
        ? `This ticket's fingerprint matches ticket ${qr.duplicateOfTicketId} already submitted to FanPass — it can't be verified as unique.`
        : "This ticket's fingerprint doesn't match any other ticket already submitted to FanPass.",
    },
    {
      key: "verifiedSeller",
      label: "Verified Seller",
      icon: UserCheck,
      agentLabel: "Ownership Agent",
      explanation: ownership?.sellerMatchesOwner
        ? ownership.isFirstVerification
          ? "No prior owner is on record for this ticket — you're establishing the first verified ownership."
          : `The claimed seller matches the current owner on record (${ownership.currentOwnerOnRecord}).`
        : `The claimed seller doesn't match the current owner on record (${ownership?.currentOwnerOnRecord}) — this ticket may not be legitimately transferable.`,
    },
    {
      key: "fairPrice",
      label: "Fair Price",
      icon: Tag,
      agentLabel: "Pricing Agent",
      explanation: pricing?.compsFound
        ? `Based on comparable listings, a fair price is ${pricing.fairMin}–${pricing.fairMax} USDC (suggested ${pricing.fairSuggested}).`
        : `We don't have comparable sales for this event yet, so pricing defaults to a conservative band of ${pricing?.fairMin}–${pricing?.fairMax} USDC.`,
    },
    {
      key: "transferEligible",
      label: "Transfer Eligible",
      icon: ShieldCheck,
      agentLabel: "Ownership Agent",
      explanation: progress.trustScore?.breakdown.transferEligible
        ? "This ticket cleared the seller, uniqueness, and fraud checks required to be transferred once listed."
        : "This ticket didn't clear every check required for transfer eligibility (seller match, uniqueness, or fraud risk) — it can't be listed until it does.",
    },
    {
      key: "lowFraudRisk",
      label: "Low Fraud Risk",
      icon: ShieldAlert,
      agentLabel: "Fraud Agent",
      explanation: fraud
        ? `Our tamper-detection model scored this upload at ${Math.round(fraud.tamperScore * 100)}/100 tamper risk.${
            fraud.screenshotDetected ? " It also looks like a screenshot rather than an original file." : ""
          }${fraud.editingArtifactsDetected ? " Possible editing artifacts were detected." : ""}`
        : "Fraud check pending.",
    },
  ];
}

interface TrustScoreCardProps {
  ticket: Ticket;
  progress: VerificationProgress;
}

export function TrustScoreCard({ ticket, progress }: TrustScoreCardProps) {
  const [openKey, setOpenKey] = useState<string | null>(null);
  const trustScore = progress.trustScore;
  const isVerified = progress.ticketStatus === "verified";

  if (!trustScore) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          Trust Score is still being computed — refresh in a moment.
        </CardContent>
      </Card>
    );
  }

  const badges = buildBadgeDefinitions(progress);

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Trust Score</span>
          <Badge variant={isVerified ? "default" : "destructive"}>
            {isVerified ? "Verified" : "Needs Review"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-5xl font-semibold tracking-tight">{trustScore.score}</span>
          <span className="text-lg text-muted-foreground">/100</span>
        </div>

        {!isVerified && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p className="font-medium">This ticket needs review before it can be verified.</p>
            <ul className="mt-2 list-disc pl-5">
              {progress.flags.length > 0 ? (
                progress.flags.map((flag) => <li key={flag}>{FLAG_MESSAGES[flag] ?? flag}</li>)
              ) : (
                <li>Trust score fell below the verification threshold.</li>
              )}
            </ul>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2">
          {badges.map((badge) => {
            const passed = trustScore.breakdown[badge.key];
            const isOpen = openKey === badge.key;
            return (
              <Collapsible
                key={badge.key}
                open={isOpen}
                onOpenChange={(open) => setOpenKey(open ? badge.key : null)}
                className="rounded-xl border border-border"
              >
                <CollapsibleTrigger className="flex items-center justify-between gap-2 px-3 py-2.5">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 text-sm font-medium",
                      passed ? "text-success" : "text-destructive"
                    )}
                  >
                    <badge.icon className="size-4" />
                    {badge.label}
                  </span>
                  <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} />
                </CollapsibleTrigger>
                <CollapsiblePanel>
                  <div className="px-3 pb-3 text-xs text-muted-foreground">
                    <p className="mb-1 font-medium text-foreground/80">Source: {badge.agentLabel}</p>
                    {badge.explanation}
                  </div>
                </CollapsiblePanel>
              </Collapsible>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground">
          Verified for {ticket.eventName} at {ticket.venue}.
        </p>
      </CardContent>
    </Card>
  );
}
