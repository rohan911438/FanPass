"use client";

import { useAccount, useChainId, useDisconnect } from "wagmi";
import { injectiveEvmTestnet } from "@/lib/web3/chain";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

/** Thin facade over wagmi so the rest of the app never imports wagmi hooks directly. */
export function useWallet() {
  const { address, isConnected, isConnecting } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();

  return {
    address,
    shortAddress: address ? shorten(address) : undefined,
    isConnected,
    isConnecting,
    isCorrectChain: chainId === injectiveEvmTestnet.id,
    disconnect,
  };
}
