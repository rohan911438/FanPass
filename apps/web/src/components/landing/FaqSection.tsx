"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, HelpCircle } from "lucide-react";

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "How does the AI verification process work?",
    answer: "FanPass runs a multi-agent AI system. When you upload a ticket (PDF or image), our OCR Agent extracts details, the QR Agent decodes and fingerprints the barcode to prevent duplication, and the Fraud Agent inspects the image for edits, screenshot markers, or metadata tampering. The results are aggregated into a transparent 0-100 Trust Score.",
  },
  {
    question: "What is the Escrow model and how does it protect me?",
    answer: "When a purchase is initiated, the buyer's payment is held in a secure Escrow contract on-chain. The escrow only releases funds to the seller after the ticket's Ownership Certificate is successfully transferred to the buyer's wallet. If a dispute is raised, funds remain locked until resolution, eliminating exit scams.",
  },
  {
    question: "What is the Ownership Certificate?",
    answer: "The Ownership Certificate is an ERC-721 NFT minted on-chain that acts as the single source of truth for who owns the ticket. Every transfer, list, or sale updates this certificate. This represents invisible blockchain infrastructure; users do not need prior crypto experience to buy or sell.",
  },
  {
    question: "Why is FanPass built on the Injective EVM Testnet?",
    answer: "Injective EVM provides the speed and cost efficiency needed for real-time ticket transactions. With sub-second block times and sub-penny fees, we can anchor critical trust check-points on-chain dynamically without slowing down the user experience or charging premium gas fees.",
  },
];

export function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleIndex = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section className="relative border-t border-white/[0.04] bg-card/5">
      <div className="mx-auto max-w-4xl px-6 py-24">
        
        <div className="flex flex-col items-center text-center mb-16">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] text-white border border-white/10 shadow-inner mb-4">
            <HelpCircle className="h-5 w-5" />
          </span>
          <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground text-balance">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-neutral-400 text-sm font-light max-w-lg leading-relaxed">
            Everything you need to know about the AI verification registry, secure escrow model, and blockchain tickets.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`overflow-hidden rounded-2xl border transition-all duration-300 ${
                  isOpen 
                    ? "border-white/30 bg-white/[0.03] shadow-md border-l-2 border-l-white" 
                    : "border-white/[0.05] bg-white/[0.01] hover:border-white/20 hover:bg-white/[0.02]"
                }`}
              >
                <button
                  onClick={() => toggleIndex(index)}
                  className="flex w-full items-center justify-between p-6 text-left font-semibold text-sm sm:text-base text-white outline-none focus-visible:ring-1 focus-visible:ring-white/20 transition-colors"
                  aria-expanded={isOpen}
                >
                  <span className={isOpen ? "text-white" : "text-neutral-300"}>{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-neutral-500 transition-all duration-300 shrink-0 ${
                      isOpen ? "rotate-180 text-white" : "group-hover:text-white"
                    }`}
                  />
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                    >
                      <div className="border-t border-white/[0.04] bg-black/10 px-6 pb-6 pt-4 text-xs sm:text-sm leading-relaxed text-neutral-400 font-light">
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
