"use client";

import * as React from "react";
import { AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FieldProps {
  label: string;
  error?: string;
  hint?: string;
  /** Libellé "(optionnel)" affiché à côté du label si fourni. */
  optional?: string;
  children: React.ReactNode;
}

export function Field({ label, error, hint, optional, children }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <Label className={cn("flex items-center gap-1", error && "text-danger")}>
        {label}
        {optional && <span className="text-xs font-normal text-muted-foreground">{optional}</span>}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs font-medium text-danger">
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
