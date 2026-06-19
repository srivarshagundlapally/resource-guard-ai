import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Droplets,
  Wifi,
  Zap,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import { AlertBadge, type Severity } from "@/components/ui/AlertBadge";
import { useDashboardData, RESOURCE_COLORS, BUILDINGS } from "@/hooks/useDashboardData";
import { useAnomalies } from "@/hooks/useAnomalies";
import { useRecommendations } from "@/hooks/useRecommendations";
import { TrendChart } from "@/components/dashboard/TrendChart";
import { ResourcePie } from "@/components/dashboard/ResourcePie";
import { BuildingComparison } from "@/components/dashboard/BuildingComparison";
import { Heatmap } from "@/components/dashboard/Heatmap";
import { cn } from "@/lib/utils";

const RESOURCE_EMOJI: Record<string, string> = {
  water: "💧",
  electricity: "⚡",
  internet: "🌐",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-border/50", className)} />;
}

function ErrorCard({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-xl border border-danger/40 bg-danger/5 p-5">
      <p className="text-sm font-medium text-danger">Failed to load: {message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-md border border-danger/40 px-3 py-1.5 text-xs font-semibold text-danger hover:bg-danger/10"
      >
        Retry
      </button>
    </div>
  );
}

export function Dashboard() {
  const dash = useDashboardData();
  const anomaliesQ = useAnomalies({ limit: 5 });
  const recsQ = useRecommendations();

  if (dash.isError) {
    return (
      <ErrorCard
        message={(dash.error as Error)?.message ?? "Unknown error"}
        onRetry={() => dash.refetch()}
      />
    );
  }

  const data = dash.data;
  const loading = dash.isLoading || !data;

  const lastUpdated = data?.lastUpdated
    ? new Date(data.lastUpdated).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div className="space-y-6">
      {/* Top-right meta row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-lg font-bold text-slate-100">Live Overview</h2>
          <p className="text-xs text-slate-500">All 4 buildings · auto-refresh every 30s</p>
        </div>
        <div className="inline-flex items-center gap-1.5 rounded-md border border-surface-border bg-surface/40 px-2.5 py-1 text-[11px] text-slate-400">
          <Clock className="h-3 w-3" />
          Last updated {lastUpdated}
        </div>
      </div>

      {/* SECTION 1 — Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[120px]" />)
        ) : (
          <>
            <StatCard
              title="Water Usage Today"
              value={data.todayTotals.water.toLocaleString()}
              unit="L"
              change={data.changePct.water}
              icon={Droplets}
              iconColor={RESOURCE_COLORS.water}
            />
            <StatCard
              title="Electricity Today"
              value={data.todayTotals.electricity.toLocaleString()}
              unit="kWh"
              change={data.changePct.electricity}
              icon={Zap}
              iconColor={RESOURCE_COLORS.electricity}
            />
            <StatCard
              title="Internet Today"
              value={data.todayTotals.internet.toLocaleString()}
              unit="GB"
              change={data.changePct.internet}
              icon={Wifi}
              iconColor={RESOURCE_COLORS.internet}
            />
            <StatCard
              title="Active Anomalies"
              value={
                anomaliesQ.data ? anomaliesQ.data.filter((a) => !a.is_resolved).length : "—"
              }
              icon={AlertTriangle}
              iconColor="#E74C3C"
              accent
            />
          </>
        )}
      </div>

      {/* SECTION 2 — Trend (2/3) + Pie (1/3) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-surface-border bg-card p-5 lg:col-span-2">
          <SectionTitle>24-Hour Resource Trend</SectionTitle>
          {loading ? (
            <Skeleton className="h-[320px]" />
          ) : (
            <TrendChart data={data.hourly24} />
          )}
        </div>
        <div className="rounded-xl border border-surface-border bg-card p-5">
          <SectionTitle>Resource Share</SectionTitle>
          {loading ? <Skeleton className="h-[320px]" /> : <ResourcePie totals={data.todayTotals} />}
        </div>
      </div>

      {/* SECTION 3 — Building Comparison */}
      <div className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle>Building Comparison — Daily Totals</SectionTitle>
        {loading ? <Skeleton className="h-[280px]" /> : <BuildingComparison data={data.perBuilding} />}
      </div>

      {/* SECTION 4 — Anomalies & Recommendations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-surface-border bg-card p-5">
          <SectionTitle icon={AlertTriangle}>Recent Anomalies</SectionTitle>
          {anomaliesQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !anomaliesQ.data?.length ? (
            <EmptyState
              icon={AlertTriangle}
              title="No anomalies"
              description="Everything looks normal across all buildings."
            />
          ) : (
            <ul className="space-y-2">
              {anomaliesQ.data.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link
                    to="/anomalies"
                    className="group flex items-start gap-3 rounded-lg border border-surface-border bg-surface/40 p-3 transition-colors hover:border-danger/30"
                  >
                    <AlertBadge severity={a.severity as Severity} />
                    <span className="text-base leading-none">{RESOURCE_EMOJI[a.resource_type]}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">
                        {a.building_id} · Floor {a.floor_no} · Room {a.room_no}
                      </p>
                      <p className="truncate text-xs text-slate-500">{a.description}</p>
                    </div>
                    <span className="shrink-0 text-[10px] text-slate-500">{timeAgo(a.created_at)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-xl border border-surface-border bg-card p-5">
          <SectionTitle icon={CheckCircle}>Priority Recommendations</SectionTitle>
          {recsQ.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-14" />
              ))}
            </div>
          ) : !recsQ.data?.length ? (
            <EmptyState
              icon={CheckCircle}
              title="No recommendations"
              description="LeakSense will surface optimization actions here."
            />
          ) : (
            <ul className="space-y-2">
              {recsQ.data.slice(0, 4).map((r, idx) => (
                <li key={r.id}>
                  <Link
                    to="/reports"
                    className="group flex items-start gap-3 rounded-lg border border-surface-border bg-surface/40 p-3 transition-colors hover:border-accent/30"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary-light">
                      {idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200">{r.action}</p>
                      <p className="truncate text-[11px] text-accent">
                        Save ~{r.estimated_saving ?? 0} {r.saving_unit ?? ""}
                      </p>
                    </div>
                    <AlertBadge severity={(r.severity as Severity) ?? "low"} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* SECTION 5 — Heatmap */}
      <div className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle>Consumption Heatmap (Last 7 Days)</SectionTitle>
        {loading ? <Skeleton className="h-[220px]" /> : <Heatmap cells={data.heatmap} max={data.heatmapMax} buildings={[...BUILDINGS]} />}
      </div>
    </div>
  );
}