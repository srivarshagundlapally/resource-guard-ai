export type PredictionResource = "water" | "electricity" | "internet";

export interface PredictionPoint {
  timestamp: string;
  predicted_value: number;
  lower_bound: number;
  upper_bound: number;
}

const patterns: Record<PredictionResource, number[]> = {
  water: [
    0.1, 0.08, 0.07, 0.07, 0.08, 0.2, 0.9, 1.0, 0.8, 0.5, 0.4, 0.4, 0.5, 0.5,
    0.4, 0.4, 0.5, 0.7, 0.9, 1.0, 0.8, 0.6, 0.3, 0.15,
  ],
  electricity: [
    0.2, 0.15, 0.15, 0.15, 0.2, 0.3, 0.5, 0.8, 1.0, 1.0, 0.95, 0.95, 0.9, 0.95,
    1.0, 0.95, 0.8, 0.7, 0.5, 0.4, 0.35, 0.3, 0.25, 0.2,
  ],
  internet: [
    0.3, 0.2, 0.15, 0.15, 0.2, 0.3, 0.5, 0.7, 0.8, 0.85, 1.0, 0.9, 0.8, 0.75,
    0.85, 0.75, 0.7, 0.65, 0.6, 0.7, 0.8, 0.95, 1.0, 0.7,
  ],
};

const baseValues: Record<PredictionResource, number> = {
  water: 25,
  electricity: 1.2,
  internet: 0.6,
};

const modelNoise: Record<string, number> = {
  XGBoost: 0.05,
  "Random Forest": 0.08,
  "Gradient Boosting": 0.07,
};

export function generatePredictions(
  resource: PredictionResource,
  _building: string,
  horizonHours: number,
  model: string,
): PredictionPoint[] {
  const now = new Date();
  const results: PredictionPoint[] = [];
  const noiseAmp = modelNoise[model] ?? 0.07;
  const base = baseValues[resource];
  const pattern = patterns[resource];

  for (let i = 0; i < horizonHours; i++) {
    const ts = new Date(now.getTime() + i * 3600000);
    const hour = ts.getHours();
    const isWeekend = [0, 6].includes(ts.getDay());
    const p = pattern[hour];
    const weekendFactor = isWeekend ? 0.4 : 1.0;
    const noise = (Math.random() - 0.5) * 2 * noiseAmp;
    const value = Math.max(0, base * p * weekendFactor * (1 + noise));
    const uncertainty = value * 0.15;
    results.push({
      timestamp: ts.toISOString(),
      predicted_value: parseFloat(value.toFixed(4)),
      lower_bound: parseFloat(Math.max(0, value - uncertainty).toFixed(4)),
      upper_bound: parseFloat((value + uncertainty).toFixed(4)),
    });
  }
  return results;
}

export const RESOURCE_UNITS: Record<PredictionResource, string> = {
  water: "L",
  electricity: "kWh",
  internet: "GB",
};

export const RESOURCE_COLORS: Record<PredictionResource, string> = {
  water: "#1B6CA8",
  electricity: "#F5A623",
  internet: "#00C9A7",
};

export const MODEL_METRICS: Record<
  string,
  { rmse: number; mae: number; r2: number }
> = {
  XGBoost: { rmse: 3.76, mae: 2.54, r2: 0.951 },
  "Gradient Boosting": { rmse: 4.05, mae: 2.71, r2: 0.941 },
  "Random Forest": { rmse: 4.21, mae: 2.87, r2: 0.934 },
};