"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeightProjectionPoint } from "@/types";

interface Props {
  data: WeightProjectionPoint[];
  poidsCible: number;
}

export function WeightProjectionChart({ data, poidsCible }: Props) {
  const chartData = data.map((d) => ({
    name: d.mois === 0 ? "Aujourd'hui" : `${d.mois} mois`,
    poids: d.poids,
    cible: poidsCible,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
        <defs>
          <linearGradient id="poidsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0F4C81" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#0F4C81" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 12, fill: "#64748B" }} tickLine={false} axisLine={false} />
        <YAxis
          tick={{ fontSize: 12, fill: "#64748B" }}
          tickLine={false}
          axisLine={false}
          domain={["dataMin - 3", "dataMax + 3"]}
          unit=" kg"
          width={56}
        />
        <Tooltip
          contentStyle={{ borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13 }}
          formatter={(v: number) => [`${v} kg`, "Poids"]}
        />
        <Area
          type="monotone"
          dataKey="poids"
          stroke="#0F4C81"
          strokeWidth={2.5}
          fill="url(#poidsGrad)"
          dot={{ r: 4, fill: "#0F4C81" }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
