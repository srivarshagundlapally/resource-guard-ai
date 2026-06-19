import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Building } from "@/types";

export function useBuildings() {
  return useQuery({
    queryKey: ["buildings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("buildings")
        .select("*")
        .order("building_id");
      if (error) throw error;
      return (data ?? []) as unknown as Building[];
    },
  });
}