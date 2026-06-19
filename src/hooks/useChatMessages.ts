import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ChatMessage } from "@/types";

export function useChatMessages(session_id: string | null | undefined) {
  return useQuery({
    queryKey: ["chat_messages", session_id],
    enabled: !!session_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("session_id", session_id!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ChatMessage[];
    },
  });
}