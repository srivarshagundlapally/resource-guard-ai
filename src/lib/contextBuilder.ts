import { supabase } from "@/integrations/supabase/client";

export async function buildRAGContext(query: string): Promise<string> {
  const sections: string[] = [];
  const q = query.toLowerCase();

  const { data: anomalies } = await supabase
    .from("anomalies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(5);

  if (anomalies?.length) {
    sections.push(
      "RECENT ANOMALIES:\n" +
        anomalies
          .map(
            (a) =>
              `- ${a.resource_type} anomaly in ${a.building_id} F${a.floor_no}/R${a.room_no}: ${a.description ?? a.anomaly_type} (severity: ${a.severity}, score: ${a.score})`,
          )
          .join("\n"),
    );
  }

  const { data: recs } = await supabase
    .from("recommendations")
    .select("*")
    .eq("status", "pending")
    .order("priority", { ascending: true })
    .limit(3);

  if (recs?.length) {
    sections.push(
      "PENDING RECOMMENDATIONS:\n" +
        recs
          .map(
            (r) =>
              `- [P${r.priority}] ${r.action} (saves ~${r.estimated_saving} ${r.saving_unit ?? ""})`,
          )
          .join("\n"),
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString();

  const fetchTotal = async (table: "water_consumption" | "electricity_consumption" | "internet_consumption", col: string) => {
    const { data } = await supabase
      .from(table)
      .select(`${col}, building_id`)
      .gte("timestamp", todayIso);
    if (!data?.length) return null;
    const totals: Record<string, number> = {};
    for (const row of data as Array<Record<string, unknown>>) {
      const b = String(row.building_id);
      totals[b] = (totals[b] ?? 0) + Number(row[col] ?? 0);
    }
    return totals;
  };

  if (q.includes("water")) {
    const t = await fetchTotal("water_consumption", "litres");
    if (t)
      sections.push(
        "WATER USAGE TODAY (litres):\n" +
          Object.entries(t).map(([b, v]) => `- ${b}: ${v.toFixed(1)}`).join("\n"),
      );
  }
  if (q.includes("electric") || q.includes("power") || q.includes("energy")) {
    const t = await fetchTotal("electricity_consumption", "kwh");
    if (t)
      sections.push(
        "ELECTRICITY USAGE TODAY (kWh):\n" +
          Object.entries(t).map(([b, v]) => `- ${b}: ${v.toFixed(2)}`).join("\n"),
      );
  }
  if (q.includes("internet") || q.includes("network") || q.includes("bandwidth")) {
    const t = await fetchTotal("internet_consumption", "gb");
    if (t)
      sections.push(
        "INTERNET USAGE TODAY (GB):\n" +
          Object.entries(t).map(([b, v]) => `- ${b}: ${v.toFixed(2)}`).join("\n"),
      );
  }

  return sections.join("\n\n") || "(no recent data available)";
}