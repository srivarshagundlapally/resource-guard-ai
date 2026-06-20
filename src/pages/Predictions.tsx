import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Play,
  Settings,
  Save,
  Activity,
  BarChart3,
  History,
  CheckCircle2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  DarkTooltip,
  GRID_STROKE,
  tickStyle,
  tooltipStyle,
} from "@/components/dashboard/chartTheme";
import {
  generatePredictions,
  MODEL_METRICS,
  RESOURCE_COLORS,
  RESOURCE_UNITS,
  type PredictionPoint,
  type PredictionResource,
} from "@/lib/predictionEngine";
import { usePredictions } from "@/hooks/usePredictions";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const RESOURCES: { value: PredictionResource; label: string }[] = [
  { value: "water", label: "💧 Water" },
  { value: "electricity", label: "⚡ Electricity" },
  { value: "internet", label: "🌐 Internet" },
];
const BUILDINGS = ["BLK-A", "BLK-B", "BLK-C", "BLK-D"];
const FLOORS = [1, 2, 3, 4];
const HORIZONS = [
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours" },
  { value: 48, label: "48 hours" },
  { value: 72, label: "72 hours" },
  { value: 168, label: "7 days" },
];
const MODELS = ["XGBoost", "Random Forest", "Gradient Boosting"];

function fmtTime(ts: string, horizon: number) {
  const d = new Date(ts);
  if (horizon > 72)
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function Predictions() {
  const [resource, setResource] = useState<PredictionResource>("water");
  const [building, setBuilding] = useState("BLK-A");
  const [floor, setFloor] = useState(1);
  const [horizon, setHorizon] = useState(24);
  const [model, setModel] = useState("XGBoost");
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<PredictionPoint[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [resultMeta, setResultMeta] = useState<{
    resource: PredictionResource;
    building: string;
    floor: number;
    horizon: number;
    model: string;
  } | null>(null);

  const { data: history = [] } = usePredictions();

  const runPrediction = async () => {
    setRunning(true);
    setProgress(0);
    setResults(null);
    for (let p = 10; p <= 90; p += 20) {
      await new Promise((r) => setTimeout(r, 200));
      setProgress(p);
    }
    const out = generatePredictions(resource, building, horizon, model);
    setProgress(100);
    await new Promise((r) => setTimeout(r, 150));
    setResults(out);
    setResultMeta({ resource, building, floor, horizon, model });
    setRunning(false);
    toast.success(`Generated ${out.length} predictions using ${model}`);
  };

  const savePredictions = async () => {
    if (!results || !resultMeta) return;
    setSaving(true);
    const metrics = MODEL_METRICS[resultMeta.model];
    const rows = results.map((r) => ({
      resource_type: resultMeta.resource,
      timestamp: r.timestamp,
      building_id: resultMeta.building,
      floor_no: resultMeta.floor,
      room_no: null,
      predicted_value: r.predicted_value,
      actual_value: null,
      model_name: resultMeta.model,
      rmse: metrics?.rmse ?? null,
      mae: metrics?.mae ?? null,
      r2_score: metrics?.r2 ?? null,
    }));
    const { error } = await supabase.from("predictions").insert(rows);
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
    } else {
      toast.success(`Saved ${rows.length} predictions`);
    }
  };

  const stats = useMemo(() => {
    if (!results || !resultMeta) return null;
    const vals = results.map((r) => r.predicted_value);
    const sum = vals.reduce((a, b) => a + b, 0);
    const avg = sum / vals.length;
    let peak = results[0];
    let low = results[0];
    for (const r of results) {
      if (r.predicted_value > peak.predicted_value) peak = r;
      if (r.predicted_value < low.predicted_value) low = r;
    }
    return { avg, peak, low, total: sum };
  }, [results, resultMeta]);

  const chartData = useMemo(() => {
    if (!results || !resultMeta) return [];
    return results.map((r) => ({
      time: fmtTime(r.timestamp, resultMeta.horizon),
      predicted: r.predicted_value,
      lower: r.lower_bound,
      upper: r.upper_bound,
      band: [r.lower_bound, r.upper_bound] as [number, number],
    }));
  }, [results, resultMeta]);

  const comparisonData = useMemo(() => {
    return history
      .filter((p) => p.actual_value !== null)
      .slice(-50)
      .map((p) => ({
        time: fmtTime(p.timestamp, 168),
        predicted: p.predicted_value,
        actual: p.actual_value,
      }));
  }, [history]);

  const recentHistory = useMemo(() => {
    return [...history]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      .slice(0, 20);
  }, [history]);

  const unit = resultMeta ? RESOURCE_UNITS[resultMeta.resource] : "";
  const color = resultMeta ? RESOURCE_COLORS[resultMeta.resource] : "#1B6CA8";

  return (
    <div className="space-y-6">
      {/* Section 1: Configuration */}
      <section className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle icon={Settings}>Configure Prediction</SectionTitle>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Resource</label>
            <Select
              value={resource}
              onValueChange={(v) => setResource(v as PredictionResource)}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Building</label>
            <Select value={building} onValueChange={setBuilding}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {BUILDINGS.map((b) => (
                  <SelectItem key={b} value={b}>
                    {b}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Floor</label>
            <Select
              value={String(floor)}
              onValueChange={(v) => setFloor(Number(v))}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FLOORS.map((f) => (
                  <SelectItem key={f} value={String(f)}>
                    Floor {f}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Horizon</label>
            <Select
              value={String(horizon)}
              onValueChange={(v) => setHorizon(Number(v))}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZONS.map((h) => (
                  <SelectItem key={h.value} value={String(h.value)}>
                    {h.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400">Model</label>
            <Select value={model} onValueChange={setModel}>
              <SelectTrigger className="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="XGBoost">XGBoost (Best)</SelectItem>
                <SelectItem value="Random Forest">Random Forest</SelectItem>
                <SelectItem value="Gradient Boosting">
                  Gradient Boosting
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Button
              onClick={runPrediction}
              disabled={running}
              className="bg-accent text-accent-foreground hover:bg-accent-light"
            >
              <Play className="mr-2 h-4 w-4" />
              {running ? "Running…" : "Run Prediction"}
            </Button>
            <p className="text-[11px] text-slate-500">
              Estimated completion: ~2s
            </p>
          </div>
        </div>

        {running && (
          <div className="mt-5 rounded-lg border border-surface-border bg-surface/40 p-4">
            <div className="mb-2 flex items-center gap-2 text-sm text-slate-300">
              <Activity className="h-4 w-4 animate-pulse text-accent" />
              Running {model} on {horizon} hours of data…
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}
      </section>

      {/* Section 2: Results */}
      {results && resultMeta && stats && (
        <section className="rounded-xl border border-surface-border bg-card p-5">
          <SectionTitle
            icon={BarChart3}
            action={
              <Button
                size="sm"
                variant="outline"
                onClick={savePredictions}
                disabled={saving}
              >
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving…" : "Save Predictions"}
              </Button>
            }
          >
            {resultMeta.resource[0].toUpperCase() +
              resultMeta.resource.slice(1)}{" "}
            Forecast — {resultMeta.building} ({resultMeta.horizon}h)
          </SectionTitle>

          <div className="mb-4 grid grid-cols-2 gap-3 md:grid-cols-4">
            <StatTile
              label="Avg"
              value={`${stats.avg.toFixed(2)} ${unit}`}
            />
            <StatTile
              label="Peak"
              value={`${stats.peak.predicted_value.toFixed(2)} ${unit}`}
              hint={fmtTime(stats.peak.timestamp, resultMeta.horizon)}
            />
            <StatTile
              label="Low"
              value={`${stats.low.predicted_value.toFixed(2)} ${unit}`}
              hint={fmtTime(stats.low.timestamp, resultMeta.horizon)}
            />
            <StatTile label="Model" value={resultMeta.model} accent />
          </div>

          <div className="h-[340px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 8, right: 16, bottom: 4, left: 0 }}
              >
                <defs>
                  <linearGradient id="band" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity={0.25} />
                    <stop offset="100%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={tickStyle}
                  stroke={GRID_STROKE}
                  minTickGap={24}
                />
                <YAxis
                  tick={tickStyle}
                  stroke={GRID_STROKE}
                  unit={` ${unit}`}
                  width={70}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  labelStyle={{ color: "#94A3B8" }}
                  formatter={(v: number, name: string) => [
                    `${v.toFixed(3)} ${unit}`,
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                <Area
                  type="monotone"
                  dataKey="band"
                  stroke="none"
                  fill="url(#band)"
                  name="Confidence"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke={color}
                  strokeWidth={2.5}
                  dot={false}
                  name="Predicted"
                />
                <ReferenceLine
                  y={stats.avg}
                  stroke="#94A3B8"
                  strokeDasharray="4 4"
                  label={{ value: "avg", fill: "#94A3B8", fontSize: 11 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {/* Section 3: Model comparison */}
      <section className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle icon={BarChart3}>Model Comparison</SectionTitle>
        <div className="overflow-hidden rounded-lg border border-surface-border">
          <Table>
            <TableHeader>
              <TableRow className="border-surface-border hover:bg-transparent">
                <TableHead>Model</TableHead>
                <TableHead className="text-right">RMSE ↓</TableHead>
                <TableHead className="text-right">MAE ↓</TableHead>
                <TableHead className="text-right">R² Score ↑</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(
                [
                  ["XGBoost", 3.76, 2.54, 0.951, "✓ Best"],
                  ["Gradient Boosting", 4.05, 2.71, 0.941, "—"],
                  ["Random Forest", 4.21, 2.87, 0.934, "—"],
                ] as const
              ).map(([name, rmse, mae, r2, status]) => {
                const best = name === "XGBoost";
                return (
                  <TableRow
                    key={name}
                    className={cn(
                      "border-surface-border hover:bg-secondary/40",
                      best && "border-l-2 border-l-accent bg-accent/5",
                    )}
                  >
                    <TableCell className="font-medium text-slate-100">
                      {name}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {rmse}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {mae}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {r2}
                    </TableCell>
                    <TableCell
                      className={cn(
                        best ? "font-semibold text-accent" : "text-slate-400",
                      )}
                    >
                      {status}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Evaluated on 20% held-out test set (time-series split, shuffle=False).
        </p>
      </section>

      {/* Section 4: Historical vs Actuals */}
      <section className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle icon={Activity}>
          Historical Predictions vs Actuals
        </SectionTitle>
        {comparisonData.length === 0 ? (
          <EmptyState
            icon={Activity}
            title="No actuals yet"
            description="Once actual measurements are paired with past predictions, they will appear here."
          />
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={comparisonData}>
                <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
                <XAxis
                  dataKey="time"
                  tick={tickStyle}
                  stroke={GRID_STROKE}
                  minTickGap={24}
                />
                <YAxis tick={tickStyle} stroke={GRID_STROKE} width={60} />
                <Tooltip content={<DarkTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8" }} />
                <Line
                  type="monotone"
                  dataKey="predicted"
                  stroke="#1B6CA8"
                  strokeDasharray="5 5"
                  strokeWidth={2}
                  dot={false}
                  name="Predicted"
                />
                <Line
                  type="monotone"
                  dataKey="actual"
                  stroke="#00C9A7"
                  strokeWidth={2}
                  dot={false}
                  name="Actual"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Section 5: History table */}
      <section className="rounded-xl border border-surface-border bg-card p-5">
        <SectionTitle icon={History}>Prediction History</SectionTitle>
        {recentHistory.length === 0 ? (
          <EmptyState
            icon={History}
            title="No predictions yet"
            description="Run a prediction and click Save to populate the history."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-surface-border">
            <Table>
              <TableHeader>
                <TableRow className="border-surface-border hover:bg-transparent">
                  <TableHead>Timestamp</TableHead>
                  <TableHead>Resource</TableHead>
                  <TableHead>Building</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead className="text-right">Predicted</TableHead>
                  <TableHead className="text-right">Actual</TableHead>
                  <TableHead className="text-right">R²</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentHistory.map((p) => {
                  const pending = p.actual_value === null;
                  const deviation =
                    !pending && p.actual_value
                      ? Math.abs(p.predicted_value - p.actual_value) /
                        Math.abs(p.actual_value)
                      : null;
                  const accurate = deviation !== null && deviation < 0.1;
                  return (
                    <TableRow
                      key={p.id}
                      className="border-surface-border hover:bg-secondary/40"
                    >
                      <TableCell className="text-xs text-slate-400">
                        {new Date(p.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {p.resource_type}
                      </TableCell>
                      <TableCell>{p.building_id}</TableCell>
                      <TableCell className="text-slate-300">
                        {p.model_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {p.predicted_value.toFixed(3)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-400">
                        {p.actual_value !== null
                          ? p.actual_value.toFixed(3)
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right font-mono text-slate-400">
                        {p.r2_score !== null ? p.r2_score.toFixed(3) : "—"}
                      </TableCell>
                      <TableCell>
                        {pending ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-xs text-slate-300">
                            <Clock className="h-3 w-3" /> Pending
                          </span>
                        ) : accurate ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-accent/15 px-2 py-0.5 text-xs text-accent">
                            <CheckCircle2 className="h-3 w-3" /> Accurate
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-danger/15 px-2 py-0.5 text-xs text-danger">
                            <AlertTriangle className="h-3 w-3" /> Deviation
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}

function StatTile({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: boolean;
}) {
  return (
    <div className="rounded-lg border border-surface-border bg-surface/40 p-3">
      <p className="text-[11px] uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-display text-lg font-bold",
          accent ? "text-accent" : "text-slate-100",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}