import type { WalletSummary } from "@fanpass/shared";
import { apiGet } from "@/lib/api/client";

export async function getWalletSummary(address: string): Promise<WalletSummary> {
  return apiGet<WalletSummary>(`/wallet/${address}`);
}
