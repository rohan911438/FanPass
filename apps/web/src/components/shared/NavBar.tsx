import Image from "next/image";
import Link from "next/link";
import { WalletConnectButton } from "@/components/shared/WalletConnectButton";

const links = [
  { href: "/verify", label: "Verify Ticket" },
  { href: "/marketplace", label: "Marketplace" },
  { href: "/wallet", label: "Wallet" },
];

export function NavBar() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.04] bg-background/60 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2.5 text-lg font-black tracking-tight group">
          <Image 
            src="/logo.png" 
            alt="FanPass logo" 
            width={28} 
            height={28} 
            className="rounded-lg shadow-md border border-white/[0.08] transition-transform duration-300 group-hover:scale-105" 
          />
          <span className="bg-gradient-to-r from-white to-neutral-400 bg-clip-text text-transparent group-hover:to-white transition-colors duration-300">
            FanPass
          </span>
        </Link>

        <nav className="hidden items-center gap-8 text-xs font-semibold uppercase tracking-wider text-neutral-400 sm:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="relative transition-colors hover:text-white duration-300 py-1 group/item"
            >
              {link.label}
              <span className="absolute bottom-0 left-0 w-0 h-[1.5px] bg-white group-hover/item:w-full transition-all duration-300 ease-out" />
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <WalletConnectButton />
        </div>
      </div>
    </header>
  );
}
