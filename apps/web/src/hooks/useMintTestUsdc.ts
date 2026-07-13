import { useMutation, useQueryClient } from "@tanstack/react-query";
import { parseUnits } from "viem";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { wagmiConfig } from "@/lib/web3/config";
import { mockUsdcContract, USDC_DECIMALS } from "@/lib/web3/contracts";

const FAUCET_AMOUNT = 1_000;

/** MockUSDC.mint has no access control (testnet only) — a free, self-serve faucet for test funds. */
export function useMintTestUsdc(walletAddress: `0x${string}` | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!walletAddress) throw new Error("Connect your wallet first.");
      const hash = await writeContract(wagmiConfig, {
        ...mockUsdcContract,
        functionName: "mint",
        args: [walletAddress, parseUnits(String(FAUCET_AMOUNT), USDC_DECIMALS)],
      });
      await waitForTransactionReceipt(wagmiConfig, { hash });
      return hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usdcBalance", walletAddress] });
    },
  });
}

export { FAUCET_AMOUNT };
