"use client";

import { Check } from "lucide-react";
import { useWizard } from "./wizard-context";
import { useI18n, type TranslationKey } from "@/locales";
import { Progress } from "@/components/ui/progress";
import { TOTAL_STEPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function Stepper() {
  const { step, setStep } = useWizard();
  const { t } = useI18n();

  const pct = (step / TOTAL_STEPS) * 100;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-primary">
          {t("common.step")} {step} {t("common.of")} {TOTAL_STEPS}
        </p>
        <p className="text-sm font-medium text-muted-foreground">
          {t(`step.${step}` as TranslationKey)}
        </p>
      </div>
      <Progress value={pct} />
      <div className="hidden grid-cols-8 gap-2 md:grid">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => i + 1).map((s) => {
          const done = s < step;
          const current = s === step;
          return (
            <button
              key={s}
              type="button"
              onClick={() => s <= step && setStep(s)}
              disabled={s > step}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-md p-1 text-center transition-colors",
                s <= step ? "cursor-pointer" : "cursor-not-allowed opacity-50",
              )}
            >
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors",
                  done && "bg-secondary text-white",
                  current && "bg-primary text-white ring-2 ring-primary/30",
                  !done && !current && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="h-4 w-4" /> : s}
              </span>
              <span className="text-[10px] font-medium leading-tight text-muted-foreground">
                {t(`step.${s}` as TranslationKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
