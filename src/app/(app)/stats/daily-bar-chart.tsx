"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useChartTheme } from "./use-chart-theme";

function formatHours(seconds: number) {
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)} min`;
  return `${h.toFixed(1)}h`;
}

function TooltipContent({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length || !label) return null;
  const seconds = payload[0].value;
  return (
    <div className="rounded-[var(--radius-sm)] border border-border bg-surface px-2.5 py-1.5 text-xs shadow-lg">
      <p className="text-muted-foreground">{format(parseISO(label), "d 'de' MMM", { locale: ptBR })}</p>
      <p className="font-semibold text-foreground">{formatHours(seconds)}</p>
    </div>
  );
}

export function DailyBarChart({ data }: { data: { date: string; seconds: number }[] }) {
  const theme = useChartTheme();
  const skipEvery = Math.max(1, Math.ceil(data.length / 12));

  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={theme.border} strokeDasharray="0" />
        <XAxis
          dataKey="date"
          tickFormatter={(d: string) => format(parseISO(d), "d/M")}
          interval={skipEvery - 1}
          tick={{ fill: theme.mutedForeground, fontSize: 11 }}
          axisLine={{ stroke: theme.border }}
          tickLine={false}
        />
        <YAxis
          tickFormatter={(s: number) => (s === 0 ? "0" : `${Math.round(s / 3600)}h`)}
          tick={{ fill: theme.mutedForeground, fontSize: 11 }}
          axisLine={false}
          tickLine={false}
          width={32}
        />
        <Tooltip content={<TooltipContent />} cursor={{ fill: theme.border, opacity: 0.3 }} />
        <Bar dataKey="seconds" fill={theme.accent} radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  );
}
