import { formatUnits } from "viem";
import { env } from "@/config/env";
import { PREMIUM_ROUTES, type PremiumReportType } from "@/premium/priceMap";
import { findPremiumPaymentByTxHash, recordPremiumPayment } from "@/repositories/premiumPaymentRepository";
import { getReceiptWithRetry } from "@/web3/escrowMarketplace";
import { decodeUsdcTransfers } from "@/web3/mockUsdc";

const USDC_DECIMALS = 6;

export interface PaymentVerificationResult {
  ok: boolean;
  reason?: string;
}

/**
 * Direct on-chain proof only (no x402 facilitator currently settles on Injective — see
 * docs/PHASE_5_ECOSYSTEM_INTEGRATION.md §2.4): the client pays via a plain USDC transfer to
 * env.premium.paymentReceiverAddress and submits the tx hash. One tx hash authorizes exactly one call.
 */
export async function verifyPremiumPayment(
  reportType: PremiumReportType,
  txHash: string,
  payerHint: string | undefined
): Promise<PaymentVerificationResult> {
  const existing = await findPremiumPaymentByTxHash(txHash);
  if (existing) return { ok: false, reason: "This payment has already been used." };

  const route = PREMIUM_ROUTES[reportType];
  const priceBaseUnits = BigInt(Math.round(route.priceUsdc * 10 ** USDC_DECIMALS));

  let receipt;
  try {
    receipt = await getReceiptWithRetry(txHash as `0x${string}`);
  } catch {
    return { ok: false, reason: "Could not confirm this transaction." };
  }

  const transfers = decodeUsdcTransfers(receipt, env.web3.usdcAddress);
  const matching = transfers.find(
    (transfer) =>
      transfer.to.toLowerCase() === env.premium.paymentReceiverAddress.toLowerCase() &&
      transfer.value >= priceBaseUnits
  );
  if (!matching) return { ok: false, reason: "No matching USDC payment found in this transaction." };

  await recordPremiumPayment({
    txHash: txHash.toLowerCase(),
    reportType,
    payer: payerHint ?? matching.from,
    amount: Number(formatUnits(matching.value, USDC_DECIMALS)),
    usedAt: new Date().toISOString(),
  });

  return { ok: true };
}
