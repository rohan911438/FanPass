"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft, BadgeCheck, ShieldCheck, UploadCloud } from "lucide-react";

const steps = [
  { 
    number: "01",
    icon: UploadCloud, 
    label: "Upload Document", 
    description: "Drag & drop a ticket PDF or upload a clear photo of the barcode instantly." 
  },
  { 
    number: "02",
    icon: ShieldCheck, 
    label: "AI Verification", 
    description: "Ten orchestrating AI models inspect pixel edits, QR fingerprints, and registry comps." 
  },
  { 
    number: "03",
    icon: BadgeCheck, 
    label: "Verify Trust Score", 
    description: "Access an open, cryptographic 0-100 grade breakdown detailing potential risks." 
  },
  { 
    number: "04",
    icon: ArrowRightLeft, 
    label: "Secure Escrow Swap", 
    description: "Lock funds on-chain. Escrow releases assets atomically after gate checks pass." 
  },
];

export function HowItWorks() {
  return (
    <section className="relative border-t border-white/[0.04] bg-card/5 overflow-hidden">
      <div className="absolute top-1/2 left-1/4 -translate-y-1/2 -z-10 h-72 w-72 rounded-full bg-white/[0.01] blur-[120px] pointer-events-none" />
      
      <div className="mx-auto max-w-5xl px-6 py-24">
        <div className="flex flex-col items-center text-center mb-16">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-white">
            Onboarding Flow
          </h2>
          <p className="mt-3 text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground text-balance">
            Four Steps to Cryptographic Safety
          </p>
        </div>

        <div className="relative mt-12 grid gap-8 sm:grid-cols-4">
          
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="group relative flex flex-col items-center text-center sm:items-start sm:text-left bg-white/[0.01] border border-white/[0.05] p-6 rounded-2xl backdrop-blur-xl hover:bg-white/[0.03] hover:border-white/20 transition-all duration-300 shadow-sm"
            >
              {/* Connector line for large screens */}
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-9.5 left-[85%] w-[45%] h-[1px] border-t border-dashed border-white/10 z-10 pointer-events-none group-hover:border-white/20 transition-colors duration-300" />
              )}

              <div className="flex items-center justify-between w-full mb-4">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] border border-white/10 text-white shadow-inner">
                  <step.icon className="h-5 w-5" />
                </span>
                
                {/* Stylized step number */}
                <span className="text-lg font-black tracking-tight bg-gradient-to-r from-white to-neutral-500 bg-clip-text text-transparent opacity-75 font-mono select-none">
                  {step.number}
                </span>
              </div>

              <h3 className="font-bold text-white text-sm tracking-tight mb-2 leading-none flex items-center gap-1.5">
                {step.label}
              </h3>
              <p className="text-xs text-neutral-400 leading-relaxed font-light">{step.description}</p>
            </motion.div>
          ))}

        </div>
      </div>
    </section>
  );
}
