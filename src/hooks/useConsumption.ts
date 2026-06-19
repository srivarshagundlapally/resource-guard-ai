import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ResourceType } from "@/types";

const RESOURCE_TABLE: Record<ResourceType, { table: string; col: string }> = {
  water: { table: "water_consumption", col: "water_usage_liters" },
  electricity: { table: "electricity_consumption", col: "electricity_usage_kwh" },
  internet: { table: "internet_consumption", col: "internet_usage_gb" },
};

export interface HourlyPoint {
  hour: string;
  total: number;
}

export function useConsumption(resource: ResourceType, building_id?: string) {
  const { table, col } = RESOURCE_TABLE[resource];
  return useQuery({
    queryKey: ["consumption", resource, building_id],
    queryFn: async () => {
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      // Supabase generated types don't yet include these tables — cast through any.
      const client = supabase as unknown as {
        from: (t: string) => {
          select: (cols: string) => {
            gte: (col: string, v: string) => {
              eq: (col: string, v: string) => Promise<{ data: unknown; error: { message: string } | null }>;
            } & Promise<{ data: unknown; error: { message: string } | null }>;
          };
        };
      };
      const base = client.from(table).select(`timestamp, ${col}, building_id`).gte("timestamp", since);
      const { data, error } = building_id ? await base.eq("building_id", building_id) : await base;
      if (error) throw error;
      const buckets = new Map<string, number>();
      for (const row of ((data ?? []) as unknown as Array<Record<string, unknown>>)) {
        const ts = new Date(row.timestamp as string);
        ts.setMinutes(0, 0, 0);
        const key = ts.toISOString();
        const val = Number(row[col] ?? 0);
        buckets.set(key, (buckets.get(key) ?? 0) + val);
      }
      const points: HourlyPoint[] = Array.from(buckets.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([hour, total]) => ({ hour, total: Number(total.toFixed(3)) }));
      return points;
    },
  });
}