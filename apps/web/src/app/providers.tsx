"use client";

import { useEffect, useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { RainbowKitProvider, darkTheme } from "@rainbow-me/rainbowkit";
import { WagmiProvider } from "wagmi";
import "@rainbow-me/rainbowkit/styles.css";
import { wagmiConfig } from "@/lib/web3/config";
import { suppressWalletConnectNoise } from "@/lib/web3/suppressWalletConnectNoise";
import { makeQueryClient } from "@/lib/query/queryClient";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(makeQueryClient);

  useEffect(() => suppressWalletConnectNoise(), []);

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider
          theme={darkTheme({
            accentColor: "oklch(0.65 0.2 264)",
            accentColorForeground: "black",
            borderRadius: "medium",
          })}
        >
          {children}
          <Toaster theme="dark" position="bottom-right" />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
