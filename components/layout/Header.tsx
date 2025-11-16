"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { WalletButton } from "@/components/wallet/WalletButton";
import { Button } from "@/components/ui/button";
import { ENV } from "@/config/environment";

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
          
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </Button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container mx-auto px-4 py-4 flex flex-col gap-4">
            <Link
              href="/tokens"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Browse Tokens
            </Link>
            <Link
              href="/launch"
              className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
              onClick={() => setIsMenuOpen(false)}
            >
              Launch Token
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
