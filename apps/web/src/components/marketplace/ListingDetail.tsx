"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, CheckCircle2, Repeat, ShoppingCart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrustScoreCard } from "@/components/ticket/TrustScoreCard";
import { WalletConnectButton } from "@/components/shared/WalletConnectButton";
import { useBuyTicket } from "@/hooks/useBuyTicket";
import { useCancelListing } from "@/hooks/useCancelListing";
import { useVerificationProgress } from "@/hooks/useVerificationProgress";
import { useWallet } from "@/hooks/useWallet";
import { getListingDetail } from "@/lib/api/listings";
import { queryKeys } from "@/lib/query/queryClient";

const REPUTATION_LABEL: Record<string, string> = {
  new: "New Seller",
  verified: "Verified Seller",
  trusted: "Trusted Seller",
  elite: "Elite Seller",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface ListingDetailProps {
  listingId: string;
}

export function ListingDetail({ listingId }: ListingDetailProps) {
  const { address, isConnected } = useWallet();
  const queryClient = useQueryClient();
  const [justBought, setJustBought] = useState(false);

  const { data: summary, isLoading } = useQuery({
    queryKey: queryKeys.listingDetail(listingId),
    queryFn: () => getListingDetail(listingId),
  });

  const { data: progress } = useVerificationProgress(summary?.listing.ticketId);

  const buyMutation = useBuyTicket(address);
  const cancelMutation = useCancelListing(address);

  function handleBuy() {
    if (!address || !summary) return;
    buyMutation.mutate(
      { listingId, askPrice: summary.listing.askPrice, buyerAddress: address as `0x${string}` },
      {
        onSuccess: () => {
          setJustBought(true);
          toast.success("Purchase complete — the ticket is now in your wallet.");
          queryClient.invalidateQueries({ queryKey: queryKeys.listingDetail(listingId) });
        },
        onError: (error) => {
          toast.error(error instanceof Error ? error.message : "Purchase failed. Try again.");
        },
      }
    );
  }

  function handleCancel() {
    cancelMutation.mutate(listingId, {
      onSuccess: () => {
        toast.success("Listing cancelled.");
        queryClient.invalidateQueries({ queryKey: queryKeys.listingDetail(listingId) });
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Cancel failed. Try again.");
      },
    });
  }

  if (isLoading || !summary) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-40 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const { listing } = summary;
  const isOwnListing = isConnected && address?.toLowerCase() === listing.sellerAddress.toLowerCase();
  const canBuy = listing.status === "active" && isConnected && !isOwnListing;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between gap-2">
            <span>{listing.eventName}</span>
            <Badge variant={listing.status === "active" ? "default" : "secondary"}>
              {listing.status.replace("_", " ")}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm text-muted-foreground">
          <span>
            {listing.venue} · {formatDate(listing.eventDate)}
            {listing.seatInfo ? ` · ${listing.seatInfo}` : ""}
          </span>

          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold text-foreground">{listing.askPrice}</span>
            <span className="text-muted-foreground">USDC</span>
          </div>
          <p className="text-xs">
            AI suggested fair price: {listing.aiSuggestedPrice.min}–{listing.aiSuggestedPrice.max} USDC (fair{" "}
            {listing.aiSuggestedPrice.fair})
          </p>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Badge variant="outline">{REPUTATION_LABEL[summary.sellerReputation?.tier ?? "new"]}</Badge>
            {summary.transferCount > 0 && (
              <span className="flex items-center gap-1">
                <Repeat className="size-3" />
                {summary.transferCount} prior transfer{summary.transferCount > 1 ? "s" : ""}
              </span>
            )}
          </div>

          {justBought ? (
            <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-success">
              <CheckCircle2 className="size-4" />
              Purchase complete — check your Wallet.
            </div>
          ) : isOwnListing ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs">This is your own listing.</p>
              {listing.status === "active" && (
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={cancelMutation.isPending}
                  onClick={handleCancel}
                  className="w-fit gap-1.5"
                >
                  <Ban className="size-3.5" />
                  {cancelMutation.isPending ? "Confirm in wallet…" : "Cancel listing"}
                </Button>
              )}
            </div>
          ) : !isConnected ? (
            <div className="flex flex-col gap-2">
              <p className="text-xs">Connect your wallet to buy this ticket.</p>
              <WalletConnectButton />
            </div>
          ) : (
            <Button disabled={!canBuy || buyMutation.isPending} onClick={handleBuy} className="self-start gap-1.5 px-6">
              <ShoppingCart className="size-4" />
              {buyMutation.isPending ? "Confirm in wallet…" : `Buy for ${listing.askPrice} USDC`}
            </Button>
          )}
        </CardContent>
      </Card>

      {progress && progress.stage === "complete" ? (
        <TrustScoreCard
          ticket={{
            ticketId: listing.ticketId,
            eventName: listing.eventName,
            eventDate: listing.eventDate,
            venue: listing.venue,
            seatInfo: listing.seatInfo,
            sellerAddress: listing.sellerAddress,
            qrHash: null,
            tokenId: null,
            imageUrl: listing.imageUrl,
            status: "listed",
            createdAt: listing.createdAt,
            updatedAt: listing.updatedAt,
          }}
          progress={progress}
        />
      ) : (
        <Skeleton className="h-64 w-full rounded-2xl" />
      )}
    </div>
  );
}
