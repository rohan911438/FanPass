import { useMutation, useQuery } from "@tanstack/react-query";
import { apiGet, apiPostJson } from "@/lib/api/client";
import { queryKeys } from "@/lib/query/queryClient";

export type CctpSourceChain = "ethereum" | "avalanche" | "optimism" | "arbitrum" | "base" | "polygon";

export type CrossChainIntentState =
  | "awaiting_burn"
  | "attesting"
  | "attested"
  | "minting"
  | "minted"
  | "failed"
  | "refund_pending"
  | "refunded";

export interface CrossChainPurchaseIntent {
  id: string;
  listingId: string;
  buyerAddress: string;
  sourceChain: CctpSourceChain;
  amount: string;
  burnTxHash: string | null;
  mintTxHash: string | null;
  state: CrossChainIntentState;
  failureReason: string | null;
}

const TERMINAL_STATES = new Set<CrossChainIntentState>(["minted", "failed", "refunded"]);

export function useCreateCrossChainIntent(listingId: string) {
  return useMutation({
    mutationFn: (params: { buyerAddress: string; sourceChain: CctpSourceChain }) =>
      apiPostJson<CrossChainPurchaseIntent>(`/marketplace/${listingId}/buy/cross-chain`, params),
  });
}

export function useConfirmBurn(listingId: string) {
  return useMutation({
    mutationFn: ({ intentId, txHash }: { intentId: string; txHash: string }) =>
      apiPostJson<CrossChainPurchaseIntent>(`/marketplace/${listingId}/buy/cross-chain/${intentId}/confirm-burn`, {
        txHash,
      }),
  });
}

/** Polls until the intent reaches "minted" (or a failure state) — mirrors useVerificationProgress's pattern. */
export function useCrossChainIntentStatus(listingId: string, intentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.crossChainIntent(listingId, intentId ?? ""),
    queryFn: () => apiGet<CrossChainPurchaseIntent>(`/marketplace/${listingId}/buy/cross-chain/${intentId}`),
    enabled: Boolean(intentId),
    refetchInterval: (query) => (query.state.data && TERMINAL_STATES.has(query.state.data.state) ? false : 2_000),
  });
}
