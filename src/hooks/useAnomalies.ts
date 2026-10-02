import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { runDatabricksSql, withFallback, DBX_TABLES } from "@/lib/databricks";
import type { Anomaly, ResourceType, Severity } from "@/types";

export interface UseAnomaliesParams {
  resource_type?: ResourceType;
  severity?: Severity;
  limit?: number;
}

export function useAnomalies(params: UseAnomaliesParams = {}) {
  const { resource_type, severity, limit = 50 } = params;
  const safeLimit = Math.max(1, Math.min(1000, Math.floor(limit)));
  return useQuery({
    queryKey: ["anomalies", resource_type, severity, safeLimit],
    queryFn: () =>
      withFallback(
        async () => {
          const where: string[] = [];
          const p = [];
          if (resource_type) {
            where.push("resource_type = :rt");
            p.push({ name: "rt", value: resource_type });
          }
          if (severity) {
            where.push("severity = :sev");
            p.push({ name: "sev", value: severity });
          }
          const rows = await runDatabricksSql(
            `SELECT * FROM ${DBX_TABLES.anomalies} ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY timestamp DESC LIMIT ${safeLimit}`,
            p,
          );
          return rows as unknown as Anomaly[];
        },
        async () => {
          let q = supabase.from("anomalies").select("*").order("timestamp", { ascending: false }).limit(safeLimit);
          if (resource_type) q = q.eq("resource_type", resource_type);
          if (severity) q = q.eq("severity", severity);
          const { data, error } = await q;
          if (error) throw error;
          return (data ?? []) as unknown as Anomaly[];
        },
      ),
  });
}
