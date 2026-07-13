import type { ReactNode } from "react";
import { CalendarDays, MapPin, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import type { Ticket, TrustScore } from "@fanpass/shared";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

const STATUS_LABEL: Record<Ticket["status"], string> = {
  unverified: "Unverified",
  verified: "Verified",
  listed: "Listed",
  in_escrow: "In Escrow",
  sold: "Sold",
  checked_in: "Checked In",
  used: "Used",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

interface TicketCardProps {
  ticket: Ticket;
  trustScore?: TrustScore | null;
  /** Shown alongside the Trust Score row — the marketplace grid's ask price. */
  askPrice?: number;
  /** Marketplace-specific extras (seller reputation, AI Suggested Deal ribbon, transfer count…). */
  footer?: ReactNode;
}

/** Reusable ticket summary — used on /verify and again in the marketplace grid/detail. */
export function TicketCard({ ticket, trustScore, askPrice, footer }: TicketCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <TicketIcon className="size-4 text-muted-foreground" />
            {ticket.eventName}
          </span>
          <Badge variant={ticket.status === "verified" ? "default" : "secondary"}>
            {STATUS_LABEL[ticket.status]}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <MapPin className="size-3.5" />
          {ticket.venue}
        </span>
        <span className="flex items-center gap-2">
          <CalendarDays className="size-3.5" />
          {formatDate(ticket.eventDate)}
          {ticket.seatInfo ? ` · ${ticket.seatInfo}` : ""}
        </span>
        {trustScore && (
          <span className="flex items-center gap-2 text-foreground">
            <ShieldCheck className="size-3.5 text-success" />
            Trust Score {trustScore.score}/100
            {askPrice !== undefined && <span className="ml-auto font-semibold text-foreground">{askPrice} USDC</span>}
          </span>
        )}
      </CardContent>
      {footer && <CardFooter>{footer}</CardFooter>}
    </Card>
  );
}
