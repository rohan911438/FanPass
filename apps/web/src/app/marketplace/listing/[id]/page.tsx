import { PageHeader } from "@/components/shared/PageHeader";
import { ListingDetail } from "@/components/marketplace/ListingDetail";

export default async function ListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="flex-1 pb-24">
      <PageHeader title="Listing" description="Review the Trust Report before you buy." />
      <div className="mx-auto max-w-2xl px-6">
        <ListingDetail listingId={id} />
      </div>
    </div>
  );
}
