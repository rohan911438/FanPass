import { ListingDetailSheet } from "@/components/marketplace/ListingDetailSheet";

export default async function InterceptedListingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ListingDetailSheet listingId={id} />;
}
