"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { macroPercents } from "@/lib/utils";
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

  const pct = macroPercents(macros);
  const rows = [
    { label: labels.proteines, g: macros.proteines, p: pct.proteines, color: COLORS[0] },
    { label: labels.glucides, g: macros.glucides, p: pct.glucides, color: COLORS[1] },
    { label: labels.lipides, g: macros.lipides, p: pct.lipides, color: COLORS[2] },
  ];
  const kcalTotal = pct.kcal;

  return (
    <div>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={3}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={COLORS[i]} />
            ))}
          </Pie>
          <Tooltip formatter={(v: number) => [`${v} g`, ""]} contentStyle={{ borderRadius: 8, fontSize: 13 }} />
        </PieChart>
      </ResponsiveContainer>

      {/* Répartition détaillée : grammes + pourcentage */}
      <div className="mt-2 space-y-1.5">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
              {r.label}
            </span>
            <span className="font-medium text-foreground">
              {r.g} g <span className="text-muted-foreground">· {r.p} %</span>
            </span>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-border pt-1.5 text-sm font-semibold">
          <span>Total</span>
          <span>{Math.round(kcalTotal)} kcal</span>
        </div>
      </div>
    </div>
  );
}
