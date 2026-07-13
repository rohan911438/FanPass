import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";

interface AssetListProps<T> {
  items: T[];
  renderItem: (item: T) => ReactNode;
  emptyIcon: LucideIcon;
  emptyTitle: string;
  emptyDescription: string;
}

/** Generic grid + empty state, reused across the Wallet's Owned Tickets/Certificates/Badges tabs. */
export function AssetList<T>({ items, renderItem, emptyIcon, emptyTitle, emptyDescription }: AssetListProps<T>) {
  if (items.length === 0) {
    return <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} />;
  }
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map(renderItem)}</div>;
}
