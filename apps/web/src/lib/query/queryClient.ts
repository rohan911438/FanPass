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
  listings: (filters?: Record<string, unknown>) => ["listings", filters] as const,
  trustScore: (entityType: "ticket" | "user", id: string) => ["trustScore", entityType, id] as const,
  wallet: (address: string) => ["wallet", address] as const,
};
