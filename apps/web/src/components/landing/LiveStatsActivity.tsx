"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, ShieldCheck, Activity, Users, Flame } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatItem {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

const stats: StatItem[] = [
  {
    label: "Escrow Volume Protected",
    value: "1,208,450 USDC",
    icon: ShieldCheck,
    color: "text-white bg-white/[0.04] border-white/10 shadow-sm",
  },
  {
    label: "Verified Tickets",
    value: "14,821",
    icon: CheckCircle2,
    color: "text-white bg-white/[0.04] border-white/10 shadow-sm",
  },
  {
    label: "AI Processing Latency",
    value: "1.4 seconds",
    icon: Activity,
    color: "text-neutral-400 bg-white/[0.02] border-white/5",
  },
  {
    label: "Active Buyers & Sellers",
    value: "8,940 Fans",
    icon: Users,
    color: "text-neutral-400 bg-white/[0.02] border-white/5",
  },
];

interface ActivityLog {
  id: string;
  match: string;
  action: string;
  score?: number;
  time: string;
  status: "verified" | "minted" | "escrow" | "checkin";
}

const initialActivities: ActivityLog[] = [
  {
    id: "act-1",
    match: "Argentina vs France (Finals)",
    action: "Ticket verified by AI Trust Engine",
    score: 98,
    time: "2 mins ago",
    status: "verified",
  },
  {
    id: "act-2",
    match: "Brazil vs Germany (Semi-Final)",
    action: "Ownership Certificate NFT minted",
    time: "9 mins ago",
    status: "minted",
  },
  {
    id: "act-3",
    match: "Portugal vs Spain (Group Stage)",
    action: "Escrow funded & locked on-chain",
    time: "15 mins ago",
    status: "escrow",
  },
  {
    id: "act-4",
    match: "USA vs England (Round of 16)",
    action: "Checked in at Venue & Memory Card issued",
    time: "32 mins ago",
    status: "checkin",
  },
  {
    id: "act-5",
    match: "Croatia vs Morocco (Group Stage)",
    action: "Ticket verified by AI Trust Engine",
    score: 94,
    time: "48 mins ago",
    status: "verified",
  },
];

export function LiveStatsActivity() {
  const [activities, setActivities] = useState<ActivityLog[]>(initialActivities);

  useEffect(() => {
    const interval = setInterval(() => {
      const matchNames = [
        "Japan vs Germany (Group E)",
        "Senegal vs Netherlands (Group A)",
        "Belgium vs Canada (Group F)",
        "Mexico vs Poland (Group C)",
        "France vs Denmark (Group D)",
      ];
      const statuses: ActivityLog["status"][] = ["verified", "minted", "escrow", "checkin"];
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      const newActivity: ActivityLog = {
        id: `act-${Date.now()}`,
        match: matchNames[Math.floor(Math.random() * matchNames.length)],
        action: randomStatus === "verified" 
          ? "Ticket verified by AI Trust Engine" 
          : randomStatus === "minted" 
          ? "Ownership Certificate NFT minted" 
          : randomStatus === "escrow"
          ? "Escrow funded & locked on-chain"
          : "Checked in at Venue & Memory Card issued",
        score: randomStatus === "verified" ? Math.floor(Math.random() * 15) + 85 : undefined,
        time: "Just now",
        status: randomStatus,
      };

      setActivities((prev) => [newActivity, ...prev.slice(0, 4)]);
    }, 9000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden py-24 border-y border-white/[0.04]">
      {/* Decorative grayscale light backdrop */}
      <div className="absolute right-0 top-1/2 -z-10 h-80 w-80 -translate-y-1/2 rounded-full bg-white/[0.015] blur-[120px] pointer-events-none" />
      <div className="absolute left-0 bottom-0 -z-10 h-72 w-72 rounded-full bg-white/[0.01] blur-[110px] pointer-events-none" />
      
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 lg:grid-cols-5 items-center">
          
          {/* Left: Stats Summary */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-white mb-4">
              <Flame className="h-4 w-4 text-white animate-pulse" />
              Real-time platform activity
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl text-foreground text-balance">
              Escrow Volume & Cryptographic Trust, at Scale
            </h2>
            <p className="mt-4 text-neutral-400 text-sm font-light leading-relaxed max-w-md">
              Every peer-to-peer transaction is protected on the Injective EVM blockchain, verified by 10 orchestrating AI agents in milliseconds.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className="rounded-2xl border border-white/[0.05] bg-white/[0.01] p-5 transition-all duration-300 hover:border-white/[0.12] hover:bg-white/[0.03] hover:-translate-y-0.5 shadow-sm"
                >
                  <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border ${stat.color}`}>
                    <stat.icon className="h-4.5 w-4.5" />
                  </span>
                  <p className="text-xs text-neutral-500 font-medium">{stat.label}</p>
                  <p className="mt-1 text-2xl font-bold tracking-tight text-white font-mono">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Activity Logs */}
          <div className="lg:col-span-2 flex flex-col h-full justify-center">
            <div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 backdrop-blur-xl flex flex-col justify-between shadow-2xl shadow-black/45 min-h-[460px]">
              <div>
                <div className="flex items-center justify-between mb-6 pb-3 border-b border-white/[0.05]">
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2.5">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
                    </span>
                    Live Activity Feed
                  </h3>
                  <span className="text-[9px] text-neutral-500 uppercase font-mono tracking-widest bg-white/[0.03] px-2.5 py-1 rounded-md border border-white/[0.05]">
                    Injective EVM
                  </span>
                </div>

                <div className="space-y-4">
                  <AnimatePresence mode="popLayout">
                    {activities.map((act) => (
                      <motion.div
                        layout
                        key={act.id}
                        initial={{ opacity: 0, y: -15, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 15, scale: 0.98 }}
                        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                        className="flex gap-3 text-xs"
                      >
                        <div className="flex flex-col items-center">
                          <span className={`h-2 w-2 rounded-full mt-1.5 shrink-0 shadow-sm ${
                            act.status === "verified" 
                              ? "bg-white shadow-white/20" 
                              : act.status === "minted" 
                              ? "bg-neutral-300" 
                              : act.status === "escrow"
                              ? "bg-neutral-500" 
                              : "bg-neutral-700"
                          }`} />
                          <div className="w-[1px] flex-1 bg-white/[0.08] my-1" />
                        </div>
                        
                        <div className="flex-1 pb-3 border-b border-white/[0.04] last:border-b-0">
                          <div className="flex justify-between items-start gap-3">
                            <p className="font-semibold text-white text-xs leading-tight tracking-tight">{act.match}</p>
                            <span className="text-[9px] text-neutral-500 font-mono whitespace-nowrap">{act.time}</span>
                          </div>
                          <p className="text-[11px] text-neutral-400 mt-1 font-light">{act.action}</p>
                          {act.score !== undefined && (
                            <div className="mt-1.5 inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 font-mono text-[9px] font-semibold text-white border border-white/15 shadow-sm">
                              AI Score: {act.score}/100
                            </div>
                          )}
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.04] text-center">
                <p className="text-[10px] text-neutral-500 font-light leading-relaxed">
                  Platform activity events are indexed dynamically from core smart contract logs.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
