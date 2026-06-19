import { supabase } from "@/integrations/supabase/client";

const BUILDINGS = ["BLK-A", "BLK-B", "BLK-C", "BLK-D"];
const FLOORS = [1, 2, 3, 4];
const ROOMS = [1, 2, 3, 4, 5];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

export interface SeedProgress {
  step: string;
  done: number;
  total: number;
}

export async function seedSyntheticData(onProgress?: (p: SeedProgress) => void) {
  const steps = 7;
  let stepIdx = 0;
  const tick = (step: string) => onProgress?.({ step, done: ++stepIdx, total: steps });

  // 1. Ensure rooms exist
  tick("Seeding rooms");
  const roomRows: Array<{ building_id: string; floor_no: number; room_no: number; room_type: string; capacity: number }> = [];
  for (const b of BUILDINGS) for (const f of FLOORS) for (const r of ROOMS) {
    roomRows.push({ building_id: b, floor_no: f, room_no: r, room_type: pick(["classroom","lab","office","dorm","common"]), capacity: Math.floor(rand(10, 60)) });
  }
  await supabase.from("rooms").upsert(roomRows, { onConflict: "building_id,floor_no,room_no" });

  // 2. Hourly consumption for 7 days
  tick("Generating 7 days of consumption (water / electricity / internet)");
  const water: Array<{ timestamp: string; building_id: string; floor_no: number; room_no: number; water_usage_liters: number; anomaly_label: string }> = [];
  const elec: Array<{ timestamp: string; building_id: string; floor_no: number; room_no: number; electricity_usage_kwh: number; anomaly_label: string }> = [];
  const net: Array<{ timestamp: string; building_id: string; floor_no: number; room_no: number; internet_usage_gb: number; anomaly_label: string }> = [];

  const now = Date.now();
  for (let h = 24 * 7; h >= 0; h--) {
    const ts = new Date(now - h * 3600 * 1000).toISOString();
    const hourOfDay = new Date(ts).getUTCHours();
    const dayFactor = hourOfDay >= 8 && hourOfDay <= 20 ? 1.5 : 0.6;
    for (const b of BUILDINGS) for (const f of FLOORS) for (const r of ROOMS) {
      const anomalous = Math.random() < 0.005;
      const label = anomalous ? "anomaly" : "normal";
      water.push({ timestamp: ts, building_id: b, floor_no: f, room_no: r, water_usage_liters: Number((rand(5, 25) * dayFactor * (anomalous ? 4 : 1)).toFixed(3)), anomaly_label: label });
      elec.push({ timestamp: ts, building_id: b, floor_no: f, room_no: r, electricity_usage_kwh: Number((rand(0.5, 4) * dayFactor * (anomalous ? 3 : 1)).toFixed(4)), anomaly_label: label });
      net.push({ timestamp: ts, building_id: b, floor_no: f, room_no: r, internet_usage_gb: Number((rand(0.05, 1.2) * dayFactor * (anomalous ? 5 : 1)).toFixed(4)), anomaly_label: label });
    }
  }

  tick("Inserting water readings");
  await chunkInsert("water_consumption", water);
  tick("Inserting electricity readings");
  await chunkInsert("electricity_consumption", elec);
  tick("Inserting internet readings");
  await chunkInsert("internet_consumption", net);

  // 5. Anomalies (20 total, severity mix)
  tick("Inserting anomalies, root causes & recommendations");
  const severityPlan: Array<"critical"|"high"|"medium"|"low"> = [
    ...Array(2).fill("critical"),
    ...Array(5).fill("high"),
    ...Array(8).fill("medium"),
    ...Array(5).fill("low"),
  ];
  const resourceTypes = ["water", "electricity", "internet"] as const;
  const anomalyRows = severityPlan.map((sev, i) => {
    const rt = resourceTypes[i % 3];
    return {
      resource_type: rt,
      timestamp: new Date(now - rand(0, 24 * 7) * 3600 * 1000).toISOString(),
      building_id: pick(BUILDINGS),
      floor_no: pick(FLOORS),
      room_no: pick(ROOMS),
      anomaly_type: pick(["leak", "spike", "continuous_usage", "off_hours_usage", "sensor_drift"]),
      severity: sev,
      score: Number(rand(0.6, 0.99).toFixed(4)),
      description: `Detected ${sev} ${rt} anomaly in room ${pick(FLOORS)}-${pick(ROOMS)}`,
      is_resolved: Math.random() < 0.2,
    };
  });

  const { data: insertedAnoms, error: anomErr } = await supabase
    .from("anomalies")
    .insert(anomalyRows)
    .select("id, resource_type, building_id, floor_no, room_no, severity");
  if (anomErr) throw anomErr;

  // Root causes (2-3 per anomaly)
  const rcaRows: Array<{ anomaly_id: string; cause: string; confidence_score: number; description: string }> = [];
  const causes = ["Faulty valve", "Pipe leak", "Idle device left on", "HVAC malfunction", "Unauthorized usage", "Sensor calibration drift", "Background sync process"];
  for (const a of insertedAnoms ?? []) {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      rcaRows.push({ anomaly_id: a.id, cause: pick(causes), confidence_score: Number(rand(0.5, 0.97).toFixed(4)), description: "Probable root cause inferred from pattern analysis." });
    }
  }
  await supabase.from("root_cause_analysis").insert(rcaRows);

  // 10 recommendations
  const recRows = (insertedAnoms ?? []).slice(0, 10).map((a, i) => ({
    anomaly_id: a.id,
    resource_type: a.resource_type,
    building_id: a.building_id,
    floor_no: a.floor_no,
    room_no: a.room_no,
    action: pick(["Inspect plumbing", "Replace sensor", "Audit device usage", "Schedule maintenance", "Notify facilities team"]),
    severity: a.severity,
    priority: i + 1,
    estimated_saving: Number(rand(5, 200).toFixed(3)),
    saving_unit: a.resource_type === "water" ? "L" : a.resource_type === "electricity" ? "kWh" : "GB",
    status: "pending",
  }));
  await supabase.from("recommendations").insert(recRows);

  // 6. Reports
  tick("Inserting reports");
  await supabase.from("reports").insert([
    {
      report_type: "daily",
      resource_type: null,
      period_start: new Date(now - 24 * 3600 * 1000).toISOString(),
      period_end: new Date(now).toISOString(),
      content: { summary: "Daily campus consumption summary", anomalies_detected: 4, top_building: "BLK-B", total_water_l: 18420, total_electricity_kwh: 2210, total_internet_gb: 532 },
    },
    {
      report_type: "weekly",
      resource_type: null,
      period_start: new Date(now - 7 * 24 * 3600 * 1000).toISOString(),
      period_end: new Date(now).toISOString(),
      content: { summary: "Weekly campus consumption summary", anomalies_detected: 20, savings_recommended_l: 1200, savings_recommended_kwh: 340 },
    },
  ]);

  // 7. Model registry
  tick("Registering ML models");
  const models: Array<{ model_name: string; resource_type: string; task: string; version: string; rmse: number; mae: number; r2_score: number; is_active: boolean; trained_at: string }> = [];
  for (const rt of resourceTypes) for (const name of ["RandomForest", "XGBoost", "GradientBoosting"]) {
    models.push({ model_name: name, resource_type: rt, task: "forecast", version: "1.0.0", rmse: Number(rand(0.1, 0.6).toFixed(4)), mae: Number(rand(0.05, 0.4).toFixed(4)), r2_score: Number(rand(0.78, 0.96).toFixed(4)), is_active: name === "XGBoost", trained_at: new Date(now - 24 * 3600 * 1000).toISOString() });
  }
  await supabase.from("model_registry").insert(models);

  return { rooms: roomRows.length, water: water.length, electricity: elec.length, internet: net.length, anomalies: anomalyRows.length, recommendations: recRows.length };
}

async function chunkInsert<T extends Record<string, unknown>>(table: "water_consumption" | "electricity_consumption" | "internet_consumption", rows: T[]) {
  const SIZE = 500;
  for (let i = 0; i < rows.length; i += SIZE) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(table) as any).insert(rows.slice(i, i + SIZE));
    if (error) throw error;
  }
}