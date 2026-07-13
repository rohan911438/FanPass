import { parseEventLogs, type TransactionReceipt } from "viem";
import { mockUsdcAbi } from "@fanpass/shared";

export interface UsdcTransferEvent {
  from: `0x${string}`;
  to: `0x${string}`;
  value: bigint;
}

/** Decodes whichever MockUSDC Transfer events are present in a receipt's logs for the given token address. */
export function decodeUsdcTransfers(receipt: TransactionReceipt, tokenAddress: `0x${string}`): UsdcTransferEvent[] {
  const events = parseEventLogs({
    abi: mockUsdcAbi,
    logs: receipt.logs.filter((log) => log.address.toLowerCase() === tokenAddress.toLowerCase()),
  });
  return events
    .filter((event) => event.eventName === "Transfer")
    .map((event) => ({ from: event.args.from, to: event.args.to, value: event.args.value }));
}
