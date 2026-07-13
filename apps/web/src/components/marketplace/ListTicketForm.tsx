"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { Tag } from "lucide-react";
import type { MarketplaceListing } from "@fanpass/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/hooks/useWallet";
import { createListing } from "@/lib/api/listings";

interface ListTicketFormProps {
  ticketId: string;
  suggestedPrice?: number;
  onListed: (listing: MarketplaceListing) => void;
}

/** The seller-side entry point into the marketplace, right after a ticket passes verification. */
export function ListTicketForm({ ticketId, suggestedPrice, onListed }: ListTicketFormProps) {
  const { address } = useWallet();
  const [askPrice, setAskPrice] = useState(suggestedPrice ? String(suggestedPrice) : "");

  const mutation = useMutation({
    mutationFn: () =>
      createListing({ ticketId, sellerAddress: address!, askPrice: Number(askPrice), currency: "USDC" }),
    onSuccess: (listing) => {
      toast.success("Ticket listed on the marketplace.");
      onListed(listing);
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : "Listing failed. Try again.");
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>List this ticket for sale</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {suggestedPrice !== undefined && (
          <p className="text-xs text-muted-foreground">AI suggested fair price: {suggestedPrice} USDC</p>
        )}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ask-price">Ask price (USDC)</Label>
          <Input
            id="ask-price"
            type="number"
            min={1}
            value={askPrice}
            onChange={(e) => setAskPrice(e.target.value)}
          />
        </div>
        <Button
          disabled={!address || !askPrice || mutation.isPending}
          onClick={() => mutation.mutate()}
          className="w-fit gap-1.5 px-6"
        >
          <Tag className="size-4" />
          {mutation.isPending ? "Listing…" : "List for sale"}
        </Button>
      </CardContent>
    </Card>
  );
}
