import { Store } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function MarketplacePage() {
  return (
    <div className="flex-1 pb-24">
      <PageHeader
        title="Marketplace"
        description="Only verified tickets, ranked by trust score and seller reputation."
      />
      <div className="mx-auto max-w-5xl px-6">
        <EmptyState
          icon={Store}
          title="Listings arrive in Phase 3"
          description="Browse, filter, buy, sell, relist, and cancel — built on top of the verification pipeline."
        />
      </div>
    </div>
  );
}
