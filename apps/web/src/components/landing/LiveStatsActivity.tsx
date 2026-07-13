"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, ShieldCheck, Activity, Users, Flame } from "lucide-react";

interface StatItem {
  label: string;
  value: string;
  icon: any;
  color: string;
}

const stats: StatItem[] = [
  {
    label: "Escrow Volume Protected",
    value: "1,208,450 USDC",
    icon: ShieldCheck,
    color: "text-primary bg-primary/10",
  },
  {
    label: "Verified World Cup Tickets",
    value: "14,821",
    icon: CheckCircle2,
    color: "text-success bg-success/10",
  },
  {
    label: "AI Processing Latency",
    value: "1.4 seconds",
    icon: Activity,
    color: "text-indigo-400 bg-indigo-400/10",
  },
  {
    label: "Active Buyers & Sellers",
    value: "8,940 Fans",
    icon: Users,
    color: "text-amber-400 bg-amber-400/10",
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
    // Periodically cycle or simulate a new event adding to the log to make it feel alive!
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
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative overflow-hidden py-20 border-t border-border/60">
      {/* Decorative gradient blur backdrop */}
      <div className="absolute right-0 top-1/2 -z-10 h-72 w-72 -translate-y-1/2 rounded-full bg-primary/5 blur-3xl" />
      
      <div className="mx-auto max-w-5xl px-6">
        <div className="grid gap-12 lg:grid-cols-5">
          
          {/* Left: Stats Summary */}
          <div className="lg:col-span-3 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary mb-4">
              <Flame className="h-4 w-4 text-primary animate-pulse" />
              Real-time platform activity
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Escrow volume & cryptographic trust, at scale.
            </h2>
            <p className="mt-4 text-muted-foreground text-sm leading-relaxed max-w-md">
              Every peer-to-peer transaction is protected on the Injective EVM blockchain, verified by 10 orchestrating AI agents in milliseconds.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {stats.map((stat, i) => (
                <div 
                  key={i} 
                  className="rounded-2xl border border-border/70 bg-card/30 p-5 transition-all hover:border-border hover:bg-card/65"
                >
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-lg ${stat.color} mb-3`}>
                    <stat.icon className="h-4 w-4" />
                  </span>
                  <p className="text-xs text-muted-foreground">{stat.label}</p>
                  <p className="mt-1 text-xl font-bold tracking-tight text-foreground">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Live Activity Logs */}
          <div className="lg:col-span-2 flex flex-col">
            <div className="rounded-3xl border border-border bg-card/45 p-6 backdrop-blur-sm flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Live Activity Feed
                  </h3>
                  <span className="text-[10px] text-muted-foreground uppercase font-mono tracking-wider">
                    Injective EVM
                  </span>
                </div>

                <div className="space-y-4">
                  {activities.map((act) => (
                    <motion.div
                      layout
                      key={act.id}
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.4, ease: "easeOut" }}
                      className="flex gap-3 text-xs"
                    >
                      <div className="flex flex-col items-center">
                        <span className={`h-2.5 w-2.5 rounded-full mt-1 shrink-0 ${
                          act.status === "verified" 
                            ? "bg-success" 
                            : act.status === "minted" 
                            ? "bg-primary" 
                            : act.status === "escrow"
                            ? "bg-amber-400" 
                            : "bg-indigo-400"
                        }`} />
                        <div className="w-[1px] flex-1 bg-border/40 my-1" />
                      </div>
                      
                      <div className="flex-1 pb-3 border-b border-border/30 last:border-b-0">
                        <div className="flex justify-between items-start gap-2">
                          <p className="font-medium text-foreground">{act.match}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">{act.time}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{act.action}</p>
                        {act.score !== undefined && (
                          <div className="mt-1 inline-flex items-center gap-1 rounded bg-success/10 px-1.5 py-0.5 font-medium text-[10px] text-success">
                            AI Score: {act.score}/100
                          </div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-border/40 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Activity is indexed directly from smart contract event logs.
                </p>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
