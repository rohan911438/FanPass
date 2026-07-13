import { QueryClient } from "@tanstack/react-query";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

/**
 * Query key factory — one place to invalidate from after a mutation (buy, list, cancel, verify).
 * Extended per-resource as those flows are built in Phase 2/3.
 */
export const queryKeys = {
  ticket: (id: string) => ["ticket", id] as const,
  ticketVerification: (id: string) => ["ticketVerification", id] as const,
  listings: (filters?: Record<string, unknown>) => ["listings", filters] as const,
  listingDetail: (id: string) => ["listingDetail", id] as const,
  trustScore: (entityType: "ticket" | "user", id: string) => ["trustScore", entityType, id] as const,
  wallet: (address: string) => ["wallet", address] as const,
  crossChainIntent: (listingId: string, intentId: string) => ["crossChainIntent", listingId, intentId] as const,
};
