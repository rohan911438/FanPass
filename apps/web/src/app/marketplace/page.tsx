"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Store } from "lucide-react";
import type { ListingFilters as ListingFiltersValue } from "@fanpass/shared";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { ListingFilters } from "@/components/marketplace/ListingFilters";
import { ListingGrid } from "@/components/marketplace/ListingGrid";
import { TestUsdcFaucetButton } from "@/components/marketplace/TestUsdcFaucetButton";
import { Skeleton } from "@/components/ui/skeleton";
import { getListings } from "@/lib/api/listings";
import { queryKeys } from "@/lib/query/queryClient";

export default function MarketplacePage() {
  const [filters, setFilters] = useState<ListingFiltersValue>({});

  const { data: listings, isLoading } = useQuery({
    queryKey: queryKeys.listings(filters as Record<string, unknown>),
    queryFn: () => getListings(filters),
  });

  return (
    <div className="flex-1 pb-24">
      <PageHeader
        title="Marketplace"
        description="Only verified tickets, ranked by trust score and seller reputation."
      />
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <ListingFilters value={filters} onChange={setFilters} />
          <TestUsdcFaucetButton />
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-56 w-full rounded-2xl" />
            ))}
          </div>
        ) : !listings || listings.length === 0 ? (
          <EmptyState
            icon={Store}
            title="No listings match your filters"
            description="Verify a ticket on /verify and list it, or widen your price and trust score filters."
          />
        ) : (
          <ListingGrid listings={listings} />
        )}
      </div>
    </div>
  );
}
