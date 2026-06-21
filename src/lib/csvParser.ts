import Papa from "papaparse";
import { supabase } from "@/integrations/supabase/client";

export type ResourceKind = "water" | "electricity" | "internet";

const USAGE_COL: Record<ResourceKind, string> = {
  water: "water_usage_liters",
  electricity: "electricity_usage_kwh",
  internet: "internet_usage_gb",
};

export async function parseAndInsertCSV(
  file: File,
  resource: ResourceKind,
  onProgress: (pct: number, msg: string) => void,
): Promise<{ inserted: number; errors: number }> {
  onProgress(5, "Parsing CSV file…");

  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, unknown>>(file, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const rows = results.data;
          if (!rows.length) {
            reject(new Error("CSV is empty"));
            return;
          }
          onProgress(20, `Validating ${rows.length.toLocaleString()} rows…`);

          const usageCol = USAGE_COL[resource];
          const required = ["timestamp", "building_id", "floor_no", "room_no", usageCol];
          const headerKeys = Object.keys(rows[0] ?? {});
          const missing = required.filter((c) => !headerKeys.includes(c));
          if (missing.length) {
            reject(new Error(`Missing columns: ${missing.join(", ")}`));
            return;
          }

          const cleaned = rows
            .filter((r) => r[usageCol] !== null && r[usageCol] !== undefined)
            .map((r) => ({
              timestamp: new Date(String(r.timestamp)).toISOString(),
              building_id: String(r.building_id),
              floor_no: parseInt(String(r.floor_no), 10),
              room_no: parseInt(String(r.room_no), 10),
              [usageCol]: Math.max(0, parseFloat(String(r[usageCol]))),
              anomaly_label: (r.anomaly_label as string) || "normal",
            }));

          onProgress(40, `Inserting ${cleaned.length.toLocaleString()} records…`);

          const table = `${resource}_consumption` as
            | "water_consumption"
            | "electricity_consumption"
            | "internet_consumption";
          const BATCH = 500;
          let inserted = 0;
          const totalBatches = Math.max(1, Math.ceil(cleaned.length / BATCH));

          for (let i = 0; i < cleaned.length; i += BATCH) {
            const batch = cleaned.slice(i, i + BATCH);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (supabase as any).from(table).insert(batch);
            if (error) console.error("Insert error:", error);
            else inserted += batch.length;
            const batchNum = Math.ceil((i + BATCH) / BATCH);
            onProgress(
              Math.min(95, 40 + 55 * ((i + BATCH) / cleaned.length)),
              `Inserting batch ${batchNum}/${totalBatches}…`,
            );
          }

          onProgress(100, `✓ Inserted ${inserted.toLocaleString()} records`);
          resolve({ inserted, errors: cleaned.length - inserted });
        } catch (e) {
          reject(e as Error);
        }
      },
      error: (err) => reject(err),
    });
  });
}