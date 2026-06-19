import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { RESOURCE_COLORS } from "@/hooks/useDashboardData";
import { DarkTooltip } from "./chartTheme";

interface Props {
  totals: { water: number; electricity: number; internet: number };
}

export function ResourcePie({ totals }: Props) {
  const sum = totals.water + totals.electricity + totals.internet || 1;
  const data = [
    { name: "Water", value: totals.water, color: RESOURCE_COLORS.water, unit: "L" },
    { name: "Electricity", value: totals.electricity, color: RESOURCE_COLORS.electricity, unit: "kWh" },
    { name: "Internet", value: totals.internet, color: RESOURCE_COLORS.internet, unit: "GB" },
  ];

  return (
    <div>
      <div className="h-[200px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip content={<DarkTooltip />} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-3 space-y-1.5">
        {data.map((d) => {
          const pct = Math.round((d.value / sum) * 100);
          return (
            <li key={d.name} className="flex items-center gap-2 text-xs">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-slate-300">{d.name}</span>
              <span className="ml-auto font-semibold text-slate-100">{pct}%</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}