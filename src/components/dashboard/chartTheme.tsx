import type { TooltipProps } from "recharts";

export const GRID_STROKE = "#1E2F45";
export const TICK_COLOR = "#94A3B8";
export const TOOLTIP_BG = "#162032";
export const TOOLTIP_BORDER = "#1E2F45";

export const tooltipStyle: React.CSSProperties = {
  backgroundColor: TOOLTIP_BG,
  border: `1px solid ${TOOLTIP_BORDER}`,
  borderRadius: 8,
  color: "#E2E8F0",
  fontSize: 12,
  padding: "8px 10px",
};

export const tickStyle = { fill: TICK_COLOR, fontSize: 11 };

export function DarkTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      {label !== undefined && (
        <div className="mb-1 text-[11px] font-semibold text-slate-300">{String(label)}</div>
      )}
      <ul className="space-y-0.5">
        {payload.map((p) => (
          <li key={String(p.dataKey)} className="flex items-center gap-2">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ backgroundColor: p.color }}
            />
            <span className="text-slate-400">{p.name}</span>
            <span className="ml-auto font-medium text-slate-100">
              {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}