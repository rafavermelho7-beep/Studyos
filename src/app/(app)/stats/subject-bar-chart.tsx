"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { useChartTheme } from "./use-chart-theme";

function formatHours(seconds: number) {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)} min`;
  return `${h.toFixed(1)}h`;
}

type Row = { name: string; color: string; seconds: number };

function TooltipContent({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-muted-foreground">{row.name}</p>
      <p className="font-semibold text-foreground">{formatHours(row.seconds)}</p>
    </div>
  );
}

export function SubjectBarChart({ data }: { data: Row[] }) {
  const theme = useChartTheme();
  const height = Math.max(120, data.length * 36);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke={theme.border} />
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tick={{ fill: theme.mutedForeground, fontSize: 12 }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: theme.border, opacity: 0.3 }} />
        <Bar dataKey="seconds" radius={[0, 4, 4, 0]} maxBarSize={20}>
          {data.map((row) => (
            <Cell key={row.name} fill={row.color} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
