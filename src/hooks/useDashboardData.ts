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

interface RpcPayload {
  now: string;
  today: Partial<Record<"water" | "electricity" | "internet", number>>;
  yesterday: Partial<Record<"water" | "electricity" | "internet", number>>;
  hourly: Array<{ hour: string; water: number; electricity: number; internet: number }>;
  per_building: Array<{
    building_id: string;
    water: number;
    electricity: number;
    internet: number;
  }>;
  heatmap: Array<{
    building_id: string;
    date: string;
    value: number;
    has_anomaly: boolean;
  }>;
}

export function useDashboardData() {
  return useQuery<DashboardData>({
    queryKey: ["dashboard-data"],
    refetchInterval: 30_000,
    queryFn: async () => {
      // Aggregation happens in the database: the consumption tables hold
      // hundreds of thousands of rows, far beyond a client-side page fetch.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase.rpc as any)("get_dashboard_data");
      if (error) throw error;
      const p = (data ?? {}) as RpcPayload;
      const now = p.now ? new Date(p.now) : new Date();

      const todayTotals = {
        water: Number(p.today?.water ?? 0),
        electricity: Number(p.today?.electricity ?? 0),
        internet: Number(p.today?.internet ?? 0),
      };
      const yesterdayTotals = {
        water: Number(p.yesterday?.water ?? 0),
        electricity: Number(p.yesterday?.electricity ?? 0),
        internet: Number(p.yesterday?.internet ?? 0),
      };

      const hourMap = new Map<string, HourlyPoint>();
      for (let h = 23; h >= 0; h--) {
        const d = new Date(now.getTime() - h * 3600 * 1000);
        const label = `${String(d.getHours()).padStart(2, "0")}:00`;
        hourMap.set(label, { hour: label, water: 0, electricity: 0, internet: 0 });
      }
      for (const row of p.hourly ?? []) {
        const d = new Date(row.hour);
        const label = `${String(d.getHours()).padStart(2, "0")}:00`;
        const cur = hourMap.get(label);
        if (!cur) continue;
        cur.water += Number(row.water ?? 0);
        cur.electricity += Number(row.electricity ?? 0);
        cur.internet += Number(row.internet ?? 0);
      }
      const hourly24 = Array.from(hourMap.values()).map((x) => ({
        hour: x.hour,
        water: round(x.water),
        electricity: round(x.electricity),
        internet: round(x.internet),
      }));

      const pbMap = new Map(
        (p.per_building ?? []).map((b) => [
          b.building_id,
          {
            building_id: b.building_id,
            water: Number(b.water ?? 0),
            electricity: Number(b.electricity ?? 0),
            internet: Number(b.internet ?? 0),
          },
        ]),
      );
      const perBuilding: BuildingTotals[] = BUILDINGS.map(
        (b) => pbMap.get(b) ?? { building_id: b, water: 0, electricity: 0, internet: 0 },
      );

      const heatSrc = new Map(
        (p.heatmap ?? []).map((c) => [
          `${c.building_id}|${startOfDay(new Date(c.date)).toDateString()}`,
          c,
        ]),
      );
      const heatmap: HeatmapCell[] = [];
      for (const b of BUILDINGS) {
        for (let i = 6; i >= 0; i--) {
          const d = startOfDay(new Date(now.getTime() - i * 24 * 3600 * 1000));
          const hit = heatSrc.get(`${b}|${d.toDateString()}`);
          heatmap.push({
            building_id: b,
            day: dayLabel(d),
            date: d.toISOString(),
            value: round(Number(hit?.value ?? 0)),
            hasAnomaly: Boolean(hit?.has_anomaly),
          });
        }
      }
      const heatmapMax = Math.max(1, ...heatmap.map((c) => c.value));

      return {
        todayTotals: {
          water: round(todayTotals.water),
          electricity: round(todayTotals.electricity),
          internet: round(todayTotals.internet),
        },
        changePct: {
          water: pctChange(todayTotals.water, yesterdayTotals.water),
          electricity: pctChange(todayTotals.electricity, yesterdayTotals.electricity),
          internet: pctChange(todayTotals.internet, yesterdayTotals.internet),
        },
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