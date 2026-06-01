"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface RadioOption {
  value: string;
  label: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string | undefined;
  onChange: (value: string) => void;
  columns?: number;
}

/** Boutons radio façon cartes pour les choix exclusifs (sexe, objectif…). */
export function RadioGroup({ options, value, onChange, columns = 2 }: RadioGroupProps) {
  return (
    <div
      className="grid gap-3"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={cn(
              "rounded-md border px-4 py-3 text-sm font-medium transition-all",
              active
                ? "border-primary bg-primary-50 text-primary-700 ring-1 ring-primary"
                : "border-border bg-white hover:border-primary/40 hover:bg-muted",
            )}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
