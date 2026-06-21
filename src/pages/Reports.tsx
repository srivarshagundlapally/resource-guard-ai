import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BarChart2,
  CheckCircle,
  FileText,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useReports } from "@/hooks/useReports";
import { useRecommendations } from "@/hooks/useRecommendations";
import { useAnomalies } from "@/hooks/useAnomalies";
import type { Anomaly, Recommendation, Report, ResourceType } from "@/types";
import { cn } from "@/lib/utils";

const RESOURCE_EMOJI: Record<string, string> = {
  water: "💧",
  electricity: "⚡",
  internet: "🌐",
};

const RESOURCE_LABEL: Record<string, string> = {
  water: "Water",
  electricity: "Electricity",
  internet: "Internet",
};

const REPORT_TYPES = ["daily", "weekly", "monthly"] as const;
type ReportType = (typeof REPORT_TYPES)[number];

const SEVERITY_COLOR: Record<string, string> = {
  critical: "bg-danger/15 text-danger border-danger/30",
  high: "bg-warning/15 text-warning border-warning/30",
  medium: "bg-accent/15 text-accent border-accent/30",
  low: "bg-surface-border text-text-muted border-surface-border",
};

function fmt(n: number, digits = 2) {
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString(undefined, { maximumFractionDigits: digits });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}

// ───────────────────────────────────────────── Report Generator

async function generateReport(reportType: ReportType, resourceType: ResourceType | null) {
  const now = new Date();
  const days = ({ daily: 1, weekly: 7, monthly: 30 } as const)[reportType];
  const since = new Date(now.getTime() - days * 86400000);

  const content: Record<string, unknown> = {
    period: reportType,
    generated_at: now.toISOString(),
  };

  const resources: ResourceType[] = ["water", "electricity", "internet"];
  for (const resource of resources) {
    if (resourceType && resourceType !== resource) continue;
    const tableName =
      resource === "water"
        ? "water_consumption"
        : resource === "electricity"
          ? "electricity_consumption"
          : "internet_consumption";
    const col =
      resource === "water"
        ? "water_usage_liters"
        : resource === "electricity"
          ? "electricity_usage_kwh"
          : "internet_usage_gb";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from(tableName)
      .select(col)
      .gte("timestamp", since.toISOString());
    if (error) throw error;
    if (data && data.length) {
      const values = data
        .map((r: Record<string, unknown>) => parseFloat(String(r[col])))
        .filter((v: number) => Number.isFinite(v));
      const sum = values.reduce((s: number, v: number) => s + v, 0);
      content[resource] = {
        total: sum.toFixed(2),
        avg: values.length ? (sum / values.length).toFixed(3) : "0",
        max: values.length ? Math.max(...values).toFixed(3) : "0",
        min: values.length ? Math.min(...values).toFixed(3) : "0",
        count: values.length,
      };
    } else {
      content[resource] = { total: "0", avg: "0", max: "0", min: "0", count: 0 };
    }
  }

  const { data: anomData } = await supabase
    .from("anomalies")
    .select("resource_type")
    .gte("created_at", since.toISOString());
  content.anomaly_counts =
    anomData?.reduce<Record<string, number>>((acc, a) => {
      const k = a.resource_type as string;
      acc[k] = (acc[k] || 0) + 1;
      return acc;
    }, {}) || {};

  const { error: insertErr } = await supabase.from("reports").insert({
    report_type: reportType,
    resource_type: resourceType,
    period_start: since.toISOString(),
    period_end: now.toISOString(),
    content: content as never,
  });
  if (insertErr) throw insertErr;
}

function ReportGenerator({ onGenerated }: { onGenerated: () => void }) {
  const [reportType, setReportType] = useState<ReportType>("daily");
  const [resourceType, setResourceType] = useState<ResourceType | "all">("all");
  const [loading, setLoading] = useState(false);

  async function handleGenerate() {
    setLoading(true);
    try {
      await generateReport(reportType, resourceType === "all" ? null : resourceType);
      toast.success("Report generated");
      onGenerated();
    } catch (e) {
      toast.error("Failed to generate report", {
        description: (e as Error).message,
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5">
      <div className="mb-4 flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-semibold text-text-primary">Generate Report</h2>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col text-xs text-text-muted">
          Report Type
          <select
            value={reportType}
            onChange={(e) => setReportType(e.target.value as ReportType)}
            className="mt-1 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-text-primary"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </label>
        <label className="flex flex-col text-xs text-text-muted">
          Resource
          <select
            value={resourceType}
            onChange={(e) => setResourceType(e.target.value as ResourceType | "all")}
            className="mt-1 rounded-md border border-surface-border bg-surface-elevated px-3 py-2 text-sm text-text-primary"
          >
            <option value="all">All Resources</option>
            <option value="water">💧 Water</option>
            <option value="electricity">⚡ Electricity</option>
            <option value="internet">🌐 Internet</option>
          </select>
        </label>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
        >
          {loading ? "Generating…" : "Generate"}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── Report Detail

function MetricCell({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-surface-elevated p-3">
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
      <div className="font-mono text-lg text-text-primary">{value}</div>
    </div>
  );
}

function ReportDetail({ report }: { report: Report }) {
  const content = report.content as Record<string, unknown>;
  const anomalyCounts = (content.anomaly_counts as Record<string, number>) || {};

  function handleExport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leaksense-report-${report.id.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleShare() {
    const url = `${window.location.origin}/reports?id=${report.id}`;
    navigator.clipboard.writeText(url);
    toast.success("Report URL copied");
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold capitalize text-text-primary">
            {report.report_type} Summary Report
          </h3>
          <p className="text-xs text-text-muted">
            {formatDate(report.period_start)} → {formatDate(report.period_end)}
          </p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
        >
          Export
        </button>
      </div>

      {(["water", "electricity", "internet"] as const).map((resource) => {
        const stats = content[resource] as
          | { total: string; avg: string; max: string; count: number }
          | undefined;
        if (!stats) return null;
        return (
          <div key={resource} className="mb-4">
            <h4 className="mb-2 text-sm font-semibold text-text-primary">
              {RESOURCE_EMOJI[resource]} {RESOURCE_LABEL[resource]}
            </h4>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <MetricCell label="Total" value={stats.total} />
              <MetricCell label="Average" value={stats.avg} />
              <MetricCell label="Peak" value={stats.max} />
              <MetricCell label="Readings" value={stats.count} />
            </div>
          </div>
        );
      })}

      <div className="mt-5">
        <h4 className="mb-2 text-sm font-semibold text-text-primary">Anomaly Counts</h4>
        <div className="flex flex-wrap gap-2">
          {(["water", "electricity", "internet"] as const).map((r) => (
            <span
              key={r}
              className="rounded-full bg-danger/10 px-3 py-1 text-xs font-medium text-danger"
            >
              {RESOURCE_EMOJI[r]} {RESOURCE_LABEL[r]}: {anomalyCounts[r] || 0}
            </span>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={handleShare}
        className="mt-5 inline-flex items-center gap-2 rounded-md border border-surface-border px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share Report
      </button>
    </div>
  );
}

// ───────────────────────────────────────────── Recommendations Panel

const PRIORITY_COLOR: Record<number, string> = {
  1: "bg-danger text-white",
  2: "bg-warning text-warning-foreground",
  3: "bg-accent text-accent-foreground",
  4: "bg-surface-border text-text-secondary",
};

function generateRecommendations(
  anomalies: Anomaly[],
): Omit<Recommendation, "id" | "created_at">[] {
  const templates: Record<string, Record<string, { action: string; unit: string }>> = {
    water: {
      spike: {
        action:
          "Immediately inspect water supply pipeline in Room {room}, Floor {floor}, {building}. Check for burst pipes or stuck valves.",
        unit: "L/day",
      },
      leak: {
        action:
          "Send maintenance to check for slow leak in Room {room}, Floor {floor}, {building}.",
        unit: "L/day",
      },
    },
    electricity: {
      night_anomaly: {
        action:
          "Inspect Room {room}, Floor {floor}, {building} for equipment left on overnight.",
        unit: "kWh/day",
      },
      spike: {
        action: "Check AC/motors in Room {room}, Floor {floor}, {building} for faults.",
        unit: "kWh/day",
      },
    },
    internet: {
      bulk_download: {
        action:
          "Identify and block device causing bulk downloads in Room {room}, Floor {floor}, {building}.",
        unit: "GB/day",
      },
      unauthorized: {
        action:
          "Deauthorize unknown devices on network in Room {room}, Floor {floor}, {building}.",
        unit: "GB/day",
      },
    },
  };
  const priorityMap: Record<string, number> = { critical: 1, high: 2, medium: 3, low: 4 };

  return anomalies.map((a) => {
    const tmpl =
      templates[a.resource_type]?.[a.anomaly_type] ?? {
        action: "Review usage in {building} F{floor}/R{room}.",
        unit: "units",
      };
    return {
      anomaly_id: a.id,
      resource_type: a.resource_type,
      building_id: a.building_id,
      floor_no: a.floor_no,
      room_no: a.room_no,
      action: tmpl.action
        .replace("{room}", String(a.room_no))
        .replace("{floor}", String(a.floor_no))
        .replace("{building}", a.building_id),
      severity: a.severity,
      priority: priorityMap[a.severity] ?? 3,
      estimated_saving: null,
      saving_unit: tmpl.unit,
      status: "pending",
    };
  });
}

function RecommendationsPanel() {
  const qc = useQueryClient();
  const { data: recs = [], isLoading } = useRecommendations();
  const { data: anomalies = [] } = useAnomalies();
  const [tab, setTab] = useState<"all" | ResourceType>("all");
  const [generating, setGenerating] = useState(false);

  const pending = useMemo(
    () =>
      recs
        .filter((r) => r.status === "pending")
        .sort((a, b) => a.priority - b.priority)
        .slice(0, 20),
    [recs],
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: pending.length, water: 0, electricity: 0, internet: 0 };
    for (const r of pending) c[r.resource_type] = (c[r.resource_type] || 0) + 1;
    return c;
  }, [pending]);

  const filtered = tab === "all" ? pending : pending.filter((r) => r.resource_type === tab);

  async function updateStatus(id: string, status: "done" | "dismissed") {
    const { error } = await supabase
      .from("recommendations")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error("Update failed", { description: error.message });
      return;
    }
    toast.success(status === "done" ? "Marked as done" : "Dismissed");
    qc.invalidateQueries({ queryKey: ["recommendations"] });
  }

  async function handleGenerate() {
    const unresolved = anomalies.filter((a) => !a.is_resolved);
    if (!unresolved.length) {
      toast.info("No unresolved anomalies to process");
      return;
    }
    setGenerating(true);
    try {
      const payload = generateRecommendations(unresolved);
      const { error } = await supabase.from("recommendations").insert(payload);
      if (error) throw error;
      toast.success(`Generated ${payload.length} recommendations`);
      qc.invalidateQueries({ queryKey: ["recommendations"] });
    } catch (e) {
      toast.error("Generation failed", { description: (e as Error).message });
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-success" />
          <h2 className="text-lg font-semibold text-text-primary">Active Recommendations</h2>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-3 py-2 text-xs font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
        >
          <Sparkles className="h-3.5 w-3.5" />
          {generating ? "Generating…" : "Generate from Anomalies"}
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(["all", "water", "electricity", "internet"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium capitalize",
              tab === t
                ? "border-accent bg-accent/10 text-accent"
                : "border-surface-border text-text-secondary hover:bg-surface-elevated",
            )}
          >
            {t === "all" ? "All" : `${RESOURCE_EMOJI[t]} ${RESOURCE_LABEL[t]}`}
            <span className="ml-1.5 rounded-full bg-surface-elevated px-1.5 py-0.5 text-[10px]">
              {counts[t] || 0}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-text-muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-text-muted">No pending recommendations.</p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((r) => (
            <li
              key={r.id}
              className="rounded-lg border border-surface-border bg-surface-elevated p-4"
            >
              <div className="flex items-start gap-3">
                <div
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                    PRIORITY_COLOR[r.priority] || PRIORITY_COLOR[4],
                  )}
                >
                  {r.priority}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="mb-1 text-xs text-text-muted">
                    {RESOURCE_EMOJI[r.resource_type]} {r.building_id} · Floor {r.floor_no} · Room{" "}
                    {r.room_no}
                  </div>
                  <p className="font-medium text-text-primary">{r.action}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase",
                        SEVERITY_COLOR[r.severity] || SEVERITY_COLOR.low,
                      )}
                    >
                      {r.severity}
                    </span>
                    {r.estimated_saving != null && (
                      <span className="text-xs font-medium text-accent">
                        Saves ~{fmt(r.estimated_saving)} {r.saving_unit}
                      </span>
                    )}
                    <div className="ml-auto flex gap-2">
                      <button
                        type="button"
                        onClick={() => updateStatus(r.id, "done")}
                        className="rounded-md bg-success/15 px-2.5 py-1 text-xs font-medium text-success hover:bg-success/25"
                      >
                        Mark Done
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStatus(r.id, "dismissed")}
                        className="rounded-md border border-surface-border px-2.5 py-1 text-xs font-medium text-text-secondary hover:bg-surface"
                      >
                        Dismiss
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ───────────────────────────────────────────── Page

export default function ReportsPage() {
  const qc = useQueryClient();
  const { data: reports = [], isLoading } = useReports();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0] ?? null,
    [reports, selectedId],
  );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <h1 className="text-2xl font-bold text-text-primary">Reports</h1>
        <p className="text-sm text-text-muted">
          Generate, review, and export consumption reports.
        </p>
      </header>

      <ReportGenerator onGenerated={() => qc.invalidateQueries({ queryKey: ["reports"] })} />

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="rounded-xl border border-surface-border bg-surface p-4">
          <h2 className="mb-3 text-sm font-semibold text-text-primary">
            Saved Reports ({reports.length})
          </h2>
          {isLoading ? (
            <p className="text-sm text-text-muted">Loading…</p>
          ) : reports.length === 0 ? (
            <p className="text-sm text-text-muted">No reports yet.</p>
          ) : (
            <ul className="space-y-2">
              {reports.map((r) => {
                const isSel = selected?.id === r.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(r.id)}
                      className={cn(
                        "flex w-full items-start gap-2 rounded-lg border p-3 text-left transition",
                        isSel
                          ? "border-accent bg-accent/5"
                          : "border-surface-border hover:bg-surface-elevated",
                      )}
                    >
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-text-muted" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="rounded-full bg-surface-elevated px-2 py-0.5 text-[10px] font-semibold uppercase text-text-secondary">
                            {r.report_type}
                          </span>
                          <span className="truncate text-xs text-text-muted">
                            {r.resource_type
                              ? `${RESOURCE_EMOJI[r.resource_type] ?? ""} ${RESOURCE_LABEL[r.resource_type] ?? r.resource_type}`
                              : "All"}
                          </span>
                        </div>
                        <div className="mt-1 text-[11px] text-text-muted">
                          {formatDate(r.created_at)}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {selected ? (
          <ReportDetail report={selected} />
        ) : (
          <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-dashed border-surface-border bg-surface p-8 text-center">
            <div>
              <FileText className="mx-auto mb-3 h-10 w-10 text-text-muted" />
              <p className="text-sm text-text-muted">
                Generate a report to see details here.
              </p>
            </div>
          </div>
        )}
      </div>

      <RecommendationsPanel />
    </div>
  );
}