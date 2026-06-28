import { Check, X, Minus } from "lucide-react";

/**
 * Comparison table: OpenLaunch vs typical launchpads.
 *
 * Frames the anti-snipe / fair-raise differentiation against generic
 * bonding-curve / meme launchpads without naming competitors.
 */

type Row = {
  feature: string;
  openLaunch: boolean | "partial";
  others: boolean | "partial";
};

const ROWS: Row[] = [
  {
    feature: "Set your own launch market cap",
    openLaunch: true,
    others: false,
  },
  {
    feature: "Tapering swap fees to deter flip-and-dump",
    openLaunch: true,
    others: false,
  },
  {
    feature: "Fees configurable to launch time or market cap",
    openLaunch: true,
    others: false,
  },
  {
    feature: "Launch directly into a full liquidity pool",
    openLaunch: true,
    others: "partial",
  },
  {
    feature: "No bonding curve / no graduation wait",
    openLaunch: true,
    others: "partial",
  },
  {
    feature: "100% liquidity locked, mint/freeze revoked",
    openLaunch: true,
    others: "partial",
  },
  {
    feature: "Earn ongoing pool fees — no need to dump",
    openLaunch: true,
    others: false,
  },
  {
    feature: "Scheduled launches to build hype ahead of go-live",
    openLaunch: true,
    others: "partial",
  },
  {
    feature: "Bring your own contract address (vanity CA)",
    openLaunch: true,
    others: false,
  },
  {
    feature: "Fully open source, self-hostable",
    openLaunch: true,
    others: false,
  },
];

function Cell({ value, highlight }: { value: boolean | "partial"; highlight?: boolean }) {
  if (value === true) {
    return (
      <span className={highlight ? "text-primary" : "text-primary"}>
        <Check className="h-5 w-5 mx-auto" />
      </span>
    );
  }
  if (value === "partial") {
    return (
      <span className="text-muted-foreground">
        <Minus className="h-5 w-5 mx-auto" />
      </span>
    );
  }
  return (
    <span className="text-muted-foreground/60">
      <X className="h-5 w-5 mx-auto" />
    </span>
  );
}

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b">
            <th className="py-4 pr-4 text-left font-semibold">Capability</th>
            <th className="py-4 px-4 text-center font-semibold text-primary">OpenLaunch</th>
            <th className="py-4 pl-4 text-center font-semibold text-muted-foreground">
              Typical launchpads
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row, i) => (
            <tr
              key={row.feature}
              className={i % 2 === 0 ? "bg-secondary/20" : ""}
            >
              <td className="py-3 pr-4 text-left">{row.feature}</td>
              <td className="py-3 px-4">
                <Cell value={row.openLaunch} highlight />
              </td>
              <td className="py-3 pl-4">
                <Cell value={row.others} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}