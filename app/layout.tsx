import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { ENV } from "@/config/environment";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: `${ENV.APP_NAME} - Meme Token Launchpad`,
  description: "Launch your meme token on Solana with DAMMv2 liquidity",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ThemeProvider>
          <SolanaProvider>{children}</SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
