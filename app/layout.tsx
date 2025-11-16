import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { ENV } from "@/config/environment";
import "@/lib/init"; // Initialize cron jobs and other services

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
          <SolanaProvider>
            <div className="min-h-screen flex flex-col">
              <Header />
              <main className="flex-1 pb-16">{children}</main>
              <Footer />
            </div>
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
