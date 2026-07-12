import { Wallet as WalletIcon } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

export default function WalletPage() {
  return (
    <div className="flex-1 pb-24">
      <PageHeader
        title="Wallet"
        description="Owned tickets, ownership certificates, attendance badges, memory cards, and activity."
      />
      <div className="mx-auto max-w-5xl px-6">
        <EmptyState
          icon={WalletIcon}
          title="Wallet contents arrive in Phase 3"
          description="Connect your wallet above — asset tabs are wired up once the marketplace flow exists."
        />
      </div>
    </div>
  );
}
