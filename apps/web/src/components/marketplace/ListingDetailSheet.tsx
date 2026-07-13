"use client";

import { useRouter } from "next/navigation";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ListingDetail } from "@/components/marketplace/ListingDetail";

interface ListingDetailSheetProps {
  listingId: string;
}

/** The intercepted-route modal — shareable URL, but feels like it never left the marketplace grid. */
export function ListingDetailSheet({ listingId }: ListingDetailSheetProps) {
  const router = useRouter();

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) router.back();
      }}
    >
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Listing details</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <ListingDetail listingId={listingId} />
        </div>
      </SheetContent>
    </Sheet>
  );
}
