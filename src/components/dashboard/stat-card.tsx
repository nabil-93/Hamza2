import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  icon: React.ReactNode;
  accent?: "primary" | "secondary" | "amber" | "neutral";
}

const ACCENTS = {
  primary: "from-primary/10 to-primary/5 text-primary",
  secondary: "from-secondary/10 to-secondary/5 text-secondary",
  amber: "from-amber-500/10 to-amber-500/5 text-amber-600",
  neutral: "from-slate-200/40 to-slate-100/40 text-slate-600",
};

export function StatCard({ label, value, unit, icon, accent = "primary" }: StatCardProps) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {value}
            {unit && <span className="ms-1 text-sm font-medium text-muted-foreground">{unit}</span>}
          </p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br",
            ACCENTS[accent],
          )}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
