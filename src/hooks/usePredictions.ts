import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runDatabricksSql, withFallback, DBX_TABLES } from "@/lib/databricks";
import type { Prediction } from "@/types";

export function usePredictions(resource_type?: string, building_id?: string) {
  return useQuery({
    queryKey: ["predictions", resource_type, building_id],
    queryFn: () =>
      withFallback(
        async () => {
          const where: string[] = [];
          const p = [];
          if (resource_type) {
            where.push("resource_type = :rt");
            p.push({ name: "rt", value: resource_type });
          }
          if (building_id) {
            where.push("building_id = :b");
            p.push({ name: "b", value: building_id });
          }
          const rows = await runDatabricksSql(
            `SELECT * FROM ${DBX_TABLES.predictions} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY timestamp ASC LIMIT 500`,
            p,
          );
          return rows as unknown as Prediction[];
        },
        async () => {
          let q = supabase.from("predictions").select("*").order("timestamp", { ascending: true }).limit(500);
          if (resource_type) q = q.eq("resource_type", resource_type);
          if (building_id) q = q.eq("building_id", building_id);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []) as unknown as Prediction[];
        },
      ),
  });
}
