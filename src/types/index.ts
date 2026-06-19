export interface Building {
  id: number;
  building_id: string;
  name: string | null;
  address: string | null;
  total_floors: number | null;
  created_at: string;
}

export interface WaterConsumption {
  id: number;
  timestamp: string;
  building_id: string;
  floor_no: number;
  room_no: number;
  water_usage_liters: number;
  anomaly_label: string;
  created_at: string;
}

export interface ElectricityConsumption {
  id: number;
  timestamp: string;
  building_id: string;
  floor_no: number;
  room_no: number;
  electricity_usage_kwh: number;
  anomaly_label: string;
  created_at: string;
}

export interface InternetConsumption {
  id: number;
  timestamp: string;
  building_id: string;
  floor_no: number;
  room_no: number;
  internet_usage_gb: number;
  anomaly_label: string;
  created_at: string;
}

export type ResourceType = "water" | "electricity" | "internet";
export type Severity = "critical" | "high" | "medium" | "low";

export interface Anomaly {
  id: string;
  resource_type: ResourceType;
  timestamp: string;
  building_id: string;
  floor_no: number;
  room_no: number;
  anomaly_type: string;
  severity: Severity;
  score: number | null;
  description: string | null;
  is_resolved: boolean;
  resolved_at: string | null;
  created_at: string;
}

export interface RootCause {
  id: string;
  anomaly_id: string;
  cause: string;
  confidence_score: number;
  description: string | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  resource_type: string;
  timestamp: string;
  building_id: string;
  floor_no: number | null;
  room_no: number | null;
  predicted_value: number;
  actual_value: number | null;
  model_name: string | null;
  rmse: number | null;
  mae: number | null;
  r2_score: number | null;
  created_at: string;
}

export interface Recommendation {
  id: string;
  anomaly_id: string | null;
  resource_type: string;
  building_id: string;
  floor_no: number | null;
  room_no: number | null;
  action: string;
  severity: string;
  priority: number;
  estimated_saving: number | null;
  saving_unit: string | null;
  status: string;
  created_at: string;
}

export interface Report {
  id: string;
  report_type: string;
  resource_type: string | null;
  period_start: string;
  period_end: string;
  content: Record<string, unknown>;
  vector_id: string | null;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string | null;
  created_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}