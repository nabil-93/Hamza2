import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AnalysisCardProps {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  metric?: { label: string; value: string }[];
}

export function AnalysisCard({ icon, title, children, metric }: AnalysisCardProps) {
  return (
    <Card className="h-full">
      <CardHeader className="flex-row items-center gap-3 space-y-0">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-50 text-primary">
          {icon}
        </div>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="text-sm leading-relaxed text-muted-foreground">{children}</div>
        {metric && metric.length > 0 && (
          <div className="grid grid-cols-2 gap-2 border-t border-border pt-3">
            {metric.map((m) => (
              <div key={m.label}>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-semibold text-foreground">{m.value}</p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
