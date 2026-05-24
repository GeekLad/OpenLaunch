import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SolanaProvider } from "@/components/providers/SolanaProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { APP_NAME, APP_URL } from "@/config/public";
import "../app/init";


const inter = Inter({ subsets: ["latin"] });
const title = `${APP_NAME} - Memecoin Launchpad`;
const description = "Open Source memecoin launchpad on Solana, powered by Meteora's gud tek";

const logoUrl = APP_URL
  ? `${APP_URL.replace(/\/$/, '')}/logo.png`
  : undefined;

export const metadata: Metadata = {
  title,
  description,
  icons: {
    icon: "/favicon.ico",
  },
  ...(logoUrl && {
    openGraph: {
      title,
      description,
      images: [logoUrl],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [logoUrl],
    },
  }),
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
              <main className="flex-1 pb-20">{children}</main>
              <Footer />
            </div>
          </SolanaProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
