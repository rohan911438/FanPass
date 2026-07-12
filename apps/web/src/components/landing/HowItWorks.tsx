"use client";

import { motion } from "framer-motion";
import { ArrowRightLeft, BadgeCheck, ShieldCheck, UploadCloud } from "lucide-react";

const steps = [
  { icon: UploadCloud, label: "Upload", description: "Photo, PDF, or QR — no paperwork." },
  { icon: ShieldCheck, label: "AI Verification", description: "OCR, QR, fraud, and ownership checks." },
  { icon: BadgeCheck, label: "Trust Score", description: "A transparent score, not a black box." },
  { icon: ArrowRightLeft, label: "Secure Transfer", description: "Escrow-backed, ownership guaranteed." },
];

export function HowItWorks() {
  return (
    <section className="border-t border-border/60 bg-card/20">
      <div className="mx-auto max-w-5xl px-6 py-20">
        <h2 className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground">
          How it works
        </h2>

        <div className="mt-10 grid gap-8 sm:grid-cols-4">
          {steps.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ delay: i * 0.1, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col items-center text-center sm:items-start sm:text-left"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground">
                <step.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 font-medium">{step.label}</p>
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
