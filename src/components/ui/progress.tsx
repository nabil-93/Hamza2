"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface ProgressProps {
  value: number; // 0..100
  className?: string;
}

export function Progress({ value, className }: ProgressProps) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-muted", className)}>
      <div
        className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all duration-500"
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
