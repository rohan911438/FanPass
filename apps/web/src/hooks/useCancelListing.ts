import { useMutation, useQueryClient } from "@tanstack/react-query";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { syncListingTx } from "@/lib/api/listings";
import { wagmiConfig } from "@/lib/web3/config";
import { escrowMarketplaceContract } from "@/lib/web3/contracts";
import { queryKeys } from "@/lib/query/queryClient";

/** Seller signs a single on-chain cancelListing tx, then the result is mirrored into the local store. */
export function useCancelListing(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      const hash = await writeContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "cancelListing",
        args: [BigInt(listingId)],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      return syncListingTx(hash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings() });
      if (walletAddress) queryClient.invalidateQueries({ queryKey: queryKeys.wallet(walletAddress) });
    },
  });
}
