import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { writeContract } from "wagmi/actions";
import { INJECTIVE_TESTNET_GAS_LIMIT, INJECTIVE_TESTNET_GAS_PRICE } from "@fanpass/shared";
import { getPendingNonce, waitForNonceToPass } from "@/lib/web3/confirmTx";
import { wagmiConfig } from "@/lib/web3/config";
import { mockUsdcContract, USDC_DECIMALS } from "@/lib/web3/contracts";

const FAUCET_AMOUNT = 1_000;

/** MockUSDC.mint has no access control (testnet only) — a free, self-serve faucet for test funds. */
export function useMintTestUsdc(walletAddress: `0x${string}` | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error("Connect your wallet first.");
      const priorNonce = await getPendingNonce(walletAddress);
      const hash = await writeContract(wagmiConfig, {
        ...mockUsdcContract,
        functionName: "mint",
        args: [walletAddress, parseUnits(String(FAUCET_AMOUNT), USDC_DECIMALS)],
        gasPrice: INJECTIVE_TESTNET_GAS_PRICE,
        gas: INJECTIVE_TESTNET_GAS_LIMIT,
      });
      await waitForNonceToPass(walletAddress, priorNonce);
      return hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usdcBalance", walletAddress] });
    },
  });
}

export { FAUCET_AMOUNT };
