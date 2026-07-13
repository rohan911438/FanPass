"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, Store, Wallet, QrCode, ArrowRight, Scan, AlertTriangle, FileText, Check } from "lucide-react";
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
    eventDate: "2026-07-18T18:00:00Z",
    seatInfo: "Block 104, Row K, Seat 12",
    price: "450 USDC",
    type: "legit",
    fileType: "WorldCup_Final_Ticket.pdf",
  },
  {
    id: "t-2",
    eventName: "Brazil vs Germany (Semi)",
    venue: "Maracanã, Rio de Janeiro",
    eventDate: "2026-07-22T20:00:00Z",
    seatInfo: "VIP Box 3, Seat 4",
    price: "1,200 USDC",
    type: "tampered",
    fileType: "ticket_bra_ger_final.png",
  },
  {
    id: "t-3",
    eventName: "Portugal vs Spain (Group)",
    venue: "Al Bayt Stadium, Al Khor",
    eventDate: "2026-07-19T16:00:00Z",
    seatInfo: "Category 1, Row AA, Seat 3",
    price: "350 USDC",
    type: "duplicate",
    fileType: "ticket_por_spa_copy.jpg",
  },
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

  const steps = [
    "OCR Agent: Extracting metadata...",
    "QR Agent: Decoding barcode fingerprint...",
    "Fraud Agent: Scanning for tampered pixels...",
    "Pricing Agent: Comparing comps & fair value...",
  ];

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (scanState === "scanning") {
      if (currentStep < steps.length) {
        timer = setTimeout(() => {
          setCurrentStep((prev) => prev + 1);
        }, 800);
      } else {
        setScanState("completed");
      }
    }
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
    <section className="mx-auto max-w-6xl px-6 pb-24 pt-20 sm:pt-28">
      <div className="grid gap-12 lg:grid-cols-12 items-center">
        
        {/* Left Column: Headline and CTAs */}
        <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left">
          <motion.div
            initial="hidden"
            animate="show"
            custom={0}
            variants={fadeUp}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" />
            Live on Injective EVM Testnet
          </motion.div>

          <motion.h1
            initial="hidden"
            animate="show"
            custom={1}
            variants={fadeUp}
            className="text-4xl sm:text-6xl font-extrabold tracking-tight text-balance leading-[1.1] bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text"
          >
            The Trust Layer for <br className="hidden sm:block" />
            <span className="text-primary bg-gradient-to-r from-primary to-indigo-400 bg-clip-text text-transparent">
              Peer-to-Peer Resale
            </span>
          </motion.h1>

          <motion.p
            initial="hidden"
            animate="show"
            custom={2}
            variants={fadeUp}
            className="mt-6 max-w-xl text-balance text-base sm:text-lg text-muted-foreground leading-relaxed"
          >
            FanPass uses multi-agent AI to inspect event tickets, fund escrow protection, and mint digital ownership certificates. Buy and sell with absolute certainty.
          </motion.p>

          <motion.div
            initial="hidden"
            animate="show"
            custom={3}
            variants={fadeUp}
            className="mt-8 flex flex-col sm:flex-row gap-3 w-full sm:w-auto"
          >
            <Button
              size="lg"
              className="rounded-full px-8 py-6 text-sm font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/35 transition-all"
              nativeButton={false}
              render={<Link href="/verify" />}
            >
              Verify Your Ticket
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-full px-8 py-6 text-sm font-semibold"
              nativeButton={false}
              render={<Link href="/marketplace" />}
            >
              Browse Listings
            </Button>
          </motion.div>
        </div>

        {/* Right Column: Interactive Scanner Simulator */}
        <div className="lg:col-span-5 flex justify-center">
          <div className="w-full max-w-[420px] rounded-3xl border border-border bg-card/45 p-6 shadow-2xl relative overflow-hidden backdrop-blur-md">
            
            {/* Ambient glows inside card */}
            <div className="absolute -right-10 -top-10 -z-10 h-32 w-32 rounded-full bg-primary/10 blur-2xl" />
            <div className="absolute -left-10 -bottom-10 -z-10 h-32 w-32 rounded-full bg-indigo-500/10 blur-2xl" />

            <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-4">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase flex items-center gap-1.5">
                <Scan className="h-3.5 w-3.5 text-primary" />
                AI Trust Simulator
              </span>
              <span className="text-[10px] bg-primary/10 text-primary border border-primary/20 rounded px-2 py-0.5 font-mono">
                v2.0 MOCK
              </span>
            </div>

            {/* Ticket Selection Tabs */}
            <div className="flex gap-2 mb-6">
              {mockTickets.map((t) => (
                <button
                  key={t.id}
                  disabled={scanState === "scanning"}
                  onClick={() => handleSelectTicket(t)}
                  className={`flex-1 text-[11px] font-medium py-1.5 px-2 rounded-lg border transition-all ${
                    selectedTicket.id === t.id
                      ? "bg-primary border-primary text-primary-foreground font-semibold shadow-sm"
                      : "border-border/60 bg-muted/20 text-muted-foreground hover:bg-muted/40 hover:text-foreground disabled:opacity-50"
                  }`}
                >
                  {t.type === "legit" ? "Legit" : t.type === "tampered" ? "Tampered" : "Duplicate"}
                </button>
              ))}
            </div>

            {/* Main Visual Display */}
            <div className="relative rounded-2xl border border-border/80 bg-card p-5 overflow-hidden shadow-inner flex flex-col justify-between min-h-[220px]">
              
              {/* Ticket Details Panel */}
              <div className="relative z-10 flex flex-col gap-2.5">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground leading-tight">{selectedTicket.eventName}</h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{selectedTicket.venue}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono bg-muted/45 px-1.5 py-0.5 rounded border border-border/40 shrink-0">
                    {selectedTicket.price}
                  </span>
                </div>

                <div className="border-t border-dashed border-border/60 my-1" />

                <div className="grid grid-cols-2 gap-2 text-[10px] text-muted-foreground">
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/60">Date</span>
                    <span className="font-medium text-foreground">
                      {new Date(selectedTicket.eventDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[8px] uppercase tracking-wider text-muted-foreground/60">Seat</span>
                    <span className="font-medium text-foreground">{selectedTicket.seatInfo}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[9px] bg-muted/30 text-muted-foreground p-1.5 rounded border border-border/40 font-mono">
                  <FileText className="h-3 w-3 text-muted-foreground" />
                  {selectedTicket.fileType}
                </div>
              </div>

              {/* Barcode representation */}
              <div className="mt-4 flex flex-col items-center gap-1 relative z-10">
                <div className="h-8 w-full bg-[repeating-linear-gradient(90deg,currentColor,currentColor_1px,transparent_1px,transparent_4px)] text-muted-foreground/60 opacity-60" />
                <span className="text-[8px] font-mono text-muted-foreground tracking-widest">
                  *INJ-EVMT-{selectedTicket.id.toUpperCase()}*
                </span>
              </div>

              {/* SCANNING OVERLAY ANIMATION */}
              <AnimatePresence>
                {scanState === "scanning" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background/85 backdrop-blur-[1px] z-20 p-4 flex flex-col justify-center gap-3"
                  >
                    {/* Scanner laser line */}
                    <div className="absolute left-0 right-0 h-[2px] bg-primary shadow-[0_0_8px_var(--primary)] animate-[bounce_1.5s_infinite]" />
                    
                    <div className="space-y-2.5">
                      {steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs font-mono">
                          {currentStep > idx ? (
                            <Check className="h-3.5 w-3.5 text-success shrink-0" />
                          ) : currentStep === idx ? (
                            <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin shrink-0" />
                          ) : (
                            <span className="h-3.5 w-3.5 rounded-full border border-border shrink-0" />
                          )}
                          <span className={`${
                            currentStep === idx 
                              ? "text-primary font-medium" 
                              : currentStep > idx 
                              ? "text-muted-foreground" 
                              : "text-muted-foreground/40"
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
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-background z-25 p-4 flex flex-col justify-between border-2 border-primary/20 rounded-2xl"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-bold text-foreground font-mono">Verification Report</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          selectedTicket.type === "legit" 
                            ? "bg-success/10 text-success border border-success/30" 
                            : "bg-destructive/10 text-destructive border border-destructive/30"
                        }`}>
                          {selectedTicket.type === "legit" ? "Verified" : "Needs Review"}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-1.5 mb-4">
                        <span className={`text-4xl font-extrabold tracking-tight ${
                          selectedTicket.type === "legit" ? "text-success" : "text-destructive"
                        }`}>
                          {selectedTicket.type === "legit" ? "98" : selectedTicket.type === "tampered" ? "42" : "35"}
                        </span>
                        <span className="text-xs text-muted-foreground">/100 Trust Score</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Check className="h-3 w-3 text-success shrink-0" />
                          <span>Decoded QR</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {selectedTicket.type === "duplicate" ? (
                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                          ) : (
                            <Check className="h-3 w-3 text-success shrink-0" />
                          )}
                          <span>No Duplicate</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          {selectedTicket.type === "tampered" ? (
                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                          ) : (
                            <Check className="h-3 w-3 text-success shrink-0" />
                          )}
                          <span>Fraud Check</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-muted-foreground">
                          <Check className="h-3 w-3 text-success shrink-0" />
                          <span>Reputation Check</span>
                        </div>
                      </div>

                      {/* Explanation details */}
                      <p className="mt-3.5 text-[10px] text-muted-foreground bg-muted/30 p-2 rounded border border-border/40">
                        {selectedTicket.type === "legit" 
                          ? "Ticket matches World Cup database and is eligible for dynamic QR issuance."
                          : selectedTicket.type === "tampered"
                          ? "Fails metadata scan. Compression anomalies indicate screenshot editing."
                          : "Fails duplicate scan. Fingerprint matches Ticket #2841 already registered."
                        }
                      </p>
                    </div>

                    <button
                      onClick={handleReset}
                      className="w-full text-center text-xs font-semibold text-primary hover:text-indigo-400 transition-colors pt-2 border-t border-border/30"
                    >
                      Scan Another Ticket
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Bottom Panel Actions */}
            <div className="mt-5">
              {scanState === "idle" && (
                <Button
                  onClick={handleStartScan}
                  className="w-full py-5 rounded-xl font-bold flex items-center justify-center gap-2 group text-xs tracking-wide"
                >
                  Simulate AI Scan
                  <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
                </Button>
              )}
              {scanState === "scanning" && (
                <Button
                  disabled
                  className="w-full py-5 rounded-xl text-xs font-bold bg-primary/20 text-primary border border-primary/30"
                >
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin mr-2 shrink-0" />
                  Analyzing Ticket file...
                </Button>
              )}
              {scanState === "completed" && (
                <div className="flex gap-2">
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    className="flex-1 py-5 rounded-xl text-xs font-semibold"
                  >
                    Reset
                  </Button>
                  <Button
                    nativeButton={false}
                    render={<Link href={selectedTicket.type === "legit" ? "/verify" : "/verify"} />}
                    className="flex-1 py-5 rounded-xl text-xs font-semibold bg-success hover:bg-success/80 text-success-foreground"
                  >
                    Try Uploading
                  </Button>
                </div>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* Grid of Key Page Actions (The 3 cards from the bottom of the original HeroSection) */}
      <div className="mt-24 grid w-full gap-4 sm:grid-cols-3">
        {[
          {
            href: "/verify",
            icon: ShieldCheck,
            title: "Verify a Ticket",
            description: "Upload a ticket and get an AI Trust Score in seconds — before you buy or sell.",
          },
          {
            href: "/marketplace",
            icon: Store,
            title: "Marketplace",
            description: "Browse only verified tickets, ranked by trust score and seller reputation.",
          },
          {
            href: "/wallet",
            icon: Wallet,
            title: "Wallet",
            description: "Your ownership certificates, attendance badges, and memory cards, in one place.",
          },
        ].map((action, i) => (
          <motion.div
            key={action.href}
            initial="hidden"
            animate="show"
            custom={4 + i}
            variants={fadeUp}
          >
            <Link
              href={action.href}
              className="group flex h-full flex-col items-start gap-3 rounded-2xl border border-border bg-card/50 p-6 text-left transition-colors hover:border-primary/50 hover:bg-card"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="font-semibold text-foreground">{action.title}</span>
              <span className="text-xs text-muted-foreground leading-relaxed">{action.description}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
