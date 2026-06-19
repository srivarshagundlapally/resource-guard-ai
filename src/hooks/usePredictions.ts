import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Prediction } from "@/types";

export function usePredictions(resource_type?: string, building_id?: string) {
  return useQuery({
    queryKey: ["predictions", resource_type, building_id],
    queryFn: async () => {
      let q = supabase.from("predictions").select("*").order("timestamp", { ascending: true }).limit(500);
      if (resource_type) q = q.eq("resource_type", resource_type);
      if (building_id) q = q.eq("building_id", building_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Prediction[];
    },
  });
}