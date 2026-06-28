import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { APP_NAME } from "@/config/public";
import { ComparisonTable } from "@/components/landing/ComparisonTable";
import { ChartComparison } from "@/components/landing/ChartComparison";

export default function Home() {
  const appName = APP_NAME;
  return (
    <>
      {/* Hero */}
      <section className="container mx-auto px-4 py-8 sm:py-16 md:py-24">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mb-6 sm:mb-8 md:mb-12 flex justify-center">
            <Image
              src="/logo.svg"
              alt={appName}
              width={800}
              height={300}
              className="h-40 sm:h-48 md:h-56 w-auto"
              priority
            />
          </div>
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight md:text-6xl">
            Tune your launch.
            <br />
            <span className="text-primary">Protect your chart.</span>
          </h2>
          <p className="mt-4 sm:mt-6 text-base sm:text-lg leading-7 sm:leading-8 text-muted-foreground">
            The open-source Solana launchpad that lets you set a floor market cap
            and taper swap fees — so snipers can&apos;t wreck your chart before
            real buyers show up. Raise capital without pulling liquidity or
            dumping on your community.
          </p>
          <div className="mt-6 sm:mt-8 md:mt-10 flex items-center justify-center gap-x-6">
            <Link href="/launch">
              <Button size="lg">Launch a token</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Comparison table */}
      <section className="border-t bg-secondary/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h3 className="text-center text-3xl font-bold">
              Why this isn&apos;t another launchpad
            </h3>
            <p className="mt-3 text-center text-muted-foreground">
              Most launchpads optimize for volume, not longevity. OpenLaunch
              gives you the controls to launch on your terms.
            </p>
            <div className="mt-10">
              <ComparisonTable />
            </div>
          </div>
        </div>
      </section>

      {/* Anti-snipe: floor market cap */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <p className="text-sm font-semibold text-primary">Anti-snipe, part 1</p>
                <h3 className="mt-1 text-3xl font-bold">Set your floor market cap</h3>
                <p className="mt-4 text-muted-foreground">
                  Tokens don&apos;t have to start at a near-zero micro-cap where
                  snipers scoop up half the supply for pennies. You set the
                  initial market cap, so your token launches at a real valuation
                  with real skin in the game — leaving room for organic buying
                  instead of a front-loaded grab.
                </p>
                <p className="mt-3 text-muted-foreground">
                  Some early hype is good. A fire sale is not. The floor lets you
                  strike the balance that fits your community.
                </p>
              </div>
              <div className="rounded-lg border bg-secondary/30 p-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium">Without a floor</p>
                    <p className="text-sm text-muted-foreground">
                      Launches at ~$0. Snipers buy 30-50% of supply in seconds.
                      Chart pumps, then dumps. Recovery is unlikely.
                    </p>
                  </div>
                  <div className="h-px bg-border" />
                  <div>
                    <p className="text-sm font-medium text-primary">With a floor market cap</p>
                    <p className="text-sm text-muted-foreground">
                      Launches at your chosen valuation. Early buyers get a fair
                      entry, not a steal. Price discovery happens organically.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Anti-snipe: fee scheduler */}
      <section className="border-t bg-secondary/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div className="md:order-2">
                <p className="text-sm font-semibold text-primary">Anti-snipe, part 2</p>
                <h3 className="mt-1 text-3xl font-bold">Taper swap fees on your schedule</h3>
                <p className="mt-4 text-muted-foreground">
                  Swap fees start elevated and step down over time. Mercenary
                  capital that flips-and-dumps pays a premium; long-term holders
                  who wait pay less. You choose whether the schedule is tied to
                  launch time or to market-cap milestones.
                </p>
                <p className="mt-3 text-muted-foreground">
                  It&apos;s not about killing early demand — it&apos;s about
                  making flippers bleed while real buyers accumulate. Powered by
                  the Meteora DAMMv2 concentrated liquidity AMM.
                </p>
              </div>
              <div className="md:order-1 rounded-lg border bg-secondary/30 p-6">
                <div className="space-y-3">
                  <FeeStep label="Launch" fee="High" detail="Flippers pay the wall" />
                  <FeeStep label="Minutes later" fee="Lower" detail="Impatient exits cost more" />
                  <FeeStep label="Hours later" fee="Lower" detail="Early holders rewarded" />
                  <FeeStep label="Steady state" fee="Low" detail="Normal trading resumes" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Protected vs wrecked visual */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h3 className="text-center text-3xl font-bold">
              The chart you get vs the chart you don&apos;t
            </h3>
            <p className="mt-3 text-center text-muted-foreground">
              A floor market cap and tapering fees change the shape of your
              launch — and what happens after.
            </p>
            <div className="mt-10">
              <ChartComparison />
            </div>
          </div>
        </div>
      </section>

      {/* Raise capital without dumping */}
      <section className="border-t bg-secondary/30 py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h3 className="text-3xl font-bold">
              Raise capital without pulling liquidity
            </h3>
            <p className="mt-4 text-muted-foreground">
              100% of liquidity is locked. Mint and freeze authorities are
              revoked. There&apos;s no rug to pull and no mint to abuse. Instead,
              you earn ongoing fees from your token&apos;s pool — so you
              monetize by holding, not by dumping on your community.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              <RaiseCard
                title="100% locked liquidity"
                detail="No pull, no rug. The pool stays open for the life of the token."
              />
              <RaiseCard
                title="Revoked authorities"
                detail="Mint and freeze powers are burned at launch. Verifiable on-chain."
              />
              <RaiseCard
                title="Earn fees forever"
                detail="Collect pool fees as your token trades. No need to sell to monetize."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Launch on your terms: scheduled + custom CA */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h3 className="text-center text-3xl font-bold">
              Build anticipation before go-live
            </h3>
            <p className="mt-3 text-center text-muted-foreground">
              A great launch starts before the chart does. OpenLaunch gives you
              the runway to market your token and the branding to make it
              recognizable.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              <div className="rounded-lg border bg-card p-6">
                <p className="text-sm font-semibold text-primary">Scheduled launches</p>
                <h4 className="mt-1 text-xl font-semibold">Pick the moment</h4>
                <p className="mt-3 text-sm text-muted-foreground">
                  Set an exact go-live time and share the contract address early.
                  Build your community, line up buyers, and let anticipation
                  accumulate so the chart opens with real demand — not a cold
                  start that snipers fill first.
                </p>
              </div>
              <div className="rounded-lg border bg-card p-6">
                <p className="text-sm font-semibold text-primary">Bring your own CA</p>
                <h4 className="mt-1 text-xl font-semibold">Vanity contract address</h4>
                <p className="mt-3 text-sm text-muted-foreground">
                  Pre-generate a custom contract address for your token. A
                  recognizable CA reinforces your brand, makes the token easier
                  to verify, and pairs perfectly with a scheduled launch to
                  spread the word before trading opens.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <h3 className="text-center text-3xl font-bold">How it works</h3>
            <div className="mt-12 space-y-8">
              <Step
                n={1}
                title="Fill out token details"
                body="Name, symbol, logo, and optional social links. Pre-generate a vanity contract address if you want to share the CA early."
              />
              <Step
                n={2}
                title="Set your launch parameters"
                body="Pick a launch time, set your floor market cap, and configure the fee scheduler — by time or by market cap."
              />
              <Step
                n={3}
                title="Sign the transactions"
                body="Approve the on-chain transactions to create the mint, upload metadata to IPFS, and deploy the Meteora DAMMv2 pool."
              />
              <Step
                n={4}
                title="Launch complete"
                body="Your token is live with metadata, 100% locked liquidity, revoked authorities, and tapering fees protecting the chart."
              />
            </div>
          </div>
        </div>
      </section>

      {/* Open source trust footer */}
      <section className="border-t bg-secondary/30 py-12 sm:py-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl">
            <div className="grid gap-8 md:grid-cols-2 md:items-center">
              <div>
                <h3 className="text-2xl font-bold">100% open source</h3>
                <p className="mt-3 text-muted-foreground">
                  Every line is public. Fork it, audit it, self-host it, or
                  contribute. No black boxes, no hidden fees, no proprietary
                  lock-in. The official hosted site is one of many possible
                  deployments — the code is yours.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="https://github.com/GeekLad/OpenLaunch"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-primary underline-offset-4 hover:underline"
                  >
                    View source on GitHub →
                  </a>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <TrustItem label="License" value="Open source" />
                <TrustItem label="Audit" value="Public codebase" />
                <TrustItem label="Self-host" value="One command" />
                <TrustItem label="AMM" value="Meteora DAMMv2" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-12 sm:py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
            <h3 className="text-3xl font-bold">Launch on your terms</h3>
            <p className="mt-3 text-muted-foreground">
              Set the floor. Schedule the fees. Protect the chart. For less than
              0.05 SOL.
            </p>
            <div className="mt-6 sm:mt-8 flex items-center justify-center">
              <Link href="/launch">
                <Button size="lg">Launch a token</Button>
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function FeeStep({
  label,
  fee,
  detail,
}: {
  label: string;
  fee: string;
  detail: string;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      <span className="shrink-0 rounded-md bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
        {fee}
      </span>
    </div>
  );
}

function RaiseCard({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-lg border bg-card p-5 text-left">
      <p className="font-semibold">{title}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: number; title: string; body: string }) {
  return (
    <div className="flex gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        {n}
      </div>
      <div>
        <h4 className="text-xl font-semibold">{title}</h4>
        <p className="mt-2 text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function TrustItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border bg-background p-3">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}