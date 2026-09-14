"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { useChartTheme } from "../../stats/use-chart-theme";

type Point = { day: number; current: number; previous: number | null };

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; dataKey: string }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const current = payload.find((p) => p.dataKey === "current");
  const previous = payload.find((p) => p.dataKey === "previous");
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-muted-foreground">Dia {label}</p>
      {current && <p className="font-semibold text-foreground">Com a revisão: {Math.round(current.value * 100)}%</p>}
      {previous && (
        <p className="text-muted-foreground">Sem ela: {Math.round(previous.value * 100)}%</p>
      )}
    </div>
  );
}

export function ForgettingCurveChart({
  current,
  previous,
  todayOffset,
}: {
  current: { day: number; retention: number }[];
  previous: { day: number; retention: number }[] | null;
  todayOffset: number;
}) {
  const theme = useChartTheme();
  const data: Point[] = current.map((p, i) => ({
    day: p.day,
    current: p.retention,
    previous: previous ? previous[i].retention : null,
  }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.border} />
        <XAxis
          dataKey="day"
          tick={{ fill: theme.mutedForeground, fontSize: 11 }}
          axisLine={{ stroke: theme.border }}
          tickLine={false}
          label={{ value: "dias desde a última revisão", position: "insideBottom", offset: -2, fontSize: 11, fill: theme.mutedForeground }}
        />
        <YAxis
          domain={[0, 1]}
          tickFormatter={(v: number) => `${Math.round(v * 100)}%`}
          tick={{ fill: theme.mutedForeground, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={36}
        />
        <Tooltip content={<TooltipContent />} />
        {todayOffset >= 0 && todayOffset <= (data[data.length - 1]?.day ?? 0) && (
          <ReferenceLine x={todayOffset} stroke={theme.mutedForeground} strokeDasharray="3 3" label={{ value: "hoje", position: "top", fontSize: 11, fill: theme.mutedForeground }} />
        )}
        {previous && (
          <Line
            type="monotone"
            dataKey="previous"
            stroke={theme.mutedForeground}
            strokeWidth={2}
            strokeDasharray="4 3"
            dot={false}
          />
        )}
        <Line type="monotone" dataKey="current" stroke={theme.accent} strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
