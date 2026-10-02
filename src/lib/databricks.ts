import { supabase } from "@/integrations/supabase/client";

export const DATABRICKS_WAREHOUSE_ID = "0797d78e8be6eac3";
export const DBX_TABLES = {
  metrics: "workspace.default.campus_metrics",
  anomalies: "workspace.default.anomalies",
  predictions: "workspace.default.predictions",
} as const;

export interface DbxParam {
  name: string;
  value: string | null;
  type?: string;
}

/** Runs a SQL statement via the app's /api/databricks proxy and returns rows as objects. */
export async function runDatabricksSql<T = Record<string, unknown>>(
  statement: string,
  parameters: DbxParam[] = [],
  warehouseId = DATABRICKS_WAREHOUSE_ID,
): Promise<T[]> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  const res = await fetch("/api/databricks/2.0/sql/statements", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({
      warehouse_id: warehouseId,
      statement,
      wait_timeout: "30s",
      format: "JSON_ARRAY",
      disposition: "INLINE",
      ...(parameters.length ? { parameters } : {}),
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`Databricks query failed [${res.status}]: ${body}`);
    throw new Error(`Databricks query failed [${res.status}]`);
  }
  const json = await res.json();
  if (json?.status?.state !== "SUCCEEDED") {
    const msg = json?.status?.error?.message ?? json?.status?.state ?? "unknown";
    console.error("Databricks statement error:", msg);
    throw new Error(`Databricks statement ${msg}`);
  }
  const cols: Array<{ name: string; type_name: string }> = json.manifest?.schema?.columns ?? [];
  const rows: Array<Array<string | null>> = json.result?.data_array ?? [];
  const numeric = new Set(["INT", "BIGINT", "DOUBLE", "FLOAT", "DECIMAL", "LONG", "SHORT"]);
  return rows.map((r) => {
    const o: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      const v = r[i];
      if (v === null || v === undefined) o[c.name] = null;
      else if (numeric.has(c.type_name)) o[c.name] = Number(v);
      else if (c.type_name === "BOOLEAN") o[c.name] = v === "true";
      else o[c.name] = v;
    });
    return o as T;
  });
}

/** Try Databricks first; on any failure log and fall back. */
export async function withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch (e) {
    console.warn("Databricks unavailable, falling back to backend database:", e);
    return fallback();
  }
}
