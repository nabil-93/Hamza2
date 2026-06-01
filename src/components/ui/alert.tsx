import * as React from "react";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  title?: string;
  children: React.ReactNode;
  variant?: "warning" | "danger" | "info";
  className?: string;
}

const STYLES = {
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-800",
  info: "border-primary-100 bg-primary-50 text-primary-700",
};

export function Alert({ title, children, variant = "info", className }: AlertProps) {
  return (
    <div className={cn("flex gap-3 rounded-md border p-4 text-sm", STYLES[variant], className)}>
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
      <div>
        {title && <p className="font-semibold">{title}</p>}
        <div className={title ? "mt-1" : ""}>{children}</div>
      </div>
    </div>
  );
}
