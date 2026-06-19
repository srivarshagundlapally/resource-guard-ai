import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Clock,
  Download,
  Loader2,
  Scan,
  Sparkles,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Route } from "@/routes/_app.anomalies";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { AlertBadge } from "@/components/ui/AlertBadge";
import { ResourceIcon, type ResourceKind } from "@/components/ui/ResourceIcon";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  GRID_STROKE,
  TICK_COLOR,
  tickStyle,
  tooltipStyle,
} from "@/components/dashboard/chartTheme";
import type { Anomaly, ResourceType, Severity, RootCause } from "@/types";

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "#E74C3C",
  high: "#F97316",
  medium: "#F5A623",
  low: "#00C9A7",
};

const RESOURCE_EMOJI: Record<ResourceType, string> = {
  water: "💧",
  electricity: "⚡",
  internet: "🌐",
};

const BUILDINGS = ["BLK-A", "BLK-B", "BLK-C", "BLK-D"] as const;
const PAGE_SIZE = 10;

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ───────────────────────── Detection Simulation ─────────────────────────

const STEPS = [
  { label: "Loading last 24h data…", ms: 500 },
  { label: "Running Isolation Forest…", ms: 800 },
  { label: "Running Local Outlier Factor…", ms: 600 },
  { label: "Running Z-Score Analysis…", ms: 400 },
  { label: "Ensemble voting (2/3 majority)…", ms: 400 },
  { label: "Running Root Cause Analysis…", ms: 500 },
  { label: "Saving results…", ms: 300 },
];

const ROOT_CAUSE_TEMPLATES: Record<string, { cause: string; confidence: number; description?: string }[]> = {
  "water-spike": [
    { cause: "Pipe Leakage", confidence: 0.82, description: "Sustained flow signature matches a pressurised leak." },
    { cause: "Open Tap", confidence: 0.65, description: "Continuous low-rate draw during off-hours." },
    { cause: "Faulty Meter", confidence: 0.41, description: "Reading variance outside calibration window." },
  ],
  "electricity-night": [
    { cause: "Equipment Left ON", confidence: 0.78, description: "HVAC / lab load active after curfew." },
    { cause: "Faulty Appliance", confidence: 0.65, description: "Power draw inconsistent with rated baseline." },
  ],
  "internet-bulk": [
    { cause: "Unauthorized Download", confidence: 0.75, description: "Sustained > 200 Mbps to single host." },
    { cause: "Malware Activity", confidence: 0.6, description: "Periodic beacon pattern detected." },
  ],
};

function pickKey(resource: ResourceType, type: string) {
  if (resource === "water") return "water-spike";
  if (resource === "electricity") return "electricity-night";
  return "internet-bulk";
}

function buildSimulatedAnomalies() {
  const now = new Date();
  const pool: Array<Omit<Anomaly, "id" | "created_at"> & { _rcKey: string }> = [
    {
      resource_type: "water", timestamp: now.toISOString(), building_id: "BLK-A",
      floor_no: 2, room_no: 204, anomaly_type: "spike", severity: "critical", score: 0.91,
      description: "Water usage 8× above baseline. Continuous flow detected since 02:00.",
      is_resolved: false, resolved_at: null, _rcKey: "water-spike",
    },
    {
      resource_type: "electricity", timestamp: now.toISOString(), building_id: "BLK-C",
      floor_no: 4, room_no: 412, anomaly_type: "night_load", severity: "high", score: 0.78,
      description: "Electrical load 3× baseline between 23:00–05:00.",
      is_resolved: false, resolved_at: null, _rcKey: "electricity-night",
    },
    {
      resource_type: "internet", timestamp: now.toISOString(), building_id: "BLK-B",
      floor_no: 1, room_no: 118, anomaly_type: "bulk_download", severity: "medium", score: 0.66,
      description: "Sustained 250 Mbps egress to a single external host.",
      is_resolved: false, resolved_at: null, _rcKey: "internet-bulk",
    },
    {
      resource_type: "water", timestamp: now.toISOString(), building_id: "BLK-D",
      floor_no: 3, room_no: 305, anomaly_type: "drip", severity: "low", score: 0.58,
      description: "Low-rate continuous draw consistent with minor leak.",
      is_resolved: false, resolved_at: null, _rcKey: "water-spike",
    },
    {
      resource_type: "electricity", timestamp: now.toISOString(), building_id: "BLK-A",
      floor_no: 1, room_no: 101, anomaly_type: "surge", severity: "high", score: 0.83,
      description: "Voltage surge event — peak 1.6× nominal.",
      is_resolved: false, resolved_at: null, _rcKey: "electricity-night",
    },
  ];
  const count = 3 + Math.floor(Math.random() * 3);
  return pool.sort(() => Math.random() - 0.5).slice(0, count);
}

function DetectionModal({
  open,
  onClose,
  onComplete,
}: {
  open: boolean;
  onClose: () => void;
  onComplete: (inserted: number) => void;
}) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!open) {
      setStep(0);
      return;
    }
    let cancelled = false;
    (async () => {
      for (let i = 0; i < STEPS.length; i++) {
        if (cancelled) return;
        setStep(i);
        await new Promise((r) => setTimeout(r, STEPS[i].ms));
      }
      if (cancelled) return;
      setStep(STEPS.length);

      const items = buildSimulatedAnomalies();
      const rows = items.map(({ _rcKey: _k, ...rest }) => rest);
      const { data: inserted, error } = await supabase
        .from("anomalies")
        .insert(rows)
        .select("id");
      if (error) {
        console.error(error);
        toast.error("Failed to save detection results");
        onClose();
        return;
      }
      const rcRows = inserted!.flatMap((row, idx) => {
        const key = pickKey(items[idx].resource_type, items[idx].anomaly_type);
        return (ROOT_CAUSE_TEMPLATES[key] ?? []).map((rc) => ({
          anomaly_id: row.id,
          cause: rc.cause,
          confidence_score: rc.confidence,
          description: rc.description ?? null,
        }));
      });
      if (rcRows.length) {
        const { error: rcErr } = await supabase.from("root_cause_analysis").insert(rcRows);
        if (rcErr) console.error(rcErr);
      }
      onComplete(inserted!.length);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, onClose, onComplete]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="border-surface-border bg-card text-slate-100 sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-accent" />
            Running Anomaly Detection
          </DialogTitle>
        </DialogHeader>
        <ul className="space-y-2.5">
          {STEPS.map((s, i) => {
            const done = i < step;
            const active = i === step;
            return (
              <li key={s.label} className="flex items-center gap-3 text-sm">
                {done ? (
                  <CheckCircle2 className="h-4 w-4 text-accent" />
                ) : active ? (
                  <Loader2 className="h-4 w-4 animate-spin text-primary-light" />
                ) : (
                  <span className="h-4 w-4 rounded-full border border-surface-border" />
                )}
                <span className={cn(done ? "text-slate-300" : active ? "text-slate-100" : "text-slate-500")}>
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      </DialogContent>
    </Dialog>
  );
}

// ───────────────────────── Page ─────────────────────────

export function Anomalies() {
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/anomalies" });
  const qc = useQueryClient();

  const setSearch = (patch: Partial<typeof search>) =>
    navigate({
      search: (prev: typeof search) => ({ ...prev, ...patch, page: patch.page ?? 1 }),
    });

  const [modalOpen, setModalOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: anomalies = [], isLoading } = useQuery({
    queryKey: ["anomalies", "all", search.resource, search.severity, search.status, search.building],
    queryFn: async () => {
      let q = supabase.from("anomalies").select("*").order("timestamp", { ascending: false }).limit(500);
      if (search.resource !== "all") q = q.eq("resource_type", search.resource);
      if (search.severity !== "all") q = q.eq("severity", search.severity);
      if (search.status === "unresolved") q = q.eq("is_resolved", false);
      if (search.building !== "all") q = q.eq("building_id", search.building);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Anomaly[];
    },
  });

  // Summary stats (always unfiltered counts)
  const { data: stats } = useQuery({
    queryKey: ["anomalies-stats"],
    queryFn: async () => {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const [total, critical, unresolved, today] = await Promise.all([
        supabase.from("anomalies").select("*", { count: "exact", head: true }),
        supabase.from("anomalies").select("*", { count: "exact", head: true }).eq("severity", "critical"),
        supabase.from("anomalies").select("*", { count: "exact", head: true }).eq("is_resolved", false),
        supabase.from("anomalies").select("*", { count: "exact", head: true }).gte("created_at", startOfDay.toISOString()),
      ]);
      return {
        total: total.count ?? 0,
        critical: critical.count ?? 0,
        unresolved: unresolved.count ?? 0,
        today: today.count ?? 0,
      };
    },
  });

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel("anomalies-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "anomalies" },
        () => {
          toast("⚠️ New anomaly detected!");
          qc.invalidateQueries({ queryKey: ["anomalies"] });
          qc.invalidateQueries({ queryKey: ["anomalies-stats"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "anomalies" },
        () => {
          qc.invalidateQueries({ queryKey: ["anomalies"] });
          qc.invalidateQueries({ queryKey: ["anomalies-stats"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [qc]);

  const totalPages = Math.max(1, Math.ceil(anomalies.length / PAGE_SIZE));
  const page = Math.min(search.page, totalPages);
  const pageRows = useMemo(
    () => anomalies.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [anomalies, page],
  );

  const scatterData = useMemo(
    () =>
      (["critical", "high", "medium", "low"] as Severity[]).map((sev) => ({
        severity: sev,
        color: SEVERITY_COLORS[sev],
        points: anomalies
          .map((a, idx) => ({ ...a, idx }))
          .filter((a) => a.severity === sev)
          .map((a) => ({
            x: a.idx,
            y: Number(a.score ?? 0),
            building_id: a.building_id,
            floor_no: a.floor_no,
            room_no: a.room_no,
            anomaly_type: a.anomaly_type,
            score: a.score,
          })),
      })),
    [anomalies],
  );

  const exportCsv = () => {
    const header = [
      "id", "resource_type", "severity", "building_id", "floor_no", "room_no",
      "anomaly_type", "score", "timestamp", "is_resolved", "description",
    ];
    const rows = anomalies.map((a) =>
      header.map((h) => {
        const v = (a as unknown as Record<string, unknown>)[h];
        const s = v == null ? "" : String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      }).join(","),
    );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `anomalies-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <SectionTitle icon={AlertTriangle}>Anomaly Detection</SectionTitle>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatMini label="Total Anomalies" value={stats?.total ?? "—"} icon={AlertTriangle} />
        <StatMini label="Critical" value={stats?.critical ?? "—"} icon={AlertTriangle} accent="danger" />
        <StatMini label="Unresolved" value={stats?.unresolved ?? "—"} icon={Clock} />
        <StatMini label="Today" value={stats?.today ?? "—"} icon={Sparkles} />
      </div>

      {/* Filter Bar */}
      <div className="rounded-xl border border-surface-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect
            value={search.resource}
            onChange={(v) => setSearch({ resource: v as typeof search.resource })}
            placeholder="Resource"
            options={[
              { value: "all", label: "All Resources" },
              { value: "water", label: "💧 Water" },
              { value: "electricity", label: "⚡ Electricity" },
              { value: "internet", label: "🌐 Internet" },
            ]}
          />
          <FilterSelect
            value={search.severity}
            onChange={(v) => setSearch({ severity: v as typeof search.severity })}
            placeholder="Severity"
            options={[
              { value: "all", label: "All Severities" },
              { value: "critical", label: "Critical" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <FilterSelect
            value={search.status}
            onChange={(v) => setSearch({ status: v as typeof search.status })}
            placeholder="Status"
            options={[
              { value: "all", label: "All Statuses" },
              { value: "unresolved", label: "Unresolved" },
            ]}
          />
          <FilterSelect
            value={search.building}
            onChange={(v) => setSearch({ building: v as typeof search.building })}
            placeholder="Building"
            options={[
              { value: "all", label: "All Buildings" },
              ...BUILDINGS.map((b) => ({ value: b, label: b })),
            ]}
          />
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">
              Showing {anomalies.length} {anomalies.length === 1 ? "anomaly" : "anomalies"}
            </span>
            <Button variant="ghost" size="sm" onClick={exportCsv} className="text-slate-300">
              <Download className="mr-1.5 h-4 w-4" /> Export CSV
            </Button>
            <Button
              size="sm"
              onClick={() => setModalOpen(true)}
              className="bg-primary text-white hover:bg-primary/90"
            >
              <Scan className="mr-1.5 h-4 w-4" /> Run Detection
            </Button>
          </div>
        </div>
      </div>

      {/* Scatter Chart */}
      <div className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle>Anomaly Score Distribution</SectionTitle>
        <div className="h-72 w-full">
          <ResponsiveContainer>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                name="Record Index"
                tick={tickStyle}
                stroke={TICK_COLOR}
                label={{ value: "Record Index", position: "insideBottom", offset: -2, fill: TICK_COLOR, fontSize: 11 }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Score"
                domain={[0, 1]}
                tick={tickStyle}
                stroke={TICK_COLOR}
                label={{ value: "Anomaly Score", angle: -90, position: "insideLeft", fill: TICK_COLOR, fontSize: 11 }}
              />
              <ReferenceLine
                y={0.55}
                stroke="#94A3B8"
                strokeDasharray="4 4"
                label={{ value: "Threshold", position: "right", fill: "#94A3B8", fontSize: 11 }}
              />
              <Tooltip
                cursor={{ stroke: "#1E2F45" }}
                contentStyle={tooltipStyle}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const p = payload[0].payload as { building_id: string; floor_no: number; room_no: number; anomaly_type: string; score: number };
                  return (
                    <div style={tooltipStyle}>
                      <div className="text-[11px] font-semibold text-slate-200">
                        {p.building_id} · F{p.floor_no} · R{p.room_no}
                      </div>
                      <div className="text-xs text-slate-400">{p.anomaly_type}</div>
                      <div className="mt-1 text-xs">Score: <span className="font-mono text-slate-100">{Number(p.score).toFixed(3)}</span></div>
                    </div>
                  );
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: 11, color: TICK_COLOR }}
                iconType="circle"
              />
              {scatterData.map((s) => (
                <Scatter
                  key={s.severity}
                  name={s.severity[0].toUpperCase() + s.severity.slice(1)}
                  data={s.points}
                  fill={s.color}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* List */}
      <div className="space-y-2">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full rounded-xl bg-surface-card" />
          ))
        ) : anomalies.length === 0 ? (
          <div className="rounded-xl border border-surface-border bg-card p-10 text-center text-sm text-slate-400">
            No anomalies match the current filters.
          </div>
        ) : (
          pageRows.map((a) => (
            <AnomalyRow
              key={a.id}
              anomaly={a}
              expanded={expanded === a.id}
              onToggle={() => setExpanded((prev) => (prev === a.id ? null : a.id))}
            />
          ))
        )}
      </div>

      {/* Pagination */}
      {anomalies.length > PAGE_SIZE && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              disabled={page <= 1}
              onClick={() => setSearch({ page: page - 1 })}
            >
              Previous
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setSearch({ page: page + 1 })}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <DetectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onComplete={(n) => {
          toast.success(`${n} new anomalies detected`);
          setModalOpen(false);
          qc.invalidateQueries({ queryKey: ["anomalies"] });
          qc.invalidateQueries({ queryKey: ["anomalies-stats"] });
        }}
      />
    </div>
  );
}

// ───────────────────────── Sub-components ─────────────────────────

function StatMini({
  label,
  value,
  icon: Icon,
  accent,
}: {
  label: string;
  value: number | string;
  icon: typeof AlertTriangle;
  accent?: "danger";
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</span>
        <Icon className={cn("h-4 w-4", accent === "danger" ? "text-danger" : "text-slate-500")} />
      </div>
      <div className={cn("mt-2 font-display text-2xl font-bold", accent === "danger" ? "text-danger" : "text-slate-100")}>
        {value}
      </div>
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  placeholder,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  options: { value: string; label: string }[];
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px] border-surface-border bg-surface text-slate-200">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="border-surface-border bg-card text-slate-100">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function AnomalyRow({
  anomaly,
  expanded,
  onToggle,
}: {
  anomaly: Anomaly;
  expanded: boolean;
  onToggle: () => void;
}) {
  const qc = useQueryClient();
  const sev = anomaly.severity as Severity;

  const markResolved = async () => {
    const { error } = await supabase
      .from("anomalies")
      .update({ is_resolved: true, resolved_at: new Date().toISOString() })
      .eq("id", anomaly.id);
    if (error) {
      toast.error("Failed to mark resolved");
      return;
    }
    toast.success("Anomaly resolved");
    qc.invalidateQueries({ queryKey: ["anomalies"] });
    qc.invalidateQueries({ queryKey: ["anomalies-stats"] });
  };

  return (
    <div className="overflow-hidden rounded-xl border border-surface-border bg-card transition-colors hover:border-primary-light/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 p-4 text-left"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-surface text-lg">
          {RESOURCE_EMOJI[anomaly.resource_type]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <span className="font-medium text-slate-200">{anomaly.building_id}</span>
            <span>·</span>
            <span>F{anomaly.floor_no}</span>
            <span>·</span>
            <span>R{anomaly.room_no}</span>
            <AlertBadge severity={sev} />
            <span className="rounded-md bg-surface px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">
              {anomaly.anomaly_type}
            </span>
            {anomaly.is_resolved && (
              <span className="rounded-md bg-accent/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent">
                Resolved
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-slate-300">{anomaly.description}</p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className="font-mono text-sm text-slate-100">{Number(anomaly.score ?? 0).toFixed(3)}</span>
          <span className="text-[11px] text-slate-500">{timeAgo(anomaly.created_at)}</span>
        </div>
        <ChevronDown
          className={cn(
            "ml-2 h-4 w-4 shrink-0 text-slate-500 transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {expanded && (
        <div className="border-t border-surface-border bg-surface/40 p-5">
          <div className="mb-3 flex items-center justify-between">
            {!anomaly.is_resolved && (
              <Button size="sm" variant="ghost" onClick={markResolved} className="text-accent hover:text-accent">
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Mark Resolved
              </Button>
            )}
          </div>
          <Separator className="mb-4 bg-surface-border" />
          <RootCauseList anomalyId={anomaly.id} anomaly={anomaly} />
        </div>
      )}
    </div>
  );
}

function RootCauseList({ anomalyId, anomaly }: { anomalyId: string; anomaly: Anomaly }) {
  const qc = useQueryClient();
  const { data: causes = [], isLoading } = useQuery({
    queryKey: ["root-causes", anomalyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("root_cause_analysis")
        .select("*")
        .eq("anomaly_id", anomalyId)
        .order("confidence_score", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as RootCause[];
    },
  });

  const generateRecommendation = async () => {
    const action = `Investigate ${anomaly.anomaly_type} in ${anomaly.building_id} F${anomaly.floor_no} R${anomaly.room_no}. Dispatch facilities team within 24h.`;
    const { error } = await supabase.from("recommendations").insert({
      anomaly_id: anomaly.id,
      resource_type: anomaly.resource_type,
      building_id: anomaly.building_id,
      floor_no: anomaly.floor_no,
      room_no: anomaly.room_no,
      action,
      severity: anomaly.severity,
      priority: anomaly.severity === "critical" ? 1 : anomaly.severity === "high" ? 2 : 3,
      status: "pending",
    });
    if (error) {
      toast.error("Failed to generate recommendation");
      return;
    }
    toast.success("Recommendation generated");
    qc.invalidateQueries({ queryKey: ["recommendations"] });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="font-display text-sm font-semibold text-slate-100">Root Cause Analysis</h4>
        <Button size="sm" variant="ghost" onClick={generateRecommendation} className="text-primary-light">
          <Sparkles className="mr-1.5 h-4 w-4" /> Generate Recommendation
        </Button>
      </div>
      {isLoading ? (
        <Skeleton className="h-16 w-full" />
      ) : causes.length === 0 ? (
        <p className="text-xs text-slate-500">
          No root cause data available. Run detection to generate.
        </p>
      ) : (
        <ul className="space-y-3">
          {causes.map((c) => {
            const pct = Math.round(Number(c.confidence_score) * 100);
            const color = pct >= 70 ? "#00C9A7" : pct >= 50 ? "#F5A623" : "#E74C3C";
            return (
              <li key={c.id}>
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-semibold text-slate-100">{c.cause}</span>
                  <span className="font-mono text-xs text-slate-300">{pct}%</span>
                </div>
                {c.description && (
                  <p className="mt-0.5 text-xs text-slate-400">{c.description}</p>
                )}
                <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface">
                  <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}