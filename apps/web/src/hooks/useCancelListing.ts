import { useMutation, useQueryClient } from "@tanstack/react-query";
import { writeContract } from "wagmi/actions";
import { INJECTIVE_TESTNET_GAS_LIMIT, INJECTIVE_TESTNET_GAS_PRICE } from "@fanpass/shared";
import { syncListingTx } from "@/lib/api/listings";
import { getPendingNonce, waitForNonceToPass } from "@/lib/web3/confirmTx";
import { wagmiConfig } from "@/lib/web3/config";
import { escrowMarketplaceContract } from "@/lib/web3/contracts";
import { queryKeys } from "@/lib/query/queryClient";

/** Seller signs a single on-chain cancelListing tx, then the result is mirrored into the local store. */
export function useCancelListing(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (listingId: string) => {
      if (!walletAddress) throw new Error("Connect your wallet first.");
      const address = walletAddress as `0x${string}`;
      const priorNonce = await getPendingNonce(address);
      const hash = await writeContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "cancelListing",
        args: [BigInt(listingId)],
        gasPrice: INJECTIVE_TESTNET_GAS_PRICE,
        gas: INJECTIVE_TESTNET_GAS_LIMIT,
      });
      await waitForNonceToPass(address, priorNonce);
      return syncListingTx(hash);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings() });
      if (walletAddress) queryClient.invalidateQueries({ queryKey: queryKeys.wallet(walletAddress) });
    },
  });
}
