"use client";

import * as React from "react";
import { Sparkles, Loader2, CheckCircle2, Check } from "lucide-react";
import { useWizard } from "../wizard-context";
import { useI18n } from "@/locales";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ProgramResult } from "@/components/report/program-result";
import { ExportButtons } from "@/components/report/export-buttons";
import { generateProgram } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import { SECTION_ORDER, sectionTitle, type SectionKey } from "@/lib/export/sections";
import type { PatientForm } from "@/types";

export function Step8Generate() {
  const {
    form, calc, program, setProgram, isGenerating, setIsGenerating,
    generatedLocale, setGeneratedLocale, mealDuration, setMealDuration,
    reportSections, setReportSections,
  } = useWizard();
  const { t, locale } = useI18n();
  const [error, setError] = React.useState<string | null>(null);

  const toggleSection = (key: SectionKey) =>
    setReportSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const handleGenerate = async () => {
    if (!calc) return;
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generateProgram({
        form: form.getValues() as PatientForm,
        calc,
        locale, // langue de l'interface au moment du clic
        duration: mealDuration,
      });
      setGeneratedLocale(locale);
      setProgram(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg === "MISSING_OPENAI_KEY" ? t("error.noKey") : t("error.generation"));
    } finally {
      setIsGenerating(false);
    }
  };

  if (program && calc) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-secondary">
            <CheckCircle2 className="h-5 w-5" />
            <p className="font-semibold">{t("generate.done")}</p>
          </div>
          <ExportButtons
            form={form.getValues() as PatientForm}
            calc={calc}
            program={program}
            generatedLocale={generatedLocale}
            sections={reportSections}
          />
        </div>
        <div dir={generatedLocale === "ar" ? "rtl" : "ltr"} className={generatedLocale === "ar" ? "font-arabic" : ""}>
          <ProgramResult program={program} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col items-center gap-5 py-12 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl medical-gradient text-white">
            <Sparkles className="h-8 w-8" />
          </div>
          <div className="max-w-md">
            <h3 className="text-lg font-semibold text-foreground">{t("step.8")}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{t("generate.intro")}</p>
          </div>

          {/* Durée du programme alimentaire */}
          <div className="w-full max-w-md rounded-lg border border-border bg-muted/30 p-4 text-start">
            <p className="mb-3 text-sm font-semibold text-foreground">{t("generate.durationTitle")}</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 1, label: t("generate.dur1") },
                { value: 7, label: t("generate.dur7") },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  disabled={isGenerating}
                  onClick={() => setMealDuration(opt.value)}
                  className={cn(
                    "rounded-md border px-3 py-2.5 text-sm font-medium transition-all disabled:opacity-50",
                    mealDuration === opt.value
                      ? "border-primary bg-primary-50 text-primary-700 ring-1 ring-primary"
                      : "border-border bg-white hover:border-primary/40 hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sections à inclure dans le rapport */}
          <div className="w-full max-w-md rounded-lg border border-border bg-muted/30 p-4 text-start">
            <p className="mb-1 text-sm font-semibold text-foreground">{t("export.sectionsTitle")}</p>
            <p className="mb-3 text-xs text-muted-foreground">{t("generate.sectionsHint")}</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {SECTION_ORDER.map((key) => {
                const checked = reportSections[key];
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => toggleSection(key)}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-start text-xs font-medium transition-colors disabled:opacity-50",
                      checked
                        ? "border-secondary bg-secondary-50 text-secondary-700"
                        : "border-border bg-white text-muted-foreground hover:bg-muted",
                    )}
                  >
                    <span
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        checked ? "border-secondary bg-secondary text-white" : "border-border",
                      )}
                    >
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    {sectionTitle(key, locale)}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="rounded-md bg-primary-50 px-4 py-2 text-xs text-primary-700">
            {t("generate.langInfo")}
          </p>

          {error && <Alert variant="danger" title={t("alert.aggressiveTitle")}>{error}</Alert>}
          <Button size="lg" onClick={handleGenerate} disabled={isGenerating}>
            {isGenerating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                {t("common.generating")}
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                {t("common.generate")}
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
