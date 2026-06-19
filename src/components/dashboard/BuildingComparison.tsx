import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RESOURCE_COLORS, type BuildingTotals } from "@/hooks/useDashboardData";
import { DarkTooltip, GRID_STROKE, tickStyle } from "./chartTheme";

export function BuildingComparison({ data }: { data: BuildingTotals[] }) {
  return (
    <div className="h-[280px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="building_id" tick={tickStyle} stroke={GRID_STROKE} />
          <YAxis tick={tickStyle} stroke={GRID_STROKE} />
          <Tooltip content={<DarkTooltip />} cursor={{ fill: "#1E2F4540" }} />
          <Legend wrapperStyle={{ fontSize: 12, color: "#94A3B8", paddingTop: 8 }} iconType="circle" />
          <Bar dataKey="water" name="Water (L)" fill={RESOURCE_COLORS.water} radius={[4, 4, 0, 0]} />
          <Bar dataKey="electricity" name="Electricity (kWh)" fill={RESOURCE_COLORS.electricity} radius={[4, 4, 0, 0]} />
          <Bar dataKey="internet" name="Internet (GB)" fill={RESOURCE_COLORS.internet} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}