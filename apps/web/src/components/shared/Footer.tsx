"use client";

import Link from "next/link";
import { useState } from "react";

export function Footer() {
  const [year] = useState(() => new Date().getFullYear());

  return (
    <footer className="border-t border-border/60 bg-background/50 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="text-xl font-bold tracking-tight">
              FanPass
            </Link>
            <p className="max-w-xs text-sm text-muted-foreground">
              The AI-powered trust layer for secure peer-to-peer event ticket resale. Protecting fans from duplicates, fraud, and scalpers.
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Platform</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/verify" className="hover:text-foreground transition-colors">
                  Verify Ticket
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-foreground transition-colors">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="hover:text-foreground transition-colors">
                  My Wallet
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground mb-4">Developer</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <a href="https://docs.injective.network" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
                  Injective EVM Docs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  AI Trust Specs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-foreground transition-colors">
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-border/40 pt-8 sm:flex-row sm:items-center sm:justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <span>© {year} FanPass. All rights reserved.</span>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <span className="hidden sm:inline">•</span>
            <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
          </div>

          <div className="flex items-center gap-4">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 font-medium text-[10px]">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              Injective EVM Testnet
            </div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-0.5 font-medium text-[10px] text-success">
              Systems Operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
