import { useMutation, useQueryClient } from "@tanstack/react-query";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { parseEventLogs, parseUnits } from "viem";
import { escrowMarketplaceAbi, ticketIdToTokenId } from "@fanpass/shared";
import { syncListingTx } from "@/lib/api/listings";
import { wagmiConfig } from "@/lib/web3/config";
import { escrowMarketplaceContract, USDC_DECIMALS } from "@/lib/web3/contracts";
import { queryKeys } from "@/lib/query/queryClient";

export interface CreateListingParams {
  ticketId: string;
  askPrice: number;
}

/** Seller signs a single on-chain createListing tx, then the result is mirrored into the local store. */
export function useCreateListing() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ ticketId, askPrice }: CreateListingParams) => {
      const tokenId = ticketIdToTokenId(ticketId);
      const priceBaseUnits = parseUnits(String(askPrice), USDC_DECIMALS);

      const hash = await writeContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "createListing",
        args: [tokenId, priceBaseUnits, 0n],
      });
      const receipt = await waitForTransactionReceipt(wagmiConfig, { hash });
      await syncListingTx(hash);

      const [created] = parseEventLogs({ abi: escrowMarketplaceAbi, eventName: "ListingCreated", logs: receipt.logs });
      const listingId = (created?.args as { listingId?: bigint } | undefined)?.listingId;
      return { listingId: listingId?.toString() ?? null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings() });
    },
  });
}
