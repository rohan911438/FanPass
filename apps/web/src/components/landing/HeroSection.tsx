"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Store, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
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
  return (
    <section className="mx-auto flex max-w-5xl flex-col items-center px-6 pb-24 pt-28 text-center sm:pt-36">
      <motion.div
        initial="hidden"
        animate="show"
        custom={0}
        variants={fadeUp}
        className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs text-muted-foreground"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-success" />
        Built for the World Cup — live on Injective EVM Testnet
      </motion.div>

      <motion.h1
        initial="hidden"
        animate="show"
        custom={1}
        variants={fadeUp}
        className="text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
      >
        The trust layer for
        <br className="hidden sm:block" /> peer-to-peer ticket resale.
      </motion.h1>

      <motion.p
        initial="hidden"
        animate="show"
        custom={2}
        variants={fadeUp}
        className="mt-6 max-w-xl text-balance text-lg text-muted-foreground"
      >
        FanPass verifies every ticket with AI, escrows every payment, and proves ownership —
        so buying and selling never comes down to hope.
      </motion.p>

      <motion.div
        initial="hidden"
        animate="show"
        custom={3}
        variants={fadeUp}
        className="mt-10 flex flex-col gap-3 sm:flex-row"
      >
        <Button size="lg" className="rounded-full px-8" render={<Link href="/verify" />}>
          Verify a Ticket
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="rounded-full px-8"
          render={<Link href="/marketplace" />}
        >
          Browse Marketplace
        </Button>
      </motion.div>

      <div className="mt-20 grid w-full gap-4 sm:grid-cols-3">
        {actions.map((action, i) => (
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
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <action.icon className="h-5 w-5" />
              </span>
              <span className="font-medium">{action.title}</span>
              <span className="text-sm text-muted-foreground">{action.description}</span>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
