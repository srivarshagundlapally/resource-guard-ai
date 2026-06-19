import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  icon: LucideIcon;
  iconColor?: string;
  accent?: boolean;
}

export function StatCard({
  title,
  value,
  unit,
  change,
  icon: Icon,
  iconColor = "#1B6CA8",
  accent,
}: StatCardProps) {
  const isUp = (change ?? 0) > 0;
  return (
    <div
      className={cn(
        "relative rounded-xl border bg-card p-5 transition-colors duration-150",
        accent ? "border-accent/40" : "border-surface-border",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
          {title}
        </p>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${iconColor}22`, color: iconColor }}
        >
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5">
        <span className="font-display text-3xl font-bold text-slate-100">
          {value}
        </span>
        {unit && <span className="text-sm text-slate-400">{unit}</span>}
      </div>
      {typeof change === "number" && (
        <div
          className={cn(
            "mt-2 inline-flex items-center gap-1 text-xs font-medium",
            isUp ? "text-danger" : "text-accent",
          )}
        >
          {isUp ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {Math.abs(change)}% vs last period
        </div>
      )}
    </div>
  );
}