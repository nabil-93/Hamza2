"use client";

import * as React from "react";
import { Salad, Dumbbell, Loader2, CheckCircle2, Check, Sparkles } from "lucide-react";
import { useWizard } from "../wizard-context";
import { useI18n } from "@/locales";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgramResult } from "@/components/report/program-result";
import { ExportButtons } from "@/components/report/export-buttons";
import { ReportPreview } from "@/components/report/report-preview";
import { AIChat } from "@/components/report/ai-chat";
import { generateNutrition, generateSport } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import { SECTION_ORDER, sectionTitle, type SectionKey } from "@/lib/export/sections";
import type { PatientForm, DailyMealPlan } from "@/types";

export function Step8Generate() {
  const {
    form, calc,
    nutritionResult, setNutritionResult,
    sportResult, setSportResult,
    program,
    isGeneratingNutrition, setIsGeneratingNutrition,
    isGeneratingSport, setIsGeneratingSport,
    generatedLocale, setGeneratedLocale,
    mealDuration, setMealDuration,
    reportSections, setReportSections,
  } = useWizard();
  const { t, locale } = useI18n();
  const [errorNutrition, setErrorNutrition] = React.useState<string | null>(null);
  const [errorSport, setErrorSport] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<"nutrition" | "sport" | "export">("nutrition");

  // La section « Programme sportif » suit la présence du résultat sportif.
  React.useEffect(() => {
    setReportSections((prev) =>
      prev.sportif === !!sportResult ? prev : { ...prev, sportif: !!sportResult },
    );
  }, [sportResult, setReportSections]);

  const handleGenerateNutrition = async () => {
    if (!calc) return;
    setErrorNutrition(null);
    setIsGeneratingNutrition(true);
    try {
      const result = await generateNutrition({
        form: form.getValues() as PatientForm,
        calc,
        locale,
        duration: mealDuration,
      });
      setNutritionResult(result);
      setGeneratedLocale(locale);
      setActiveTab("sport");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setErrorNutrition(msg.includes("MISSING_OPENAI_KEY") ? t("error.noKey") : `${t("error.generation")} [${msg}]`);
    } finally {
      setIsGeneratingNutrition(false);
    }
  };

  const handleGenerateSport = async () => {
    if (!calc) return;
    setErrorSport(null);
    setIsGeneratingSport(true);
    try {
      const result = await generateSport({
        form: form.getValues() as PatientForm,
        calc,
        locale,
      });
      setSportResult(result);
      setGeneratedLocale(locale);
      setActiveTab("export");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setErrorSport(msg.includes("MISSING_OPENAI_KEY") ? t("error.noKey") : `${t("error.generation")} [${msg}]`);
    } finally {
      setIsGeneratingSport(false);
    }
  };

  const toggleSection = (key: SectionKey) =>
    setReportSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const isBusy = isGeneratingNutrition || isGeneratingSport;

  // Programme à exporter/prévisualiser (nutrition seule = sport vide).
  const exportProgram = nutritionResult
    ? {
        analyse: nutritionResult.analyse,
        nutrition: nutritionResult.nutrition,
        sport: sportResult?.sport ?? { niveau: "", semaines: [], consignesSecurite: [], resume: "" },
      }
    : null;

  /**
   * Le chat IA a modifié un jour → on met à jour le résultat nutritionnel.
   * Mise à jour FONCTIONNELLE obligatoire : lors d'une modification « tous les
   * jours », plusieurs appels arrivent en parallèle ; sans `prev`, chaque appel
   * écraserait les précédents (stale closure) et seul le dernier jour serait gardé.
   */
  const handleUpdateDay = React.useCallback(
    (index: number, day: DailyMealPlan) => {
      setNutritionResult((prev) => {
        if (!prev) return prev;
        const plans = prev.nutrition.plans.map((p, i) => (i === index ? day : p));
        return { ...prev, nutrition: { ...prev.nutrition, plans } };
      });
    },
    [setNutritionResult],
  );

  const tabs = [
    { id: "nutrition" as const, label: "🍽️ Nutrition", done: !!nutritionResult },
    { id: "sport" as const, label: "🏃 Sport", done: !!sportResult },
    { id: "export" as const, label: "📄 Export", done: !!program },
  ];

  return (
    <div className="space-y-5">
      {/* Onglets */}
      <div className="flex gap-2 border-b border-border pb-3">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
              activeTab === tab.id
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.done && <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── TAB 1 : Programme alimentaire ── */}
      {activeTab === "nutrition" && (
        <div className="space-y-4">
          {!nutritionResult ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-white">
                  <Salad className="h-7 w-7" />
                </div>
                <div className="max-w-md">
                  <h3 className="text-base font-semibold text-foreground">{t("generate.durationTitle")}</h3>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    {[{ value: 1, label: t("generate.dur1") }, { value: 7, label: t("generate.dur7") }].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={isBusy}
                        onClick={() => setMealDuration(opt.value)}
                        className={cn(
                          "rounded-md border px-3 py-2 text-sm font-medium transition-all disabled:opacity-50",
                          mealDuration === opt.value
                            ? "border-secondary bg-secondary-50 text-secondary-700 ring-1 ring-secondary"
                            : "border-border bg-white hover:bg-muted",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                {errorNutrition && <Alert variant="danger" title="Erreur">{errorNutrition}</Alert>}
                <Button size="lg" onClick={handleGenerateNutrition} disabled={isBusy} className="bg-secondary hover:bg-secondary-700">
                  {isGeneratingNutrition ? (
                    <><Loader2 className="h-5 w-5 animate-spin" />{t("generate.generatingNutrition")}</>
                  ) : (
                    <><Salad className="h-5 w-5" />{t("generate.generateNutrition")}</>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">{t("generate.langInfo")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />{t("generate.nutritionDone")}
                </Badge>
                <Button size="sm" variant="outline" onClick={handleGenerateNutrition} disabled={isBusy}>
                  {isGeneratingNutrition ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Salad className="h-4 w-4" />Régénérer</>}
                </Button>
              </div>
              {errorNutrition && <Alert variant="danger" title="Erreur">{errorNutrition}</Alert>}
              <ProgramResult program={{ ...nutritionResult, sport: sportResult?.sport ?? { niveau: "", semaines: [], consignesSecurite: [], resume: "" } }} tabs={["nutrition", "recipes", "shopping", "reco"]} />
              <Button onClick={() => setActiveTab("sport")} className="w-full">
                <Dumbbell className="h-4 w-4" />{t("generate.generateSport")} →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2 : Programme sportif ── */}
      {activeTab === "sport" && (
        <div className="space-y-4">
          {!nutritionResult && (
            <Alert variant="warning" title="Étape précédente requise">
              Générez d&apos;abord le programme alimentaire.
            </Alert>
          )}
          {!sportResult ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
                  <Dumbbell className="h-7 w-7" />
                </div>
                <p className="max-w-md text-sm text-muted-foreground">{t("generate.sportOptional")}</p>
                {errorSport && <Alert variant="danger" title="Erreur">{errorSport}</Alert>}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" onClick={handleGenerateSport} disabled={isBusy || !nutritionResult} className="bg-primary hover:bg-primary-700">
                    {isGeneratingSport ? (
                      <><Loader2 className="h-5 w-5 animate-spin" />{t("generate.generatingSport")}</>
                    ) : (
                      <><Dumbbell className="h-5 w-5" />{t("generate.generateSport")}</>
                    )}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setActiveTab("export")} disabled={isBusy || !nutritionResult}>
                    {t("generate.skipSport")} →
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{t("generate.langInfo")}</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" />{t("generate.sportDone")}
                </Badge>
                <Button size="sm" variant="outline" onClick={handleGenerateSport} disabled={isBusy}>
                  {isGeneratingSport ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Dumbbell className="h-4 w-4" />Régénérer</>}
                </Button>
              </div>
              {errorSport && <Alert variant="danger" title="Erreur">{errorSport}</Alert>}
              <ProgramResult program={{ analyse: nutritionResult!.analyse, nutrition: nutritionResult!.nutrition, sport: sportResult.sport }} tabs={["sport"]} />
              <Button onClick={() => setActiveTab("export")} className="w-full">
                <Sparkles className="h-4 w-4" />Exporter le rapport →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3 : Export ── */}
      {activeTab === "export" && (
        <div className="space-y-4">
          {/* Sélection des sections */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("export.sectionsTitle")}</CardTitle>
              <p className="text-xs text-muted-foreground">{t("generate.sectionsHint")}</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {SECTION_ORDER.map((key) => {
                  const checked = reportSections[key];
                  const isSportSection = key === "sportif";
                  const disabled = isSportSection && !sportResult;
                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={disabled}
                      onClick={() => !disabled && toggleSection(key)}
                      className={cn(
                        "flex items-center gap-2 rounded-md border px-3 py-2 text-start text-xs font-medium transition-colors disabled:opacity-40",
                        checked && !disabled
                          ? "border-secondary bg-secondary-50 text-secondary-700"
                          : "border-border bg-white text-muted-foreground hover:bg-muted",
                      )}
                    >
                      <span className={cn("flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border", checked && !disabled ? "border-secondary bg-secondary text-white" : "border-border")}>
                        {checked && !disabled && <Check className="h-3 w-3" />}
                      </span>
                      {sectionTitle(key, locale)}
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Boutons export Word / HTML */}
          {exportProgram && calc && (
            <ExportButtons
              form={form.getValues() as PatientForm}
              calc={calc}
              program={exportProgram}
              generatedLocale={generatedLocale}
              sections={reportSections}
            />
          )}

          {/* Aperçu du rapport + Assistant IA (côte à côte) */}
          {exportProgram && calc && (
            <div className="grid gap-4 lg:grid-cols-2">
              <ReportPreview
                form={form.getValues() as PatientForm}
                calc={calc}
                program={exportProgram}
                locale={generatedLocale}
                sections={reportSections}
              />
              <AIChat
                program={exportProgram}
                locale={generatedLocale}
                form={form.getValues() as PatientForm}
                onUpdateDay={handleUpdateDay}
              />
            </div>
          )}

          {!nutritionResult && (
            <Alert variant="warning" title={t("generate.exportHint")}>
              {t("generate.exportHint")}
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
