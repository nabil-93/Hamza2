import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      aria-invalid={error || undefined}
      className={cn(
        "flex h-11 w-full rounded-md border bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50",
        error
          ? "border-danger ring-1 ring-danger/30 focus-visible:ring-danger"
          : "border-border focus-visible:ring-primary focus-visible:border-primary",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
