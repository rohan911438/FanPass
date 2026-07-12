import Link from "next/link";
import { WalletConnectButton } from "@/components/shared/WalletConnectButton";

const links = [
  { href: "/verify", label: "Verify Ticket" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/wallet", label: "Wallet" },
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-lg">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          FanPass
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-muted-foreground sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <WalletConnectButton />
      </div>
    </header>
  );
}
