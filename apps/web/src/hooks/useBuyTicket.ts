import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { readContract, writeContract } from "wagmi/actions";
import { parseUnits } from "viem";
import { INJECTIVE_TESTNET_GAS_LIMIT, INJECTIVE_TESTNET_GAS_PRICE } from "@fanpass/shared";
import { syncListingTx } from "@/lib/api/listings";
import { getPendingNonce, waitForNonceToPass } from "@/lib/web3/confirmTx";
import { wagmiConfig } from "@/lib/web3/config";
import { escrowMarketplaceContract, mockUsdcContract, USDC_DECIMALS } from "@/lib/web3/contracts";
import { queryKeys } from "@/lib/query/queryClient";

export interface BuyTicketParams {
  listingId: string;
  askPrice: number;
  buyerAddress: `0x${string}`;
}

/**
 * Fully non-custodial: the buyer's own wallet signs every step. buy() locks funds in escrow;
 * releaseEscrow() (callable by anyone once funded) is signed by the same buyer immediately after, so
 * the backend never holds a signer for user money — see docs/PHASE_4_BLOCKCHAIN_ARCHITECTURE.md §4.3.
 * That's 2–3 wallet prompts for one purchase (approve, if needed, then buy, then release).
 */
export function useBuyTicket(walletAddress: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ listingId, askPrice, buyerAddress }: BuyTicketParams) => {
      const priceBaseUnits = parseUnits(String(askPrice), USDC_DECIMALS);

      const allowance = (await readContract(wagmiConfig, {
        ...mockUsdcContract,
        functionName: "allowance",
        args: [buyerAddress, escrowMarketplaceContract.address],
      })) as bigint;

      if (allowance < priceBaseUnits) {
        toast.info("Step 1: Approve USDC spending…");
        const priorNonce = await getPendingNonce(buyerAddress);
        const approveHash = await writeContract(wagmiConfig, {
          ...mockUsdcContract,
          functionName: "approve",
          args: [escrowMarketplaceContract.address, priceBaseUnits],
          gasPrice: INJECTIVE_TESTNET_GAS_PRICE,
          gas: INJECTIVE_TESTNET_GAS_LIMIT,
        });
        await waitForNonceToPass(buyerAddress, priorNonce);
      }

      toast.info("Step 2: Lock funds in escrow…");
      const buyPriorNonce = await getPendingNonce(buyerAddress);
      const buyHash = await writeContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "buy",
        args: [BigInt(listingId), priceBaseUnits],
        gasPrice: INJECTIVE_TESTNET_GAS_PRICE,
        gas: INJECTIVE_TESTNET_GAS_LIMIT,
      });
      await waitForNonceToPass(buyerAddress, buyPriorNonce);
      await syncListingTx(buyHash, listingId);

      toast.info("Step 3: Finalize purchase…");
      const releasePriorNonce = await getPendingNonce(buyerAddress);
      const releaseHash = await writeContract(wagmiConfig, {
        ...escrowMarketplaceContract,
        functionName: "releaseEscrow",
        args: [BigInt(listingId)],
        gasPrice: INJECTIVE_TESTNET_GAS_PRICE,
        gas: INJECTIVE_TESTNET_GAS_LIMIT,
      });
      await waitForNonceToPass(buyerAddress, releasePriorNonce);
      return syncListingTx(releaseHash, listingId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.listings() });
      if (walletAddress) queryClient.invalidateQueries({ queryKey: queryKeys.wallet(walletAddress) });
    },
  });
}
