import type { HeatmapCell } from "@/hooks/useDashboardData";

function lerp(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t);
}
function hexToRgb(h: string) {
  const x = h.replace("#", "");
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)] as const;
}
function rgb(arr: readonly [number, number, number]) {
  return `rgb(${arr[0]}, ${arr[1]}, ${arr[2]})`;
}

function colorFor(value: number, max: number, hasAnomaly: boolean) {
  if (hasAnomaly) return "#E74C3C";
  const t = Math.min(1, value / max);
  const low = hexToRgb("#1E2F45");
  const mid = hexToRgb("#1B6CA8");
  const high = hexToRgb("#00C9A7");
  if (t < 0.5) {
    const k = t / 0.5;
    return rgb([lerp(low[0], mid[0], k), lerp(low[1], mid[1], k), lerp(low[2], mid[2], k)]);
  }
  const k = (t - 0.5) / 0.5;
  return rgb([lerp(mid[0], high[0], k), lerp(mid[1], high[1], k), lerp(mid[2], high[2], k)]);
}

interface Props {
  cells: HeatmapCell[];
  max: number;
  buildings: string[];
}

export function Heatmap({ cells, max, buildings }: Props) {
  // Group cells by building, in display order
  const byBuilding = new Map<string, HeatmapCell[]>();
  for (const b of buildings) byBuilding.set(b, []);
  for (const c of cells) {
    byBuilding.get(c.building_id)?.push(c);
  }
  // Day labels (from first building's row, assumed already ordered by date)
  const firstRow = byBuilding.get(buildings[0]) ?? [];
  const dayLabels = firstRow.map((c) => c.day);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          <div className="grid" style={{ gridTemplateColumns: `80px repeat(${dayLabels.length}, minmax(56px, 1fr))` }}>
            <div />
            {dayLabels.map((d, i) => (
              <div key={i} className="px-1 pb-2 text-center text-[11px] font-medium text-slate-400">
                {d}
              </div>
            ))}
            {buildings.map((b) => (
              <Row key={b} building={b} cells={byBuilding.get(b) ?? []} max={max} />
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center gap-3">
        <span className="text-[11px] text-slate-400">Low</span>
        <div
          className="h-2 w-40 rounded-full"
          style={{
            background: "linear-gradient(to right, #1E2F45, #1B6CA8, #00C9A7)",
          }}
        />
        <span className="text-[11px] text-slate-400">High</span>
        <span className="ml-3 inline-flex items-center gap-1.5 text-[11px] text-slate-400">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: "#E74C3C" }} />
          Anomaly
        </span>
      </div>
    </div>
  );
}

function Row({ building, cells, max }: { building: string; cells: HeatmapCell[]; max: number }) {
  return (
    <>
      <div className="flex items-center pr-2 text-[11px] font-semibold text-slate-300">{building}</div>
      {cells.map((c) => (
        <div key={`${c.building_id}-${c.date}`} className="px-0.5 py-0.5">
          <div
            title={`${c.building_id} | ${c.day} | ${Math.round(c.value)} L`}
            className="h-9 w-full cursor-help rounded-md transition-transform hover:scale-105"
            style={{ background: colorFor(c.value, max, c.hasAnomaly) }}
          />
        </div>
      ))}
    </>
  );
}