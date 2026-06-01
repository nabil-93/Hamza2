"use client";

import * as React from "react";
import { Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useWizard } from "../wizard-context";
import { useI18n } from "@/locales";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { ProgramResult } from "@/components/report/program-result";
import { ExportButtons } from "@/components/report/export-buttons";
import { generateProgram } from "@/lib/ai/client";
import type { PatientForm } from "@/types";

export function Step8Generate() {
  const { form, calc, program, setProgram, isGenerating, setIsGenerating, generatedLocale, setGeneratedLocale } =
    useWizard();
  const { t, locale } = useI18n();
  const [error, setError] = React.useState<string | null>(null);

  const handleGenerate = async () => {
    if (!calc) return;
    setError(null);
    setIsGenerating(true);
    try {
      const result = await generateProgram({
        form: form.getValues() as PatientForm,
        calc,
        locale, // langue de l'interface au moment du clic
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
