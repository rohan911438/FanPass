"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Store, Wallet, ArrowRight, AlertTriangle, FileText, Check, Cpu, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface MockTicket {
  id: string;
  eventName: string;
  venue: string;
  eventDate: string;
  seatInfo: string;
  price: string;
  type: "legit" | "tampered" | "duplicate";
  fileType: string;
}

const mockTickets: MockTicket[] = [
  {
    id: "t-1",
    eventName: "Argentina vs France (Finals)",
    venue: "Lusail Stadium, Doha",
    eventDate: "Jul 18, 2026",
    seatInfo: "Block 104, Row K, Seat 12",
    price: "450 USDC",
    type: "legit",
    fileType: "WorldCup_Final_Ticket.pdf",
  },
  {
    id: "t-2",
    eventName: "Brazil vs Germany (Semi)",
    venue: "Maracanã, Rio de Janeiro",
    eventDate: "Jul 22, 2026",
    seatInfo: "VIP Box 3, Seat 4",
    price: "1,200 USDC",
    type: "tampered",
    fileType: "ticket_bra_ger_final.png",
  },
  {
    id: "t-3",
    eventName: "Portugal vs Spain (Group)",
    venue: "Al Bayt Stadium, Al Khor",
    eventDate: "Jul 19, 2026",
    seatInfo: "Category 1, Row AA, Seat 3",
    price: "350 USDC",
    type: "duplicate",
    fileType: "ticket_por_spa_copy.jpg",
  },
];

const SCAN_STEPS = [
  "OCR Agent: Extracting metadata...",
  "QR Agent: Decoding barcode fingerprint...",
  "Fraud Agent: Scanning for tampered pixels...",
  "Pricing Agent: Comparing comps & fair value...",
];

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function HeroSection() {
  const [selectedTicket, setSelectedTicket] = useState<MockTicket>(mockTickets[0]);
  const [scanState, setScanState] = useState<"idle" | "scanning" | "completed">("idle");
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (scanState !== "scanning") return;
    const timer = setTimeout(() => {
      if (currentStep < SCAN_STEPS.length) {
        setCurrentStep((prev) => prev + 1);
      } else {
        setScanState("completed");
      }
    }, 850);
    return () => clearTimeout(timer);
  }, [scanState, currentStep]);

  const handleStartScan = () => {
    setCurrentStep(0);
    setScanState("scanning");
  };

  const handleReset = () => {
    setScanState("idle");
    setCurrentStep(0);
  };

  const handleSelectTicket = (ticket: MockTicket) => {
    if (scanState === "scanning") return;
    setSelectedTicket(ticket);
    setScanState("idle");
    setCurrentStep(0);
  };

  return (
    <section className="relative mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-32">
      {/* Subtle silver background light */}
      <div className="absolute top-12 left-1/2 -translate-x-1/2 -z-20 h-[380px] w-[380px] sm:w-[600px] rounded-full bg-white/[0.02] blur-[120px] pointer-events-none" />

      <div className="grid gap-12 lg:grid-cols-12 items-center">
        
        {/* Left Column: Headline and CTAs */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4.5 py-1.5 text-xs font-semibold text-foreground/90 shadow-sm transition-colors duration-300"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            <span className="h-1.5 w-1.5 rounded-full bg-white absolute" />
            <span className="pl-1">Live on Injective EVM Testnet</span>
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={1}
            variants={fadeUp}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-balance leading-[1.08] text-foreground"
          >
            The Trust Layer for <br className="hidden sm:block" />
            <span className="bg-gradient-to-r from-white via-white/80 to-white/40 bg-clip-text text-transparent">
              Peer-to-Peer Resale
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={2}
            variants={fadeUp}
            className="mt-6 max-w-xl text-balance text-base sm:text-lg text-neutral-400 font-light leading-relaxed"
          >
            FanPass orchestrates multi-agent AI to analyze ticket documents, verify barcodes, enforce safe pricing bands, and secure trade escrows on-chain. Resell with absolute trust.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-sm font-semibold shadow-md shadow-white/5 hover:shadow-white/10 hover:-translate-y-0.5 transition-all duration-300 bg-white text-black hover:bg-white/90"
              nativeButton={false}
              render={<Link href="/verify" />}
            >
              Verify Your Ticket
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-6 text-sm font-semibold hover:bg-white/[0.04] hover:-translate-y-0.5 transition-all duration-300 border-white/10 text-white"
              nativeButton={false}
              render={<Link href="/marketplace" />}
            >
              Browse Listings
            </Button>
          </motion.div>
        </div>

        {/* Right Column: Monochrome AI Simulator Card */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[420px] rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl relative overflow-hidden backdrop-blur-xl shadow-black/60">
            
            {/* Mesh glows inside the glass card */}
            <div className="absolute -right-6 -top-6 -z-10 h-32 w-32 rounded-full bg-white/[0.02] blur-2xl pointer-events-none" />
            <div className="absolute -left-6 -bottom-6 -z-10 h-32 w-32 rounded-full bg-white/[0.02] blur-2xl pointer-events-none" />

            <div className="flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span className="text-xs font-semibold text-neutral-400 tracking-wider uppercase flex items-center gap-2">
                <Cpu className="h-4 w-4 text-white animate-pulse" />
                AI Trust Simulator
              </span>
              <span className="text-[10px] bg-white/10 text-white border border-white/20 rounded-full px-3 py-0.5 font-mono">
                Active Registry
              </span>
            </div>

            {/* Ticket Selection Chips */}
            <div className="flex gap-2 mb-5 bg-black/40 p-1 rounded-xl border border-white/10">
              {mockTickets.map((t) => {
                const isActive = selectedTicket.id === t.id;
                return (
                  <button
                    key={t.id}
                    disabled={scanState === "scanning"}
                    onClick={() => handleSelectTicket(t)}
                    className={`flex-1 text-[11px] font-medium py-2 px-2.5 rounded-lg transition-all duration-300 ${
                      isActive
                        ? "bg-white text-black font-bold shadow-md"
                        : "text-neutral-400 hover:text-white disabled:opacity-50 border border-transparent"
                    }`}
                  >
                    {t.type === "legit" ? "Legit" : t.type === "tampered" ? "Tampered" : "Duplicate"}
                  </button>
                );
              })}
            </div>

            {/* Main Interactive Ticket Display */}
            <div className="relative rounded-2xl border border-white/[0.06] bg-black/45 p-5 overflow-hidden shadow-inner flex flex-col justify-between min-h-[235px]">
              
              {/* Ticket Details Panel */}
              <div className="relative z-10 flex flex-col gap-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-white tracking-tight leading-snug">{selectedTicket.eventName}</h3>
                    <p className="text-[11px] text-neutral-400 mt-0.5 font-light">{selectedTicket.venue}</p>
                  </div>
                  <span className="text-[10px] text-white font-mono bg-white/10 px-2 py-0.5 rounded border border-white/20 shrink-0 shadow-sm">
                    {selectedTicket.price}
                  </span>
                </div>

                <div className="border-t border-dashed border-white/10 my-0.5" />

                <div className="grid grid-cols-2 gap-3 text-[10px] text-neutral-400">
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest text-neutral-500 mb-0.5">Date</span>
                    <span className="font-medium text-white">
                      {selectedTicket.eventDate}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-widest text-neutral-500 mb-0.5">Seat Info</span>
                    <span className="font-medium text-white">{selectedTicket.seatInfo}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 text-[10px] bg-white/[0.02] text-neutral-300 p-2 rounded-lg border border-white/[0.05] font-mono shadow-sm">
                  <FileText className="h-3.5 w-3.5 text-white/70 shrink-0" />
                  <span className="truncate">{selectedTicket.fileType}</span>
                </div>
              </div>

              {/* Holographic Seal & Barcode area */}
              <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-center justify-between relative z-10">
                <div className="flex flex-col items-start gap-1">
                  <div className="h-6 w-32 bg-[repeating-linear-gradient(90deg,currentColor,currentColor_1px,transparent_1px,transparent_4px)] text-white/20 opacity-70" />
                  <span className="text-[8px] font-mono text-neutral-500 tracking-widest">
                    *INJ-EVMT-{selectedTicket.id.toUpperCase()}*
                  </span>
                </div>
                
                {/* Visual Hologram Sticker - Silver Monochrome */}
                <div className="relative h-8 w-8 rounded-full bg-gradient-to-tr from-zinc-700 via-zinc-200 to-zinc-800 animate-[spin_8s_linear_infinite] opacity-65 border border-white/30 shadow-[0_0_8px_rgba(255,255,255,0.15)] shrink-0 flex items-center justify-center">
                  <Sparkles className="h-3.5 w-3.5 text-white/90" />
                </div>
              </div>

              {/* SCANNING OVERLAY GRADIENT LASER */}
              <AnimatePresence>
                {scanState === "scanning" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/90 backdrop-blur-[2px] z-20 p-5 flex flex-col justify-center gap-3.5"
                  >
                    {/* White scanner laser line */}
                    <motion.div 
                      className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_12px_#ffffff,0_0_24px_#ffffff]"
                      animate={{ top: ["0%", "100%", "0%"] }}
                      transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                    />
                    
                    <div className="space-y-3">
                      {SCAN_STEPS.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2.5 text-xs font-mono">
                          {currentStep > idx ? (
                            <Check className="h-4 w-4 text-white shrink-0" />
                          ) : currentStep === idx ? (
                            <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                          ) : (
                            <span className="h-4 w-4 rounded-full border border-white/20 shrink-0" />
                          )}
                          <span className={`transition-colors duration-300 ${
                            currentStep === idx 
                              ? "text-white font-semibold" 
                              : currentStep > idx 
                              ? "text-neutral-400" 
                              : "text-neutral-600"
                          }`}>
                            {step}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* COMPLETED REPORT CARD OVERLAY */}
              <AnimatePresence>
                {scanState === "completed" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-neutral-900 z-25 p-5 flex flex-col justify-between border border-white/10 rounded-2xl shadow-2xl"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-white font-mono tracking-wide uppercase">Verification Report</span>
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold tracking-wide border shadow-sm ${
                          selectedTicket.type === "legit" 
                            ? "bg-white text-black border-white" 
                            : "bg-black text-white border-white/20"
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full bg-current`} />
                          {selectedTicket.type === "legit" ? "Verified" : "Failed Risk"}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-2 mb-4 bg-black/40 p-3 rounded-xl border border-white/[0.04]">
                        <span className="text-4xl font-extrabold tracking-tight leading-none text-white">
                          {selectedTicket.type === "legit" ? "98" : selectedTicket.type === "tampered" ? "42" : "35"}
                        </span>
                        <span className="text-xs text-neutral-400">/100 Trust Score</span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-[10px]">
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <Check className="h-3.5 w-3.5 text-white shrink-0" />
                          <span>Decoded QR payload</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          {selectedTicket.type === "duplicate" ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-white shrink-0" />
                          )}
                          <span>Unlisted hash</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          {selectedTicket.type === "tampered" ? (
                            <AlertTriangle className="h-3.5 w-3.5 text-neutral-500 shrink-0" />
                          ) : (
                            <Check className="h-3.5 w-3.5 text-white shrink-0" />
                          )}
                          <span>EXIF Integrity</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-neutral-300">
                          <Check className="h-3.5 w-3.5 text-white shrink-0" />
                          <span>Reputation Check</span>
                        </div>
                      </div>

                      {/* Explanation details */}
                      <p className="mt-4 text-[10px] leading-relaxed text-neutral-400 bg-black/25 p-2.5 rounded-lg border border-white/5">
                        {selectedTicket.type === "legit" 
                          ? "Ticket payload matches Injective registry database and is eligible for dynamic transfer."
                          : selectedTicket.type === "tampered"
                          ? "Fails document integrity check. Image EXIF modifications indicate compression tampering."
                          : "Fails duplicate database scan. Fingerprint matches Ticket #2841 already registered."
                        }
                      </p>
                    </div>

                    <button
                      onClick={handleReset}
                      className="w-full text-center text-xs font-semibold text-white hover:text-neutral-300 transition-colors pt-3 border-t border-white/10"
                    >
                      Scan Another Ticket
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Panel Action Button */}
            <div className="mt-5">
              {scanState === "idle" && (
                <Button
                  onClick={handleStartScan}
                  className="w-full py-6 rounded-xl font-bold flex items-center justify-center gap-2 group text-xs tracking-wider uppercase bg-white text-black hover:bg-white/90"
                >
                  Simulate AI Scan
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
              {scanState === "scanning" && (
                <Button
                  disabled
                  className="w-full py-6 rounded-xl text-xs font-bold bg-white/10 text-white border border-white/20 flex items-center justify-center gap-2"
                >
                  <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin shrink-0" />
                  Analyzing Ticket file...
                </Button>
              )}
              {scanState === "completed" && (
                <div className="flex gap-3">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 py-6 rounded-xl text-xs font-semibold hover:bg-white/[0.04] border-white/10 text-white"
                  >
                    Reset
                  </Button>
                  <Button
                    nativeButton={false}
                    render={<Link href="/verify" />}
                    className="flex-1 py-6 rounded-xl text-xs font-semibold bg-white hover:bg-white/90 text-black border border-white/10"
                  >
                    {selectedTicket.type === "legit" ? "Verify Real PDF" : "Try Uploading"}
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Grid of Key Page Actions (Glassmorphic cards with glowing border animations) */}
      <div className="mt-28 grid w-full gap-5 sm:grid-cols-3">
        {[
          {
            href: "/verify",
            icon: ShieldCheck,
            title: "Verify a Ticket",
            description: "Upload a ticket file or photo. Our multi-agent AI models analyze the QR fingerprint and EXIF metadata instantly.",
          },
          {
            href: "/marketplace",
            icon: Store,
            title: "Browse Marketplace",
            description: "Interact with verified, peer-to-peer listings protected by dynamic escrows and ranked by seller reputation scores.",
          },
          {
            href: "/wallet",
            icon: Wallet,
            title: "Claim Wallet",
            description: "Access your attendance memory certificates, ticket ownership NFTs, and dynamic QR gate passes in one place.",
          },
        ].map((action, i) => (
          <motion.div
            key={action.href}
            initial="hidden"
            animate="show"
            custom={4 + i}
            variants={fadeUp}
            className="flex"
          >
            <Link
              href={action.href}
              className="group flex flex-col items-start gap-4 rounded-2xl border border-white/[0.05] bg-white/[0.01] p-6.5 text-left transition-all duration-300 hover:border-white/30 hover:bg-white/[0.03] hover:-translate-y-1 shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:shadow-[0_12px_32px_rgba(255,255,255,0.02)] w-full"
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-white group-hover:bg-white group-hover:text-black transition-all duration-300 border border-white/10 shadow-inner">
                <action.icon className="h-5 w-5" />
              </span>
              <div className="flex flex-col gap-1.5">
                <span className="font-semibold text-white text-sm tracking-tight flex items-center gap-1">
                  {action.title}
                  <ArrowRight className="h-3 w-3 -translate-x-1 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300" />
                </span>
                <span className="text-xs text-neutral-400 leading-relaxed font-light">{action.description}</span>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
