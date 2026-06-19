import { cn } from "@/lib/utils";

export type Severity = "critical" | "high" | "medium" | "low" | "normal";

const styles: Record<Severity, string> = {
  critical: "bg-danger/20 text-danger",
  high: "bg-warning/20 text-warning",
  medium: "bg-yellow-500/20 text-yellow-300",
  low: "bg-accent/20 text-accent",
  normal: "bg-slate-700/60 text-slate-300",
};

const labels: Record<Severity, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  normal: "Normal",
};

export function AlertBadge({ severity }: { severity: Severity }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
        styles[severity],
      )}
    >
      {severity === "critical" && (
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-danger opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-danger" />
        </span>
      )}
      {labels[severity]}
    </span>
  );
}