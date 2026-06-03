"use client";

import * as React from "react";
import { Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/locales";
import { buildHtml } from "@/lib/export/html";
import type { PatientForm, CalculationResult, GeneratedProgram, Locale } from "@/types";
import type { SectionKey } from "@/lib/export/sections";

interface Props {
  form: PatientForm;
  calc: CalculationResult;
  program: GeneratedProgram;
  locale: Locale;
  sections: Record<SectionKey, boolean>;
}

/**
 * Aperçu du rapport rendu en direct dans la page (iframe isolée).
 * Reflète instantanément les modifications du programme (ex. via le chat IA).
 */
export function ReportPreview({ form, calc, program, locale, sections }: Props) {
  const { t } = useI18n();

  // Reconstruit le HTML à chaque changement de programme/sections/langue.
  const html = React.useMemo(
    () => buildHtml({ form, calc, program, locale, sections }),
    [form, calc, program, locale, sections],
  );

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-5 w-5 text-secondary" />
          {t("preview.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{t("preview.hint")}</p>
      </CardHeader>
      <CardContent className="flex-1 p-0">
        <iframe
          title={t("preview.title")}
          srcDoc={html}
          className="h-[640px] w-full rounded-b-lg border-0"
        />
      </CardContent>
    </Card>
  );
}
