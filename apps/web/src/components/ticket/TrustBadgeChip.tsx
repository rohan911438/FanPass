import { Check, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface TrustBadgeChipProps {
  icon: LucideIcon;
  label: string;
  passed: boolean;
  className?: string;
}

/** Reusable pass/fail badge — the Trust Score card's expandable badges, and later the marketplace grid. */
export function TrustBadgeChip({ icon: Icon, label, passed, className }: TrustBadgeChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        passed ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
        className
      )}
    >
      <Icon className="size-3.5" />
      {label}
      {passed ? <Check className="size-3.5" /> : <X className="size-3.5" />}
    </span>
  );
}
