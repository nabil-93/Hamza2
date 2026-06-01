"use client";

import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface CheckboxCardProps {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

/** Case à cocher stylisée façon carte cliquable, pour pathologies/limitations. */
export function CheckboxCard({ label, checked, onCheckedChange }: CheckboxCardProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "flex items-center gap-3 rounded-md border px-4 py-3 text-sm font-medium text-start transition-all",
        checked
          ? "border-primary bg-primary-50 text-primary-700"
          : "border-border bg-white hover:border-primary/40 hover:bg-muted",
      )}
    >
      <span
        className={cn(
          "flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors",
          checked ? "border-primary bg-primary text-white" : "border-border bg-white",
        )}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </span>
      {label}
    </button>
  );
}
