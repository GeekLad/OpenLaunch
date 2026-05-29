"use client";

import { useTheme } from "@/components/providers/ThemeProvider";
import { useEffect, useState } from "react";
import Image from "next/image";
import { ExternalLink, Globe, LineChart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ExternalLinksProps {
  mintAddress: string;
  poolAddress: string;
  metadataUri?: string | null;
}

interface SocialLinks {
  website?: string;
  twitter?: string;
  telegram?: string;
  discord?: string;
}

export function ExternalLinks({ mintAddress, poolAddress, metadataUri }: ExternalLinksProps) {
  const { theme } = useTheme();
  const [socials, setSocials] = useState<SocialLinks>({});

  useEffect(() => {
    async function fetchSocials() {
      if (!metadataUri) return;
      try {
        const response = await fetch(metadataUri);
        if (!response.ok) return;
        const metadata = await response.json();
        const socialLinks: SocialLinks = {};
        if (metadata.external_url) {
          socialLinks.website = metadata.external_url;
        }
        if (metadata.attributes && Array.isArray(metadata.attributes)) {
          metadata.attributes.forEach((attr: { trait_type: string; value: string }) => {
            if (attr.trait_type === "Twitter") socialLinks.twitter = attr.value;
            else if (attr.trait_type === "Telegram") socialLinks.telegram = attr.value;
            else if (attr.trait_type === "Discord") socialLinks.discord = attr.value;
          });
        }
        setSocials(socialLinks);
      } catch (error) {
        console.error("Failed to fetch metadata:", error);
      }
    }
    fetchSocials();
  }, [metadataUri]);

  const links = [
    {
      name: "Jupiter",
      url: `https://jup.ag/swap/SOL-${mintAddress}`,
      icon: <Image src="/img/jupiter.png" alt="Jupiter" width={20} height={20} className="rounded" />,
      description: "Trade on Jupiter",
    },
    {
      name: "GMGN",
      url: `https://gmgn.ai/sol/token/${mintAddress}`,
      icon: <Image src="/img/gmgn.svg" alt="GMGN" width={20} height={20} />,
      description: "View on GMGN",
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
      description: "Charts & analytics",
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
      description: "Real-time trading data",
    },
    {
      name: "GeckoTerminal",
      url: `https://www.geckoterminal.com/solana/pools/${poolAddress}`,
      icon: <Image src="/img/gecko-terminal.svg" alt="GeckoTerminal" width={20} height={20} />,
      description: "Pool analytics",
    },
  ];

  const hasSocials = Object.values(socials).some(Boolean);

  const socialLinks = [
    socials.website && { name: "Website", url: socials.website, icon: <Globe className="h-5 w-5" /> },
    socials.twitter && {
      name: "X (Twitter)",
      url: socials.twitter,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      ),
    },
    socials.telegram && {
      name: "Telegram",
      url: socials.telegram,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z" />
        </svg>
      ),
    },
    socials.discord && {
      name: "Discord",
      url: socials.discord,
      icon: (
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.317 4.37a19.791 19.791 0 00-4.885-1.515.074.074 0 00-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 00-5.487 0 12.64 12.64 0 00-.617-1.25.077.077 0 00-.079-.037A19.736 19.736 0 003.677 4.37a.07.07 0 00-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 00.031.057 19.9 19.9 0 005.993 3.03.078.078 0 00.084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 00-.041-.106 13.107 13.107 0 01-1.872-.892.077.077 0 01-.008-.128 10.2 10.2 0 00.372-.292.074.074 0 01.077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 01.078.01c.12.098.246.198.373.292a.077.077 0 01-.006.127 12.299 12.299 0 01-1.873.892.077.077 0 00-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 00.084.028 19.839 19.839 0 006.002-3.03.077.077 0 00.032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 00-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
        </svg>
      ),
    },
  ].filter(Boolean) as Array<{ name: string; url: string; icon: React.ReactElement }>;

  return (
    <>
      {hasSocials && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Community & Social
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {socialLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group"
                >
                  <div className="flex-shrink-0">{link.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm group-hover:text-primary transition-colors">{link.name}</p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
                </a>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <LineChart className="h-5 w-5" />
            Trading & Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {links.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary transition-colors group"
              >
                <div className="flex-shrink-0">{link.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm group-hover:text-primary transition-colors">{link.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{link.description}</p>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
