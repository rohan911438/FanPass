import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import type { Transaction } from "@fanpass/shared";
import { Badge } from "@/components/ui/badge";

function shorten(address: string) {
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

const STATUS_VARIANT: Record<Transaction["status"], "default" | "secondary" | "destructive"> = {
  pending: "secondary",
  completed: "default",
  failed: "destructive",
};

interface TransactionRowProps {
  transaction: Transaction;
  walletAddress: string;
}

export function TransactionRow({ transaction, walletAddress }: TransactionRowProps) {
  const isOutgoing = transaction.fromAddress.toLowerCase() === walletAddress.toLowerCase();

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3 text-sm">
      <div className="flex items-center gap-3">
        <span
          className={`flex size-8 items-center justify-center rounded-full ${
            isOutgoing ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
          }`}
        >
          {isOutgoing ? <ArrowUpRight className="size-4" /> : <ArrowDownLeft className="size-4" />}
        </span>
        <div className="flex flex-col">
          <span className="font-medium capitalize">
            {transaction.type} {isOutgoing ? "(sold)" : "(bought)"}
          </span>
          <span className="text-xs text-muted-foreground">
            {isOutgoing ? `to ${shorten(transaction.toAddress)}` : `from ${shorten(transaction.fromAddress)}`} ·{" "}
            {new Date(transaction.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="font-medium">
          {transaction.amount} {transaction.currency}
        </span>
        <Badge variant={STATUS_VARIANT[transaction.status]}>{transaction.status}</Badge>
      </div>
    </div>
  );
}
