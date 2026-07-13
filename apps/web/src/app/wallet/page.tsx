"use client";

import { useQuery } from "@tanstack/react-query";
import { Award, BadgeCheck, Receipt, Sparkles, Wallet as WalletIcon } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AssetList } from "@/components/wallet/AssetList";
import { AttendanceBadgeTile } from "@/components/wallet/AttendanceBadgeTile";
import { CertificateCard } from "@/components/wallet/CertificateCard";
import { MemoryCardTile } from "@/components/wallet/MemoryCardTile";
import { OwnedTicketsTab } from "@/components/wallet/OwnedTicketsTab";
import { TransactionRow } from "@/components/wallet/TransactionRow";
import { useWallet } from "@/hooks/useWallet";
import { getWalletSummary } from "@/lib/api/wallet";
import { queryKeys } from "@/lib/query/queryClient";

export default function WalletPage() {
  const { address, isConnected } = useWallet();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.wallet(address ?? ""),
    queryFn: () => getWalletSummary(address!),
    enabled: Boolean(address),
  });

  return (
    <div className="flex-1 pb-24">
      <PageHeader
        title="Wallet"
        description="Owned tickets, ownership certificates, attendance badges, memory cards, and activity."
      />
      <div className="mx-auto max-w-5xl px-6">
        {!isConnected ? (
          <EmptyState
            icon={WalletIcon}
            title="Connect your wallet"
            description="Connect to see your tickets, certificates, badges, memory cards, and activity."
          />
        ) : isLoading || !data ? (
          <div className="flex flex-col gap-4">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-56 w-full rounded-2xl" />
          </div>
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-3 rounded-xl border border-border p-4 text-sm">
              <Badge className="capitalize">{data.user.reputationTier}</Badge>
              {data.trustScore && <span>Trust Score {data.trustScore.score}/100</span>}
              <span className="text-muted-foreground">
                {data.user.stats.ticketsBought} bought · {data.user.stats.ticketsSold} sold
              </span>
            </div>

            <Tabs defaultValue="tickets">
              <TabsList>
                <TabsTrigger value="tickets">Owned Tickets</TabsTrigger>
                <TabsTrigger value="certificates">Certificates</TabsTrigger>
                <TabsTrigger value="badges">Badges</TabsTrigger>
                <TabsTrigger value="memory">Memory Cards</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
              </TabsList>

              <TabsContent value="tickets" className="pt-4">
                <OwnedTicketsTab tickets={data.tickets} myListings={data.myListings} walletAddress={data.walletAddress} />
              </TabsContent>

              <TabsContent value="certificates" className="pt-4">
                <AssetList
                  items={data.certificates}
                  renderItem={(cert) => <CertificateCard key={cert.certId} certificate={cert} />}
                  emptyIcon={Award}
                  emptyTitle="No certificates yet"
                  emptyDescription="Ownership certificates appear here once a ticket is verified."
                />
              </TabsContent>

              <TabsContent value="badges" className="pt-4">
                <AssetList
                  items={data.attendanceBadges}
                  renderItem={(badge) => <AttendanceBadgeTile key={badge.attendanceId} attendance={badge} />}
                  emptyIcon={BadgeCheck}
                  emptyTitle="No attendance badges yet"
                  emptyDescription="Badges unlock after venue check-in — coming in a later phase."
                />
              </TabsContent>

              <TabsContent value="memory" className="pt-4">
                <AssetList
                  items={data.memoryCards}
                  renderItem={(card) => <MemoryCardTile key={card.cardId} card={card} />}
                  emptyIcon={Sparkles}
                  emptyTitle="No memory cards yet"
                  emptyDescription="AI match summaries unlock after attendance — coming in a later phase."
                />
              </TabsContent>

              <TabsContent value="activity" className="flex flex-col gap-2 pt-4">
                {data.transactions.length === 0 ? (
                  <EmptyState
                    icon={Receipt}
                    title="No activity yet"
                    description="Purchases and sales will show up here."
                  />
                ) : (
                  data.transactions.map((transaction) => (
                    <TransactionRow key={transaction.txId} transaction={transaction} walletAddress={data.walletAddress} />
                  ))
                )}
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
}
