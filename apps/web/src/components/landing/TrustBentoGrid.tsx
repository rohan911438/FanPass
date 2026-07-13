"use client";

import { motion } from "framer-motion";
import { QrCode, Repeat, UserCheck, Tag, ShieldCheck, ShieldAlert, ArrowUpRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface BentoItem {
  icon: LucideIcon;
  title: string;
  badge: string;
  description: string;
  className: string;
  colorClass: string;
  element: React.ReactNode;
}

export function TrustBentoGrid() {
  const items: BentoItem[] = [
    {
      icon: QrCode,
      title: "Verified QR Fingerprinting",
      badge: "QR Agent",
      description: "Extracts and hashes raw QR data payloads instantly, preventing spoofed codes and visual replicas.",
      className: "md:col-span-2 md:row-span-1",
      colorClass: "text-primary border-primary/20 hover:border-primary/45",
      element: (
        <div className="mt-4 flex items-center justify-center gap-4 bg-muted/20 dark:bg-card/40 rounded-xl p-4 border border-border/40">
          <div className="relative p-2 bg-white rounded-lg">
            <QrCode className="h-16 w-16 text-black" />
            <div className="absolute inset-0 border border-success animate-[pulse_2s_infinite] opacity-60 rounded-lg" />
          </div>
          <div className="text-[10px] font-mono text-muted-foreground flex flex-col gap-1">
            <div className="text-foreground font-semibold">QR Payload Hash</div>
            <div>SHA-256: 8a7c2...e9f2d</div>
            <div>STATUS: <span className="text-success font-semibold">DECODED</span></div>
            <div>DEPT: INJECTIVE REGISTRY</div>
          </div>
        </div>
      ),
    },
    {
      icon: Repeat,
      title: "No-Duplicate Registry",
      badge: "Orchestrator",
      description: "Cryptographically matches ticket fingerprints against every existing listing in the database. Zero doubles.",
      className: "md:col-span-1 md:row-span-1",
      colorClass: "text-amber-400 border-amber-400/20 hover:border-amber-400/45",
      element: (
        <div className="mt-4 flex flex-col gap-2 bg-muted/20 dark:bg-card/40 rounded-xl p-3 border border-border/40 font-mono text-[9px] text-muted-foreground">
          <div className="flex justify-between border-b border-border/30 pb-1.5">
            <span>Ticket Fingerprint</span>
            <span className="text-success">Unique</span>
          </div>
          <div className="flex justify-between border-b border-border/30 pb-1.5">
            <span>Marketplace Match</span>
            <span>0 matches found</span>
          </div>
          <div className="flex justify-between">
            <span>Registry Status</span>
            <span className="text-success">APPROVED</span>
          </div>
        </div>
      ),
    },
    {
      icon: UserCheck,
      title: "Seller Reputation Ledger",
      badge: "Reputation Agent",
      description: "Ranks sellers based on historical transaction volumes, verified check-ins, disputes, and address seniority.",
      className: "md:col-span-1 md:row-span-1",
      colorClass: "text-indigo-400 border-indigo-400/20 hover:border-indigo-400/45",
      element: (
        <div className="mt-4 flex flex-col gap-2 items-center justify-center bg-muted/20 dark:bg-card/40 rounded-xl p-3 border border-border/40">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success border border-success/30">
            Trusted Elite Seller
          </div>
          <div className="text-[10px] text-muted-foreground text-center">
            34 Sales • 100% Delivery • 0 Disputes
          </div>
        </div>
      ),
    },
    {
      icon: Tag,
      title: "AI Suggested Fair Price Bands",
      badge: "Pricing Agent",
      description: "Runs real-time comparative valuation modeling across past matches to establish safe pricing corridors.",
      className: "md:col-span-2 md:row-span-1",
      colorClass: "text-purple-400 border-purple-400/20 hover:border-purple-400/45",
      element: (
        <div className="mt-4 flex flex-col gap-2 bg-muted/20 dark:bg-card/40 rounded-xl p-4 border border-border/40">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-muted-foreground">Market Asking Price</span>
            <span className="font-semibold text-foreground">150 USDC</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-border">
            <div className="absolute left-[20%] right-[30%] h-full rounded-full bg-success/40" />
            <div className="absolute left-[45%] h-3 w-3 -translate-y-0.5 rounded-full border border-card bg-primary shadow-sm" />
          </div>
          <div className="flex justify-between text-[9px] font-mono text-muted-foreground">
            <span>Low (100 USDC)</span>
            <span className="text-success">Fair Band (120 - 180 USDC)</span>
            <span>High (220 USDC)</span>
          </div>
        </div>
      ),
    },
    {
      icon: ShieldCheck,
      title: "Contract Transfer Eligibility",
      badge: "Ownership Agent",
      description: "Queries the Injective smart contract registry to verify ownership states before allowing sellers to list.",
      className: "md:col-span-1 md:row-span-1",
      colorClass: "text-success border-success/20 hover:border-success/45",
      element: (
        <div className="mt-4 flex flex-col gap-2 bg-muted/20 dark:bg-card/40 rounded-xl p-3 border border-border/40">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-[10px] font-mono text-foreground font-semibold">Smart Contract Escrow Lock</span>
          </div>
          <p className="text-[9px] text-muted-foreground">
            Contract: `0x7b...3c1` is authorized for atomic swap execution.
          </p>
        </div>
      ),
    },
    {
      icon: ShieldAlert,
      title: "Anti-Tamper Document Scanning",
      badge: "Fraud Agent",
      description: "Deep image inspection scans files for digital editing artifacts, compression flags, and screenshot markers.",
      className: "md:col-span-2 md:row-span-1",
      colorClass: "text-rose-400 border-rose-400/20 hover:border-rose-400/45",
      element: (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="bg-muted/20 dark:bg-card/40 rounded-lg p-2.5 border border-border/40 font-mono text-[9px] text-muted-foreground">
            <span className="text-foreground font-semibold">Metadata Risk</span>
            <div className="mt-1 flex items-baseline justify-between text-success">
              <span>EXIF Clean</span>
              <span>100/100</span>
            </div>
          </div>
          <div className="bg-muted/20 dark:bg-card/40 rounded-lg p-2.5 border border-border/40 font-mono text-[9px] text-muted-foreground">
            <span className="text-foreground font-semibold">Tamper Scan</span>
            <div className="mt-1 flex items-baseline justify-between text-success">
              <span>No artifacts</span>
              <span>98/100</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex flex-col items-center text-center mb-16">
        <h2 className="text-sm font-medium uppercase tracking-widest text-primary">
          AI Trust Network
        </h2>
        <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
          Multi-agent cryptographic verification.
        </p>
        <p className="mt-4 text-muted-foreground text-sm max-w-lg">
          Instead of relying on single scanner wrappers, FanPass coordinates ten specialized AI models to dissect, grade, and secure every transaction.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`group flex flex-col justify-between rounded-3xl border bg-card/45 p-6 backdrop-blur-sm transition-all hover:bg-card hover:shadow-lg ${item.className} ${item.colorClass}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-card border border-border/60 text-inherit">
                  <item.icon className="h-4.5 w-4.5" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card/50 px-2 py-0.5 text-[9px] font-mono font-medium text-muted-foreground">
                  {item.badge}
                </span>
              </div>
              <h3 className="mt-4 font-semibold text-foreground text-base tracking-tight flex items-center gap-1">
                {item.title}
                <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground" />
              </h3>
              <p className="mt-2 text-xs text-muted-foreground leading-relaxed">
                {item.description}
              </p>
            </div>
            {item.element}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
