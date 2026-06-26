"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ExternalLinksProps {
  mintAddress: string;
  poolAddress: string;
}

export function ExternalLinks({ mintAddress, poolAddress }: ExternalLinksProps) {
  const { theme } = useTheme();

  const links = [
    {
      name: "Jupiter",
      url: `https://jup.ag/swap/SOL-${mintAddress}`,
      icon: <Image src="/img/jupiter.png" alt="Jupiter" width={20} height={20} className="rounded" />,
      subtitle: "Trade",
    },
    {
      name: "GMGN",
      url: `https://gmgn.ai/sol/token/${mintAddress}`,
      icon: <Image src="/img/gmgn.svg" alt="GMGN" width={20} height={20} />,
      subtitle: "View",
    },
    {
      name: "Birdeye",
      url: `https://birdeye.so/token/${mintAddress}?chain=solana`,
      icon: (
        <Image
          src={theme === "dark" ? "/img/birdeye-light-logo.png" : "/img/birdeye-dark-logo.png"}
          alt="Birdeye"
          width={20}
          height={20}
        />
      ),
      subtitle: "Charts & analytics",
    },
    {
      name: "DEX Screener",
      url: `https://dexscreener.com/solana/${poolAddress}`,
      icon: (
        <Image
          src={theme === "dark" ? "/img/dex-screener-light.svg" : "/img/dex-screener-dark.svg"}
          alt="DEX Screener"
          width={20}
          height={20}
        />
      ),
      subtitle: "Real-time data",
    },
    {
      name: "GeckoTerminal",
      url: `https://www.geckoterminal.com/solana/pools/${poolAddress}`,
      icon: <Image src="/img/gecko-terminal.svg" alt="GeckoTerminal" width={20} height={20} />,
      subtitle: "Pool analytics",
    },
  ];

  return (
    <Card>
      <CardContent className="pt-6">
        <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
          </svg>
          Trading & analytics
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {links.map((link) => (
            <a
              key={link.name}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group"
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center">
                {link.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm group-hover:text-primary transition-colors">{link.name}</p>
                <p className="text-xs text-muted-foreground">{link.subtitle}</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
