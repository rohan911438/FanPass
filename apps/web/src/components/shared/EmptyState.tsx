import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function EmptyState({ icon: Icon, title, description }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-2xl border border-dashed border-border py-16 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
