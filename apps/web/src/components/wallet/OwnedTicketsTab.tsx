"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Ban, Ticket as TicketIcon } from "lucide-react";
import type { MarketplaceListing, Ticket } from "@fanpass/shared";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { TicketCard } from "@/components/ticket/TicketCard";
import { ListTicketForm } from "@/components/marketplace/ListTicketForm";
import { cancelListing } from "@/lib/api/listings";
import { queryKeys } from "@/lib/query/queryClient";

interface OwnedTicketsTabProps {
  tickets: Ticket[];
  myListings: MarketplaceListing[];
  walletAddress: string;
}

export function OwnedTicketsTab({ tickets, myListings, walletAddress }: OwnedTicketsTabProps) {
  const [listingFormTicketId, setListingFormTicketId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const cancelMutation = useMutation({
    mutationFn: (listingId: string) => cancelListing(listingId, walletAddress),
    onSuccess: () => {
      toast.success("Listing cancelled.");
      queryClient.invalidateQueries({ queryKey: queryKeys.wallet(walletAddress) });
      queryClient.invalidateQueries({ queryKey: queryKeys.listings() });
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Cancel failed. Try again.");
    },
  });

  if (tickets.length === 0) {
    return (
      <EmptyState
        icon={TicketIcon}
        title="No tickets yet"
        description="Verify a ticket on /verify to see it here."
      />
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {tickets.map((ticket) => {
        const activeListing = myListings.find(
          (listing) => listing.ticketId === ticket.ticketId && listing.status === "active"
        );

        return (
          <div key={ticket.ticketId} className="flex flex-col gap-2">
            <TicketCard ticket={ticket} />
            {ticket.status === "verified" && listingFormTicketId !== ticket.ticketId && (
              <Button size="sm" variant="outline" onClick={() => setListingFormTicketId(ticket.ticketId)}>
                List for sale
              </Button>
            )}
            {listingFormTicketId === ticket.ticketId && (
              <ListTicketForm
                ticketId={ticket.ticketId}
                onListed={() => setListingFormTicketId(null)}
              />
            )}
            {activeListing && (
              <Button
                size="sm"
                variant="destructive"
                disabled={cancelMutation.isPending}
                onClick={() => cancelMutation.mutate(activeListing.listingId)}
                className="gap-1.5"
              >
                <Ban className="size-3.5" />
                Cancel listing ({activeListing.askPrice} USDC)
              </Button>
            )}
          </div>
        );
      })}
    </div>
  );
}
