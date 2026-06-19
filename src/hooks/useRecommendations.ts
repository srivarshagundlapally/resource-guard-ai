import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Recommendation } from "@/types";

export function useRecommendations() {
  return useQuery({
    queryKey: ["recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recommendations")
        .select("*")
        .order("priority", { ascending: true })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as Recommendation[];
    },
  });
}