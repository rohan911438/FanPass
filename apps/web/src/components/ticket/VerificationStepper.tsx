"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import { Check, Loader2 } from "lucide-react";
import { VERIFICATION_STAGES, type VerificationProgress, type VerificationStage } from "@fanpass/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { useVerificationProgress } from "@/hooks/useVerificationProgress";
import { cn } from "@/lib/utils";

interface StepDefinition {
  key: string;
  label: string;
  /** The backend stage this step's completion is read from. */
  dependsOn: VerificationStage;
}

const STEPS: StepDefinition[] = [
  { key: "ocr", label: "OCR", dependsOn: "ocr" },
  { key: "metadata", label: "Metadata Validation", dependsOn: "metadata" },
  { key: "qr", label: "QR Validation", dependsOn: "qr" },
  { key: "fraud", label: "Image Integrity", dependsOn: "fraud" },
  { key: "ownership", label: "Ownership Check", dependsOn: "ownership" },
  { key: "duplicate", label: "Duplicate Detection", dependsOn: "qr" },
  { key: "pricing", label: "Pricing", dependsOn: "pricing" },
];

interface VerificationStepperProps {
  ticketId: string;
  onComplete: (progress: VerificationProgress) => void;
}

export function VerificationStepper({ ticketId, onComplete }: VerificationStepperProps) {
  const { data: progress } = useVerificationProgress(ticketId);

  useEffect(() => {
    if (progress?.stage === "complete") onComplete(progress);
  }, [progress, onComplete]);

  const completed = progress?.completedStages ?? [];
  const trustScoreDone = progress?.stage === "complete";
  // The next backend stage still pending — a single source of truth for "which step is active", so the
  // duplicate-detection step (which shares the QR Agent's completion signal) can't throw off the count.
  const activeBackendStage = VERIFICATION_STAGES.find((s) => !completed.includes(s)) ?? null;
  const allAgentStagesDone = activeBackendStage === null;
  const totalSteps = VERIFICATION_STAGES.length + 1; // + Trust Score
  const percent = Math.round(((completed.length + (trustScoreDone ? 1 : 0)) / totalSteps) * 100);

  return (
    <Card className="border-primary/20 bg-gradient-to-b from-card to-primary/5">
      <CardHeader>
        <CardTitle>Verifying your ticket…</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        <Progress value={percent}>
          <ProgressTrack>
            <ProgressIndicator />
          </ProgressTrack>
        </Progress>

        <ol className="flex flex-col gap-3">
          {STEPS.map((step, index) => {
            const isDone = completed.includes(step.dependsOn);
            const isFirstWithThisDependency = STEPS.findIndex((s) => s.dependsOn === step.dependsOn) === index;
            const isActive = !isDone && isFirstWithThisDependency && step.dependsOn === activeBackendStage;
            return (
              <motion.li
                key={step.key}
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
                  {isDone ? (
                    <Check className="size-3" />
                  ) : isActive ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : null}
                </span>
                {step.label}
              </motion.li>
            );
          })}
          <motion.li
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: STEPS.length * 0.03 }}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              trustScoreDone ? "text-foreground" : "text-muted-foreground",
              !trustScoreDone && allAgentStagesDone && "bg-primary/10 text-foreground"
            )}
          >
            <span
              className={cn(
                "flex size-5 shrink-0 items-center justify-center rounded-full border",
                trustScoreDone ? "border-success bg-success/15 text-success" : "border-border",
                !trustScoreDone && allAgentStagesDone && "border-primary text-primary"
              )}
            >
              {trustScoreDone ? (
                <Check className="size-3" />
              ) : allAgentStagesDone ? (
                <Loader2 className="size-3 animate-spin" />
              ) : null}
            </span>
            Trust Score
          </motion.li>
        </ol>
      </CardContent>
    </Card>
  );
}
