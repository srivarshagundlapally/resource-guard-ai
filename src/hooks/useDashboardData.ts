import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const RESOURCE_COLORS = {
  water: "#1B6CA8",
  electricity: "#F5A623",
  internet: "#00C9A7",
} as const;

export const BUILDINGS = ["BLK-A", "BLK-B", "BLK-C", "BLK-D"] as const;

export interface HourlyPoint {
  hour: string; // "HH:00"
  water: number;
  electricity: number;
  internet: number;
}

export interface BuildingTotals {
  building_id: string;
  water: number;
  electricity: number;
  internet: number;
}

export interface HeatmapCell {
  building_id: string;
  day: string; // "Mon" etc.
  date: string; // ISO date
  value: number;
  hasAnomaly: boolean;
}

export interface DashboardData {
  todayTotals: { water: number; electricity: number; internet: number };
  changePct: { water: number; electricity: number; internet: number };
  hourly24: HourlyPoint[];
  perBuilding: BuildingTotals[];
  heatmap: HeatmapCell[];
  heatmapMax: number;
  lastUpdated: string;
}

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dayLabel(d: Date) {
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

async function fetchRange(table: string, col: string, sinceIso: string) {
  // Cast through unknown because dynamic table strings aren't in the typed union.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.from(table as any) as any)
    .select(`timestamp, ${col}, building_id, anomaly_label`)
    .gte("timestamp", sinceIso);
  if (error) throw error;
  return (data ?? []) as Array<{
    timestamp: string;
    building_id: string;
    anomaly_label: string;
    [k: string]: unknown;
  }>;
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard-data"],
    refetchInterval: 30_000,
    queryFn: async () => {
      // Anchor "now" to the latest timestamp present across the consumption
      // tables so the dashboard always reflects real data, even when the
      // seeded dataset isn't aligned with the wall clock.
      const latestTs = await (async () => {
        const tables = [
          ["water_consumption"],
          ["electricity_consumption"],
          ["internet_consumption"],
        ] as const;
        const results = await Promise.all(
          tables.map(async ([t]) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { data } = await (supabase.from(t as any) as any)
              .select("timestamp")
              .order("timestamp", { ascending: false })
              .limit(1)
              .maybeSingle();
            return data?.timestamp ? new Date(data.timestamp).getTime() : 0;
          }),
        );
        const max = Math.max(...results, 0);
        return max ? new Date(max) : new Date();
      })();
      const now = latestTs;
      const todayStart = startOfDay(now);
      const yesterdayStart = new Date(todayStart.getTime() - 24 * 3600 * 1000);
      const last24Start = new Date(now.getTime() - 24 * 3600 * 1000);
      const sevenDayStart = startOfDay(new Date(now.getTime() - 29 * 24 * 3600 * 1000));
      const earliest = new Date(
        Math.min(yesterdayStart.getTime(), last24Start.getTime(), sevenDayStart.getTime()),
      ).toISOString();

      const [waterRows, elecRows, netRows] = await Promise.all([
        fetchRange("water_consumption", "water_usage_liters", earliest),
        fetchRange("electricity_consumption", "electricity_usage_kwh", earliest),
        fetchRange("internet_consumption", "internet_usage_gb", earliest),
      ]);

      const sources = [
        { rows: waterRows, col: "water_usage_liters", key: "water" as const },
        { rows: elecRows, col: "electricity_usage_kwh", key: "electricity" as const },
        { rows: netRows, col: "internet_usage_gb", key: "internet" as const },
      ];

      // Totals today / yesterday
      const todayTotals = { water: 0, electricity: 0, internet: 0 };
      const yesterdayTotals = { water: 0, electricity: 0, internet: 0 };

      // Per-building today totals
      const perBuildingMap = new Map<string, BuildingTotals>();

      // Hourly buckets last 24h: keyed by hour-of-day "HH:00"
      const hourly: Record<string, HourlyPoint> = {};
      for (let h = 23; h >= 0; h--) {
        const d = new Date(now.getTime() - h * 3600 * 1000);
        const label = `${String(d.getHours()).padStart(2, "0")}:00`;
        hourly[label] = { hour: label, water: 0, electricity: 0, internet: 0 };
      }

      // Heatmap: per-building, per-day (last 7 days) — water-based
      const heatmapMap = new Map<string, HeatmapCell>();
      const days: { iso: string; label: string }[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = startOfDay(new Date(now.getTime() - i * 24 * 3600 * 1000));
        days.push({ iso: d.toISOString(), label: dayLabel(d) });
      }
      for (const b of BUILDINGS) {
        for (const day of days) {
          heatmapMap.set(`${b}|${day.iso}`, {
            building_id: b,
            day: day.label,
            date: day.iso,
            value: 0,
            hasAnomaly: false,
          });
        }
      }

      for (const { rows, col, key } of sources) {
        for (const row of rows) {
          const ts = new Date(row.timestamp);
          const val = Number(row[col] ?? 0);

          if (ts >= todayStart) {
            todayTotals[key] += val;
            const cur = perBuildingMap.get(row.building_id) ?? {
              building_id: row.building_id,
              water: 0,
              electricity: 0,
              internet: 0,
            };
            cur[key] += val;
            perBuildingMap.set(row.building_id, cur);
          } else if (ts >= yesterdayStart && ts < todayStart) {
            yesterdayTotals[key] += val;
          }

          if (ts >= last24Start) {
            const label = `${String(ts.getHours()).padStart(2, "0")}:00`;
            if (hourly[label]) hourly[label][key] += val;
          }

          // Heatmap (water only)
          if (key === "water" && ts >= sevenDayStart) {
            const dayKey = startOfDay(ts).toISOString();
            const cell = heatmapMap.get(`${row.building_id}|${dayKey}`);
            if (cell) {
              cell.value += val;
              if (row.anomaly_label && row.anomaly_label !== "normal") cell.hasAnomaly = true;
            }
          }
        }
      }

      const changePct = {
        water: pctChange(todayTotals.water, yesterdayTotals.water),
        electricity: pctChange(todayTotals.electricity, yesterdayTotals.electricity),
        internet: pctChange(todayTotals.internet, yesterdayTotals.internet),
      };

      const perBuilding: BuildingTotals[] = BUILDINGS.map(
        (b) =>
          perBuildingMap.get(b) ?? { building_id: b, water: 0, electricity: 0, internet: 0 },
      );

      const heatmap = Array.from(heatmapMap.values());
      const heatmapMax = Math.max(1, ...heatmap.map((c) => c.value));

      const hourly24 = Object.values(hourly).map((p) => ({
        hour: p.hour,
        water: round(p.water),
        electricity: round(p.electricity),
        internet: round(p.internet),
      }));

      return {
        todayTotals: {
          water: round(todayTotals.water),
          electricity: round(todayTotals.electricity),
          internet: round(todayTotals.internet),
        },
        changePct,
        hourly24,
        perBuilding,
        heatmap,
        heatmapMax,
        lastUpdated: new Date().toISOString(),
      };
    },
  });
}

function pctChange(today: number, yesterday: number) {
  if (!yesterday) return 0;
  return Math.round(((today - yesterday) / yesterday) * 100);
}
function round(n: number) {
  return Math.round(n * 100) / 100;
}