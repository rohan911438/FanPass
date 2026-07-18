"use client";

import Link from "next/link";

export function Footer() {
  const year = 2026;

  return (
    <footer className="border-t border-white/[0.04] bg-black/10 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-8 sm:grid-cols-4">
          <div className="col-span-2 flex flex-col gap-4">
            <Link href="/" className="text-xl font-black tracking-tight bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent">
              FanPass
            </Link>
            <p className="max-w-xs text-xs sm:text-sm text-neutral-400 font-light leading-relaxed">
              The AI-powered trust layer for secure peer-to-peer event ticket resale. Protecting fans from duplicate codes, visual fraud, and exit scams.
            </p>
          </div>
          
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Platform</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-400 font-light">
              <li>
                <Link href="/verify" className="hover:text-white transition-colors duration-300">
                  Verify Ticket
                </Link>
              </li>
              <li>
                <Link href="/marketplace" className="hover:text-white transition-colors duration-300">
                  Marketplace
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="hover:text-white transition-colors duration-300">
                  My Wallet
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-white mb-4">Developer</h4>
            <ul className="space-y-2.5 text-xs sm:text-sm text-neutral-400 font-light">
              <li>
                <a href="https://docs.injective.network" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors duration-300">
                  Injective EVM Docs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  AI Trust Specs
                </a>
              </li>
              <li>
                <a href="#" className="hover:text-white transition-colors duration-300">
                  GitHub Repository
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-6 border-t border-white/[0.04] pt-8 sm:flex-row sm:items-center sm:justify-between text-xs text-neutral-500">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-light">© {year} FanPass. All rights reserved.</span>
            <span className="hidden sm:inline text-white/5">•</span>
            <a href="#" className="hover:text-white transition-colors duration-300 font-light">Privacy Policy</a>
            <span className="hidden sm:inline text-white/5">•</span>
            <a href="#" className="hover:text-white transition-colors duration-300 font-light">Terms of Service</a>
          </div>

          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.05] bg-white/[0.02] px-3.5 py-1 font-mono text-[9px] text-neutral-300 font-medium shadow-inner">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              Injective EVM Testnet
            </div>
            
            <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 font-mono text-[9px] text-white font-semibold shadow-sm">
              <span className="relative flex h-1.5 w-1.5 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
              </span>
              Systems Operational
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
