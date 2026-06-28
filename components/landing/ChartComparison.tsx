import { cn } from "@/lib/utils";

/**
 * Side-by-side conceptual chart comparison: a protected launch (floor price
 * + tapering fees) vs a sniped/wrecked launch (micro-cap start, no fee wall).
 *
 * Pure SVG — no charting library, theme-aware via currentColor.
 */

export function ChartComparison() {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <ChartCard
        title="Protected launch"
        subtitle="Floor market cap + tapering fees"
        tone="good"
      />
      <ChartCard
        title="Unprotected launch"
        subtitle="Micro-cap start, no fee wall"
        tone="bad"
      />
    </div>
  );
}

function ChartCard({
  title,
  subtitle,
  tone,
}: {
  title: string;
  subtitle: string;
  tone: "good" | "bad";
}) {
  const good = tone === "good";
  const stroke = good ? "text-primary" : "text-destructive";
  const fill = good ? "fill-primary/15" : "fill-destructive/15";
  const lineColor = good ? "#16a34a" : "#dc2626";

  // Protected: starts at a floor, controlled climb, healthy retracements.
  // Wrecked: near-zero start, vertical snipe pump, vertical dump.
  const path = good
    ? "M0,150 C20,140 40,130 60,118 C80,108 100,100 120,92 C140,84 160,80 180,74 C200,70 220,72 240,66 C260,60 280,54 300,50 C320,46 340,48 360,42 C380,38 400,34 420,30 C440,28 460,32 480,28 C500,26 520,24 540,22 C560,21 580,20 600,19"
    : "M0,178 C10,178 20,176 30,170 C40,160 50,140 60,110 C70,70 80,40 90,30 C100,25 110,28 120,40 C130,55 140,80 150,110 C160,135 170,150 180,158 C190,162 200,164 210,165 C220,166 230,168 240,172 C250,174 260,176 270,177 C280,178 290,179 300,180 C310,181 320,182 330,182 C340,183 350,183 360,183 C370,184 380,184 390,184 C400,185 410,185 420,185 C430,186 440,186 450,186 C460,187 470,187 480,187 C490,187 500,187 510,187 C520,187 530,187 540,188 C550,188 560,188 570,188 C580,189 590,189 600,189";

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        good ? "border-primary/40 bg-primary/5" : "border-destructive/40 bg-destructive/5"
      )}
    >
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="font-semibold">{title}</h4>
        <span className="text-xs text-muted-foreground">{subtitle}</span>
      </div>
      <svg
        viewBox="0 0 600 200"
        className={cn("w-full h-40", stroke)}
        role="img"
        aria-label={`${title}: conceptual price chart`}
      >
        {/* baseline */}
        <line
          x1="0"
          y1="190"
          x2="600"
          y2="190"
          className="text-muted-foreground/30"
          stroke="currentColor"
          strokeWidth="1"
        />
        {/* area */}
        <path
          d={`${path} L600,190 L0,190 Z`}
          className={fill}
          stroke="none"
        />
        {/* line */}
        <path
          d={path}
          fill="none"
          stroke={lineColor}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <p className={cn("mt-3 text-xs", good ? "text-primary" : "text-destructive")}>
        {good
          ? "Controlled start, organic demand, sustainable price discovery."
          : "Snipers scoop supply cheap, pump, and dump — chart never recovers."}
      </p>
    </div>
  );
}