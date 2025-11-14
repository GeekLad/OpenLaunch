import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ENV } from "@/config/environment";

export default function Home() {
  const appName = ENV.APP_NAME;
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold">{appName}</h1>
          </div>
          <nav className="flex items-center gap-4">
            <ThemeToggle />
            <Link href="/launch">
              <Button>Launch Token</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-24">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-5xl font-bold tracking-tight sm:text-6xl">
              Open Source Meme Token Launchpad
            </h2>
            <p className="mt-6 text-lg leading-8 text-muted-foreground">
              Launch cheap, earn forever - Powered by Meteora's gud tek
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/launch">
                <Button size="lg">Get Started</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="border-t bg-secondary/30 py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h3 className="text-center text-3xl font-bold">Features</h3>

              {/* Highlighted Features */}
              <div className="mt-12 grid gap-8 md:grid-cols-2">
                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">🚀 Lowest Cost Launchpad</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      Launch your token for less than 0.05 SOL! The most affordable way to get your meme token on Solana.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">⚡ No Graduation Wait</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      Your token is instantly tradable! No bonding curves, no waiting for graduation. Launch directly into a full liquidity pool.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">💰 Earn Fees Forever</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      100% liquidity is locked and you can earn and claim fees forever. Turn your token into a passive income machine!
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">⏰ Scheduled Launches</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      Set the exact time for your launch! Share the CA early, build anticipation, and hype up your community before go-live.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">🎯 Bring Your Own CA</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      Got a vanity contract address? Bring it! Perfect for nerds who want that extra flex on their token launch.
                    </CardDescription>
                  </CardContent>
                </Card>

                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">🔓 100% Open Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      Complete code transparency - fork it, audit it, verify it yourself. No black boxes, no hidden fees, just pure open-source trust.
                    </CardDescription>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-4xl">
              <h3 className="text-center text-3xl font-bold">How It Works</h3>
              <div className="mt-12 space-y-8">
                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    1
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Fill Out Token Details</h4>
                    <p className="mt-2 text-muted-foreground">
                      Provide your token name, symbol, logo, and optional social links.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    2
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Configure Launch Parameters</h4>
                    <p className="mt-2 text-muted-foreground">
                      Set launch time and fee schedule.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    3
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Sign Transactions</h4>
                    <p className="mt-2 text-muted-foreground">
                      Approve the transactions to deploy your token.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    4
                  </div>
                  <div>
                    <h4 className="text-xl font-semibold">Launch Complete</h4>
                    <p className="mt-2 text-muted-foreground">
                      Your token is deployed with metadata, 100% locked liquidity, and revoked mint and freeze authorities.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full flex items-center justify-center py-3 fixed bottom-0 bg-background border-t">
        <Link
          className="flex items-center gap-1 text-current"
          href="https://tiplink.io/blinks/donate?dest=D2yGetspd22V3UFHTudRN1s7bU6DF7JNaLBCn2NQ2KHd"
        >
          <span className="text-muted-foreground">Made with ❤️ by GeekLad&nbsp;</span>
          <p className="text-primary underline hover:text-primary/80 transition-colors">Buy him a coffee or a lambo</p>
        </Link>
      </footer>
    </div>
  );
}
