import { useCallback, useEffect, useRef, useState } from "react";
import {
  Database,
  FileSpreadsheet,
  Loader2,
  RefreshCw,
  Upload as UploadIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { seedSyntheticData } from "@/lib/seedData";
import { parseAndInsertCSV, type ResourceKind } from "@/lib/csvParser";
import { cn } from "@/lib/utils";

const MAX_BYTES = 50 * 1024 * 1024;

const RESOURCES: Array<{
  key: ResourceKind;
  label: string;
  emoji: string;
  columns: string;
  accent: string;
  border: string;
}> = [
  {
    key: "water",
    label: "Water",
    emoji: "💧",
    columns: "timestamp, building_id, floor_no, room_no, water_usage_liters",
    accent: "text-blue-400",
    border: "border-blue-500/40 hover:border-blue-500/70",
  },
  {
    key: "electricity",
    label: "Electricity",
    emoji: "⚡",
    columns: "timestamp, building_id, floor_no, room_no, electricity_usage_kwh",
    accent: "text-yellow-400",
    border: "border-yellow-500/40 hover:border-yellow-500/70",
  },
  {
    key: "internet",
    label: "Internet",
    emoji: "🌐",
    columns: "timestamp, building_id, floor_no, room_no, internet_usage_gb",
    accent: "text-teal-400",
    border: "border-teal-500/40 hover:border-teal-500/70",
  },
];

const STATUS_TABLES = [
  "water_consumption",
  "electricity_consumption",
  "internet_consumption",
  "anomalies",
  "recommendations",
  "reports",
  "chat_messages",
] as const;
type StatusTable = (typeof STATUS_TABLES)[number];

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function timeAgo(iso: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ──────────────────────────── Upload card

function UploadCard({
  resource,
  onUploaded,
}: {
  resource: (typeof RESOURCES)[number];
  onUploaded: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  function pickFile(f: File | undefined | null) {
    setError(null);
    if (!f) return;
    if (!f.name.toLowerCase().endsWith(".csv")) {
      setError("Only CSV files accepted");
      return;
    }
    if (f.size > MAX_BYTES) {
      setError("File exceeds 50MB limit");
      return;
    }
    setFile(f);
    setPct(0);
    setMsg("");
  }

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const result = await parseAndInsertCSV(file, resource.key, (p, m) => {
        setPct(p);
        setMsg(m);
      });
      toast.success(
        `${resource.label}: inserted ${result.inserted.toLocaleString()} rows`,
      );
      onUploaded();
    } catch (e) {
      const err = (e as Error).message;
      setError(err);
      toast.error(`${resource.label} upload failed`, { description: err });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-base font-semibold text-text-primary">
          {resource.emoji} {resource.label}
        </h3>
        <FileSpreadsheet className={cn("h-4 w-4", resource.accent)} />
      </div>
      <code className="mb-4 block break-words rounded-md bg-surface-elevated px-2 py-1.5 text-[10px] text-text-muted">
        {resource.columns}
      </code>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition",
          resource.border,
          dragging && "bg-surface-elevated",
        )}
      >
        <UploadIcon className={cn("mb-2 h-6 w-6", resource.accent)} />
        {file ? (
          <div className="flex w-full items-center justify-between gap-2 text-left">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-text-primary">{file.name}</p>
              <p className="text-xs text-text-muted">{fmtSize(file.size)}</p>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFile(null);
                setPct(0);
                setMsg("");
              }}
              className="rounded-md p-1 text-text-muted hover:bg-surface hover:text-text-primary"
              aria-label="Clear file"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-text-secondary">Drag & drop or click to browse</p>
            <p className="mt-1 text-[11px] text-text-muted">Only CSV files accepted</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {(busy || pct > 0) && (
        <div className="mt-3">
          <div className="h-2 overflow-hidden rounded-full bg-surface-elevated">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="mt-1 text-xs text-text-muted">{msg}</p>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs font-medium text-danger">⚠ {error}</p>
      )}

      <button
        type="button"
        onClick={handleUpload}
        disabled={!file || busy}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-md bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadIcon className="h-4 w-4" />}
        {busy ? "Uploading…" : "Upload"}
      </button>
    </div>
  );
}

// ──────────────────────────── Seeder

function SeederCard({ onSeeded }: { onSeeded: () => void }) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string>("");
  const [done, setDone] = useState<number | null>(null);

  async function handleSeed() {
    setBusy(true);
    setDone(null);
    const tId = toast.loading("Seeding database…");
    try {
      const result = await seedSyntheticData((p) => {
        setProgress(`${p.step} (${p.done}/${p.total})`);
        toast.loading(`${p.step} (${p.done}/${p.total})`, { id: tId });
      });
      const total =
        (result.water || 0) + (result.electricity || 0) + (result.internet || 0);
      setDone(total);
      toast.success(`Seeded ${total.toLocaleString()} records`, { id: tId });
      onSeeded();
    } catch (e) {
      toast.error(`Seed failed: ${(e as Error).message}`, { id: tId });
    } finally {
      setBusy(false);
      setProgress("");
    }
  }

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/5 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-md bg-accent/15 p-2 text-accent">
          <Database className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h3 className="text-base font-semibold text-text-primary">
            Quick Setup — Seed Sample Data
          </h3>
          <p className="mt-1 text-sm text-text-muted">
            Don't have CSV files? Generate and insert realistic synthetic
            readings for all buildings to get started immediately.
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSeed}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:bg-accent/90 disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {busy ? "Seeding…" : "Seed Database"}
            </button>
            {progress && <span className="text-xs text-text-muted">{progress}</span>}
            {done != null && (
              <span className="text-xs text-success">
                Database seeded with {done.toLocaleString()} records ·{" "}
                <Link to="/dashboard" className="underline">
                  Open dashboard
                </Link>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────── Status panel

function StatusPanel({ refreshKey }: { refreshKey: number }) {
  const [rows, setRows] = useState<Record<string, { count: number; latest: string | null }>>({});
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    const next: Record<string, { count: number; latest: string | null }> = {};
    await Promise.all(
      STATUS_TABLES.map(async (t) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { count } = await (supabase as any)
          .from(t)
          .select("*", { count: "exact", head: true });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data } = await (supabase as any)
          .from(t)
          .select("created_at")
          .order("created_at", { ascending: false })
          .limit(1);
        next[t] = {
          count: count ?? 0,
          latest: (data?.[0]?.created_at as string) ?? null,
        };
      }),
    );
    setRows(next);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh, refreshKey]);

  return (
    <div className="rounded-xl border border-surface-border bg-surface p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-text-primary">Database Status</h2>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md border border-surface-border px-2.5 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-elevated disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-surface-border text-left text-xs uppercase tracking-wider text-text-muted">
              <th className="py-2 pr-4 font-medium">Table</th>
              <th className="py-2 pr-4 font-medium">Row Count</th>
              <th className="py-2 font-medium">Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {STATUS_TABLES.map((t) => (
              <tr key={t} className="border-b border-surface-border/60 last:border-0">
                <td className="py-2 pr-4 font-mono text-text-secondary">{t}</td>
                <td className="py-2 pr-4 font-mono text-text-primary">
                  {rows[t]?.count?.toLocaleString() ?? "—"}
                </td>
                <td className="py-2 text-text-muted">{timeAgo(rows[t]?.latest ?? null)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ──────────────────────────── Page

export default function UploadPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const bump = () => setRefreshKey((k) => k + 1);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <header>
        <div className="flex items-center gap-2">
          <UploadIcon className="h-6 w-6 text-accent" />
          <h1 className="text-2xl font-bold text-text-primary">Upload Consumption Data</h1>
        </div>
      </header>

      <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-sm text-text-secondary">
        Upload CSV files for each resource. Files are validated, parsed in-browser,
        and inserted into the database in batches. After upload, run anomaly
        detection from the <Link to="/anomalies" className="font-medium text-accent underline">Anomalies</Link> page.
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {RESOURCES.map((r) => (
          <UploadCard key={r.key} resource={r} onUploaded={bump} />
        ))}
      </div>

      <SeederCard onSeeded={bump} />

      <StatusPanel refreshKey={refreshKey} />
    </div>
  );
}