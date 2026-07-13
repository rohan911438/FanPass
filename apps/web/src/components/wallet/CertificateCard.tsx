import { Award } from "lucide-react";
import type { OwnershipCertificate } from "@fanpass/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CertificateCardProps {
  certificate: OwnershipCertificate;
}

/** Mocked until Phase 4 mints the real Ownership Certificate NFT — same shape, real data underneath. */
export function CertificateCard({ certificate }: CertificateCardProps) {
  const transferCount = Math.max(0, certificate.history.length - 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 text-sm">
          <span className="flex items-center gap-2">
            <Award className="size-4 text-primary" />
            Ownership Certificate
          </span>
          <Badge variant={certificate.tokenId ? "default" : "secondary"}>
            {certificate.tokenId ? "On-chain" : "Mocked"}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1.5 text-sm text-muted-foreground">
        <span>Ticket {certificate.ticketId.slice(0, 8)}…</span>
        <span>
          {transferCount} transfer{transferCount === 1 ? "" : "s"} on record
        </span>
        <span className="text-xs">Minted {new Date(certificate.mintedAt).toLocaleDateString()}</span>
      </CardContent>
    </Card>
  );
}
