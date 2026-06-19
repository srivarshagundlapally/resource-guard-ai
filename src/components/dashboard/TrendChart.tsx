import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RESOURCE_COLORS, type HourlyPoint } from "@/hooks/useDashboardData";
import { DarkTooltip, GRID_STROKE, tickStyle } from "./chartTheme";

export function TrendChart({ data }: { data: HourlyPoint[] }) {
  return (
    <div className="h-[320px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -10, bottom: 0 }}>
          <defs>
            <linearGradient id="gWater" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={RESOURCE_COLORS.water} stopOpacity={0.6} />
              <stop offset="95%" stopColor={RESOURCE_COLORS.water} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gElec" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={RESOURCE_COLORS.electricity} stopOpacity={0.6} />
              <stop offset="95%" stopColor={RESOURCE_COLORS.electricity} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="gNet" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={RESOURCE_COLORS.internet} stopOpacity={0.6} />
              <stop offset="95%" stopColor={RESOURCE_COLORS.internet} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={GRID_STROKE} strokeDasharray="3 3" />
          <XAxis dataKey="hour" tick={tickStyle} stroke={GRID_STROKE} />
          <YAxis tick={tickStyle} stroke={GRID_STROKE} />
          <Tooltip content={<DarkTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#94A3B8", paddingTop: 8 }}
            iconType="circle"
          />
          <Area
            type="monotone"
            dataKey="water"
            name="Water (L)"
            stroke={RESOURCE_COLORS.water}
            strokeWidth={2}
            fill="url(#gWater)"
          />
          <Area
            type="monotone"
            dataKey="electricity"
            name="Electricity (kWh)"
            stroke={RESOURCE_COLORS.electricity}
            strokeWidth={2}
            fill="url(#gElec)"
          />
          <Area
            type="monotone"
            dataKey="internet"
            name="Internet (GB)"
            stroke={RESOURCE_COLORS.internet}
            strokeWidth={2}
            fill="url(#gNet)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}