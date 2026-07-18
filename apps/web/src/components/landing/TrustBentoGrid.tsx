"use client";

import { motion } from "framer-motion";
import { QrCode, Repeat, UserCheck, Tag, ShieldCheck, ShieldAlert, ArrowUpRight, Check, Sparkles } from "lucide-react";
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
      colorClass: "text-white border-white/10 hover:border-white/30 hover:shadow-white/[0.02]",
      element: (
        <div className="mt-5 flex items-center justify-center gap-5 bg-black/40 rounded-2xl p-4.5 border border-white/[0.05] relative overflow-hidden">
          {/* Grayscale scanning line for QR */}
          <motion.div 
            className="absolute left-4.5 right-4.5 h-[1.5px] bg-white shadow-[0_0_8px_#ffffff] z-10"
            animate={{ top: ["18px", "110px", "18px"] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
          />
          <div className="relative p-2.5 bg-white rounded-xl shadow-md shrink-0">
            <QrCode className="h-16 w-16 text-black" />
          </div>
          <div className="text-[10px] font-mono text-neutral-400 flex flex-col gap-1.5 leading-snug">
            <div className="text-white font-semibold flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-white animate-pulse" />
              QR Payload Hash
            </div>
            <div className="bg-white/[0.02] border border-white/[0.05] px-2 py-0.5 rounded font-mono text-[9px] truncate max-w-[170px] text-white">
              SHA-256: 8a7c2...e9f2d
            </div>
            <div>STATUS: <span className="text-white bg-white/15 border border-white/25 px-2 py-0.5 rounded font-bold tracking-wider text-[9px]">DECODED</span></div>
            <div>DEPT: <span className="text-white">INJECTIVE REGISTRY</span></div>
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
      colorClass: "text-white border-white/10 hover:border-white/30 hover:shadow-white/[0.02]",
      element: (
        <div className="mt-5 flex flex-col gap-2.5 bg-black/40 rounded-2xl p-4 border border-white/[0.05] font-mono text-[9.5px] text-neutral-400 leading-relaxed">
          <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
            <span>Fingerprint Hash</span>
            <span className="text-white font-semibold flex items-center gap-1">
              <Check className="h-3 w-3 text-white" /> Unique
            </span>
          </div>
          <div className="flex justify-between border-b border-white/[0.04] pb-1.5">
            <span>Database Match</span>
            <span className="text-white font-medium">0 matches</span>
          </div>
          <div className="flex justify-between">
            <span>Registry Status</span>
            <span className="text-white font-bold">APPROVED</span>
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
      colorClass: "text-white border-white/10 hover:border-white/30 hover:shadow-white/[0.02]",
      element: (
        <div className="mt-5 flex flex-col gap-3.5 items-center justify-center bg-black/40 rounded-2xl p-4 border border-white/[0.05]">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-white text-black px-3.5 py-1 text-xs font-bold shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-black animate-pulse" />
            Trusted Elite Seller
          </div>
          <div className="text-[10px] text-neutral-400 text-center font-light leading-relaxed">
            34 Completed Sales • 100% Delivery <br />
            0 Disputed Escrows
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
      colorClass: "text-white border-white/10 hover:border-white/30 hover:shadow-white/[0.02]",
      element: (
        <div className="mt-5 flex flex-col gap-3 bg-black/40 rounded-2xl p-4.5 border border-white/[0.05]">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-neutral-400">Asking Price</span>
            <span className="font-bold text-white bg-white/10 px-2 py-0.5 rounded border border-white/20">150 USDC</span>
          </div>
          <div className="relative h-2 w-full rounded-full bg-white/[0.06] overflow-hidden my-1">
            <div className="absolute left-[20%] right-[30%] h-full rounded-full bg-white/20" />
            <div className="absolute left-[45%] h-full w-[4px] bg-white shadow-[0_0_8px_rgba(255,255,255,0.6)]" />
          </div>
          <div className="flex justify-between text-[8.5px] font-mono text-neutral-500">
            <span>Low (100)</span>
            <span className="text-white font-medium">Fair Range (120 - 180)</span>
            <span>High (220)</span>
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
      colorClass: "text-white border-white/10 hover:border-white/30 hover:shadow-white/[0.02]",
      element: (
        <div className="mt-5 flex flex-col gap-2.5 bg-black/40 rounded-2xl p-4 border border-white/[0.05]">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span className="h-1.5 w-1.5 rounded-full bg-white absolute" />
            <span className="text-[10px] pl-1 font-mono text-white font-semibold">Smart Escrow Lock</span>
          </div>
          <div className="bg-white/[0.01] border border-white/[0.04] p-2 rounded-lg font-mono text-[8.5px] text-neutral-400 leading-normal">
            Contract: <span className="text-white">0x7b...3c1</span> <br />
            Status: <span className="text-white font-semibold">Ready for Dynamic QR swap</span>
          </div>
        </div>
      ),
    },
    {
      icon: ShieldAlert,
      title: "Anti-Tamper Document Scanning",
      badge: "Fraud Agent",
      description: "Deep image inspection scans files for digital editing artifacts, compression flags, and screenshot markers.",
      className: "md:col-span-2 md:row-span-1",
      colorClass: "text-white border-white/10 hover:border-white/30 hover:shadow-white/[0.02]",
      element: (
        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="bg-black/40 rounded-xl p-3 border border-white/[0.05] font-mono text-[9.5px] text-neutral-400 leading-normal">
            <span className="text-white font-semibold">Metadata Risk</span>
            <div className="mt-2 flex items-baseline justify-between text-white font-semibold">
              <span>EXIF Clean</span>
              <span className="font-bold">100%</span>
            </div>
          </div>
          <div className="bg-black/40 rounded-xl p-3 border border-white/[0.05] font-mono text-[9.5px] text-neutral-400 leading-normal">
            <span className="text-white font-semibold">Tamper Scan</span>
            <div className="mt-2 flex items-baseline justify-between text-white font-semibold">
              <span>No Anomalies</span>
              <span className="font-bold">98%</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-6 py-24">
      <div className="flex flex-col items-center text-center mb-16">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-white">
          AI Trust Network
        </h2>
        <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground text-balance">
          Multi-Agent Cryptographic Verification
        </p>
        <p className="mt-4 text-neutral-400 text-sm font-light max-w-lg leading-relaxed">
          Instead of relying on single scanner wrappers, FanPass coordinates specialized AI models to dissect, grade, and secure every transaction.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3">
        {items.map((item, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-50px" }}
            transition={{ delay: index * 0.05, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className={`group flex flex-col justify-between rounded-3xl border bg-white/[0.01] p-6 backdrop-blur-xl transition-all duration-300 hover:bg-white/[0.03] hover:-translate-y-0.5 shadow-md ${item.className} ${item.colorClass}`}
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="inline-flex h-9.5 w-9.5 items-center justify-center rounded-xl bg-black border border-white/[0.06] text-inherit shadow-inner">
                  <item.icon className="h-5 w-5 text-white" />
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.06] bg-black/45 px-2.5 py-0.5 text-[9px] font-mono font-medium text-neutral-400">
                  {item.badge}
                </span>
              </div>
              <h3 className="mt-4.5 font-bold text-white text-base tracking-tight flex items-center gap-1 leading-snug">
                {item.title}
                <ArrowUpRight className="h-3.5 w-3.5 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300 text-neutral-400" />
              </h3>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed font-light">
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
