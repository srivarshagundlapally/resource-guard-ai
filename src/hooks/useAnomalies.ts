import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Anomaly, ResourceType, Severity } from "@/types";

export interface UseAnomaliesParams {
  resource_type?: ResourceType;
  severity?: Severity;
  limit?: number;
}

export function useAnomalies(params: UseAnomaliesParams = {}) {
  const { resource_type, severity, limit = 50 } = params;
  return useQuery({
    queryKey: ["anomalies", resource_type, severity, limit],
    queryFn: async () => {
      let q = supabase.from("anomalies").select("*").order("timestamp", { ascending: false }).limit(limit);
      if (resource_type) q = q.eq("resource_type", resource_type);
      if (severity) q = q.eq("severity", severity);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Anomaly[];
    },
  });
}