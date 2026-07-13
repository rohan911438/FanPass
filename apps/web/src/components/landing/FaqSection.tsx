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
    <section className="border-t border-border/60 bg-card/10">
      <div className="mx-auto max-w-4xl px-6 py-24">
        <div className="flex flex-col items-center text-center mb-16">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary mb-4">
            <HelpCircle className="h-5 w-5" />
          </span>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-muted-foreground max-w-lg">
            Everything you need to know about the AI verification registry, secure escrow model, and blockchain tickets.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className="overflow-hidden rounded-2xl border border-border bg-card/45 transition-colors hover:border-primary/30"
              >
                <button
                  onClick={() => toggleIndex(index)}
                  className="flex w-full items-center justify-between p-6 text-left font-medium text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-300 ${
                      isOpen ? "rotate-180 text-primary" : ""
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
                      <div className="border-t border-border/40 px-6 pb-6 pt-4 text-sm leading-relaxed text-muted-foreground">
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
