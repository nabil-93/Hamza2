"use client";

import * as React from "react";
import { FileText, FileDown, FileCode, Printer, Loader2, Check } from "lucide-react";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { useI18n, type TranslationKey } from "@/locales";
import { translateProgram } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import {
  SECTION_ORDER,
  defaultSections,
  sectionTitle,
  type SectionKey,
} from "@/lib/export/sections";
import type { PatientForm, CalculationResult, GeneratedProgram, Locale } from "@/types";

interface Props {
  form: PatientForm;
  calc: CalculationResult;
  program: GeneratedProgram;
  /** Langue dans laquelle le programme a été généré. */
  generatedLocale: Locale;
}

type Job = "pdf" | "docx" | "html" | null;

export function ExportButtons({ form, calc, program, generatedLocale }: Props) {
  const { t } = useI18n();
  const [docLocale, setDocLocale] = React.useState<Locale>(generatedLocale);
  const [loading, setLoading] = React.useState<Job>(null);
  const [sections, setSections] = React.useState<Record<SectionKey, boolean>>(defaultSections);

  const toggleSection = (key: SectionKey) =>
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Clé stable du programme pour le cache de traduction.
  const cacheKey = React.useMemo(
    () => `${form.nom}|${form.prenom}|${generatedLocale}|${program.nutrition.plans.length}|${program.nutrition.plans[0]?.caloriesTotales}`,
    [form.nom, form.prenom, generatedLocale, program],
  );

  const needsTranslation = docLocale !== generatedLocale;
  const fileBase = `Rapport_${form.nom}_${form.prenom}_${docLocale === "ar" ? "AR" : "FR"}`.replace(/\s+/g, "_");

  /** Retourne le programme dans la langue du document (traduit si besoin). */
  const resolveProgram = async (): Promise<GeneratedProgram> => {
    if (!needsTranslation) return program;
    return translateProgram(program, cacheKey, docLocale);
  };

  const exportPdf = async () => {
    setLoading("pdf");
    try {
      const prog = await resolveProgram();
      const { buildPdfBlob } = await import("@/lib/export/pdf");
      const blob = await buildPdfBlob({ form, calc, program: prog, locale: docLocale, sections });
      saveAs(blob, `${fileBase}.pdf`);
    } catch (e) {
      console.error("PDF export failed", e);
      const detail = e instanceof Error ? `\n\n${e.message}` : "";
      alert(t("error.generation") + detail);
    } finally {
      setLoading(null);
    }
  };

  const exportDocx = async () => {
    setLoading("docx");
    try {
      const prog = await resolveProgram();
      const { buildDocx } = await import("@/lib/export/docx");
      const blob = await buildDocx({ form, calc, program: prog, locale: docLocale, sections });
      saveAs(blob, `${fileBase}.docx`);
    } catch (e) {
      console.error("DOCX export failed", e);
      alert(t("error.generation"));
    } finally {
      setLoading(null);
    }
  };

  const exportHtml = async () => {
    setLoading("html");
    try {
      const prog = await resolveProgram();
      const { buildHtml } = await import("@/lib/export/html");
      const html = buildHtml({ form, calc, program: prog, locale: docLocale, sections });
      // On écrit directement le HTML dans une nouvelle fenêtre (about:blank).
      // Avantage : à l'impression, l'URL « blob:… » ne s'affiche pas en pied de page.
      const win = window.open("", "_blank");
      if (win) {
        win.document.open();
        win.document.write(html);
        win.document.close();
      } else {
        // Pop-up bloquée : repli sur un téléchargement classique.
        const blob = new Blob([html], { type: "text/html;charset=utf-8" });
        saveAs(blob, `${fileBase}.html`);
      }
    } catch (e) {
      console.error("HTML export failed", e);
      alert(t("error.generation"));
    } finally {
      setLoading(null);
    }
  };

  const busy = loading !== null;
  const nbSelected = SECTION_ORDER.filter((k) => sections[k]).length;

  return (
    <div className="flex flex-col gap-3 no-print">
      {/* Sélection des sections à inclure dans le rapport */}
      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-2 text-sm font-semibold text-foreground">{t("export.sectionsTitle")}</p>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
          {SECTION_ORDER.map((key) => {
            const checked = sections[key];
            return (
              <button
                key={key}
                type="button"
                disabled={busy}
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
                {sectionTitle(key, docLocale)}
              </button>
            );
          })}
        </div>
        {nbSelected === 0 && (
          <p className="mt-2 text-xs text-danger">{t("export.sectionsEmpty")}</p>
        )}
      </div>

      {/* Choix de la langue du document */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">{t("export.langTitle")}:</span>
        {(["fr", "ar"] as const).map((l) => (
          <button
            key={l}
            type="button"
            disabled={busy}
            onClick={() => setDocLocale(l)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-semibold transition-all disabled:opacity-50",
              docLocale === l
                ? "border-primary bg-primary-50 text-primary-700 ring-1 ring-primary"
                : "border-border bg-white hover:bg-muted",
            )}
          >
            {t(`lang.${l}` as TranslationKey)}
          </button>
        ))}
      </div>

      {needsTranslation && (
        <p className="text-xs text-amber-600">
          {t("export.translateNote")
            .replace("{src}", t(`lang.${generatedLocale}` as TranslationKey))
            .replace("{dst}", t(`lang.${docLocale}` as TranslationKey))}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        <Button onClick={exportPdf} disabled={busy || nbSelected === 0}>
          {loading === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
          {t("export.pdf")}
        </Button>
        <Button variant="secondary" onClick={exportDocx} disabled={busy || nbSelected === 0}>
          {loading === "docx" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          {t("export.docx")}
        </Button>
        <Button variant="outline" onClick={exportHtml} disabled={busy || nbSelected === 0}>
          {loading === "html" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileCode className="h-4 w-4" />}
          {t("export.html")}
        </Button>
      </div>

      {busy && needsTranslation && (
        <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          {t("export.translating")}
        </p>
      )}
    </div>
  );
}
