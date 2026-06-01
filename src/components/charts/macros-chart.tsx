"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import type { Macros } from "@/types";

interface Props {
  macros: Macros;
  labels: { proteines: string; glucides: string; lipides: string };
}

const COLORS = ["#0F4C81", "#2E8B57", "#F59E0B"];

export function MacrosChart({ macros, labels }: Props) {
  const data = [
    { name: labels.proteines, value: macros.proteines },
    { name: labels.glucides, value: macros.glucides },
    { name: labels.lipides, value: macros.lipides },
  ];

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={85}
          paddingAngle={3}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={COLORS[i]} />
          ))}
        </Pie>
        <Tooltip formatter={(v: number) => [`${v} g`, ""]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
