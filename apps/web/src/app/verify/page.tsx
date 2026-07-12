import { UploadCloud } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function VerifyPage() {
  return (
    <div className="flex-1 pb-24">
      <PageHeader
        title="Verify a Ticket"
        description="Upload a ticket and watch the AI Trust Score come together, live."
      />
      <div className="mx-auto max-w-5xl px-6">
        <EmptyState
          icon={UploadCloud}
          title="Verification pipeline arrives in Phase 2"
          description="Upload UI, live agent progress, and the Trust Score card are built next."
        />
      </div>
    </div>
  );
}
