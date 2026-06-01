"use client";

import { cn } from "@/lib/utils";

interface Props {
  imc: number;
  category: string;
}

/** Jauge IMC linéaire avec curseur positionné selon la valeur. */
export function BmiGauge({ imc, category }: Props) {
  // Échelle visuelle 15 → 40
  const min = 15;
  const max = 40;
  const pct = Math.min(100, Math.max(0, ((imc - min) / (max - min)) * 100));

  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between">
        <span className="text-3xl font-bold text-foreground">{imc.toFixed(1)}</span>
        <span className="text-sm font-medium text-muted-foreground">{category}</span>
      </div>
      <div className="relative h-3 w-full rounded-full bg-gradient-to-r from-sky-400 via-secondary to-danger">
        <div
          className="absolute -top-1 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-foreground shadow"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>35</span>
        <span>40+</span>
      </div>
    </div>
  );
}
