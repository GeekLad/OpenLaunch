import Link from "next/link";
import Image from "next/image";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WalletButton } from "@/components/wallet/WalletButton";
import { ENV } from "@/config/environment";

export function Header() {
  return (
    <header className="border-b sticky top-0 z-50 bg-background">
      <div className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/logo.svg"
            alt={ENV.APP_NAME}
            width={200}
            height={70}
            className="h-16 w-auto"
          />
        </Link>

        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="/tokens"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Browse Tokens
          </Link>
          <Link
            href="/launch"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Launch Token
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
