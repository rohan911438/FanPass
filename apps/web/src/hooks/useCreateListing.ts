import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getAccount, readContract, writeContract } from "wagmi/actions";
import { parseUnits } from "viem";
import { ticketIdToTokenId, INJECTIVE_TESTNET_GAS_LIMIT, INJECTIVE_TESTNET_GAS_PRICE } from "@fanpass/shared";
import { syncListingTx } from "@/lib/api/listings";
import { getPendingNonce, waitForNonceToPass } from "@/lib/web3/confirmTx";
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
      const { address } = getAccount(wagmiConfig);
      if (!address) throw new Error("Connect your wallet first.");
      const tokenId = ticketIdToTokenId(ticketId);
      const priceBaseUnits = parseUnits(String(askPrice), USDC_DECIMALS);

      const priorNonce = await getPendingNonce(address);
      const hash = await writeContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "createListing",
        args: [tokenId, priceBaseUnits, 0n],
        gasPrice: INJECTIVE_TESTNET_GAS_PRICE,
        gas: INJECTIVE_TESTNET_GAS_LIMIT,
      });
      await waitForNonceToPass(address, priorNonce);
      await syncListingTx(hash);

      // Read the listing back from contract state rather than parsing the tx receipt's logs — this
      // RPC's by-hash tx/receipt lookups are unreliable (see lib/web3/confirmTx.ts) even once mined.
      const listingId = await readContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "listingOf",
        args: [tokenId],
      });
      return { listingId: listingId ? listingId.toString() : null };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings() });
    },
  });
}
