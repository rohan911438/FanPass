import { useQuery } from "@tanstack/react-query";
import { getVerificationProgress } from "@/lib/api/tickets";
import { queryKeys } from "@/lib/query/queryClient";

/**
 * Polls the real backend verification pipeline — the stepper and Trust Score card render from this,
 * not a client-side fake timer. Stops polling once the pipeline reports "complete".
 */
export function useVerificationProgress(ticketId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.ticketVerification(ticketId ?? ""),
    queryFn: () => getVerificationProgress(ticketId!),
    enabled: Boolean(ticketId),
    refetchInterval: (query) => (query.state.data?.stage === "complete" ? false : 1200),
  });
}
