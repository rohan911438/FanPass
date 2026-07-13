import Link from "next/link";
import { Repeat, Sparkles } from "lucide-react";
import type { ListingSummary, Ticket } from "@fanpass/shared";
import { TicketCard } from "@/components/ticket/TicketCard";
import { Badge } from "@/components/ui/badge";

const REPUTATION_LABEL: Record<string, string> = {
  new: "New Seller",
  verified: "Verified Seller",
  trusted: "Trusted Seller",
  elite: "Elite Seller",
};

/** The listing's denormalized ticket snapshot is a complete, honest Ticket view — not a fabrication. */
function listingToTicketView(summary: ListingSummary): Ticket {
  const { listing } = summary;
  return {
    ticketId: listing.ticketId,
    eventName: listing.eventName,
    eventDate: listing.eventDate,
    venue: listing.venue,
    seatInfo: listing.seatInfo,
    sellerAddress: listing.sellerAddress,
    qrHash: null,
    imageUrl: listing.imageUrl,
    status: "listed",
    createdAt: listing.createdAt,
    updatedAt: listing.updatedAt,
  };
}

interface ListingGridProps {
  listings: ListingSummary[];
}

export function ListingGrid({ listings }: ListingGridProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {listings.map((summary) => (
        <Link key={summary.listing.listingId} href={`/marketplace/listing/${summary.listing.listingId}`}>
          <TicketCard
            ticket={listingToTicketView(summary)}
            trustScore={summary.trustScore}
            askPrice={summary.listing.askPrice}
            footer={
              <div className="flex w-full items-center justify-between text-xs text-muted-foreground">
                <span>{REPUTATION_LABEL[summary.sellerReputation?.tier ?? "new"]}</span>
                <div className="flex items-center gap-2">
                  {summary.transferCount > 0 && (
                    <span className="flex items-center gap-1">
                      <Repeat className="size-3" />
                      {summary.transferCount}
                    </span>
                  )}
                  {summary.aiSuggestedDeal && (
                    <Badge className="gap-1">
                      <Sparkles className="size-3" />
                      AI Suggested Deal
                    </Badge>
                  )}
                </div>
              </div>
            }
          />
        </Link>
      ))}
    </div>
  );
}
