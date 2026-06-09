"use client";

import * as React from "react";
import {
  Salad, Dumbbell, Loader2, CheckCircle2, Check, Sparkles,
  Calendar, Sun, ChevronRight, FileText, Globe,
} from "lucide-react";
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
import { DayPanel } from "@/components/report/day-panel";
import { generateNutrition, generateSport, generateOneDay, generateAnalyse } from "@/lib/ai/client";
import { cn } from "@/lib/utils";
import { SECTION_ORDER, sectionTitle, type SectionKey } from "@/lib/export/sections";
import type { PatientForm, DailyMealPlan } from "@/types";
import type { ProgramType } from "../wizard-context";

const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/* ─────────────────────────────────────────
   ÉCRAN 0 — Choix langue + type programme
───────────────────────────────────────── */
function ChoixInitiaux() {
  const { programType, setProgramType, generatedLocale, setGeneratedLocale } = useWizard();
  const { t } = useI18n();

  const langs: { value: "fr" | "ar"; label: string; flag: string }[] = [
    { value: "fr", label: "Français", flag: "🇫🇷" },
    { value: "ar", label: "العربية", flag: "🇲🇦" },
  ];

  const types: { value: ProgramType; label: string; desc: string; icon: React.ReactNode }[] = [
    {
      value: "day",
      label: t("generate.dur1"),
      desc: "Génération complète en une fois. Idéal pour un bilan rapide.",
      icon: <Sun className="h-6 w-6" />,
    },
    {
      value: "week",
      label: t("generate.dur7"),
      desc: "Construction jour par jour avec mémoire. Chaque jour tient compte des précédents.",
      icon: <Calendar className="h-6 w-6" />,
    },
  ];

  return (
    <div className="mx-auto max-w-lg space-y-8 py-4">
      {/* Langue du document */}
      <div>
        <p className="mb-1 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Globe className="h-4 w-4 text-primary" />
          {t("export.langTitle")}
        </p>
        <p className="mb-3 text-xs text-muted-foreground">Le rapport Word/HTML sera généré dans cette langue. L&apos;interface de l&apos;application reste inchangée.</p>
        <div className="grid grid-cols-2 gap-3">
          {langs.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setGeneratedLocale(l.value)}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-4 text-start font-medium transition-all",
                generatedLocale === l.value
                  ? "border-primary bg-primary-50 ring-2 ring-primary text-primary"
                  : "border-border bg-white hover:bg-muted text-foreground",
              )}
            >
              <span className="text-2xl">{l.flag}</span>
              <span className="text-sm">{l.label}</span>
              {generatedLocale === l.value && <CheckCircle2 className="ml-auto h-4 w-4 text-primary" />}
            </button>
          ))}
        </div>
      </div>

      {/* Type de programme */}
      <div>
        <p className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          <Salad className="h-4 w-4 text-secondary" />
          Type de programme alimentaire
        </p>
        <div className="grid gap-3">
          {types.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setProgramType(opt.value)}
              className={cn(
                "flex items-center gap-4 rounded-xl border p-4 text-start transition-all",
                programType === opt.value
                  ? "border-secondary bg-secondary-50 ring-2 ring-secondary"
                  : "border-border bg-white hover:bg-muted",
              )}
            >
              <div className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", programType === opt.value ? "bg-secondary text-white" : "bg-muted text-muted-foreground")}>
                {opt.icon}
              </div>
              <div className="flex-1">
                <p className={cn("text-sm font-semibold", programType === opt.value ? "text-secondary-700" : "text-foreground")}>{opt.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {programType === opt.value && <CheckCircle2 className="h-5 w-5 text-secondary" />}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   MODE JOUR UNIQUE
───────────────────────────────────────── */
function ModeDayUnique() {
  const {
    form, calc,
    nutritionResult, setNutritionResult,
    sportResult, setSportResult,
    program,
    isGeneratingNutrition, setIsGeneratingNutrition,
    isGeneratingSport, setIsGeneratingSport,
    generatedLocale,
    reportSections, setReportSections,
  } = useWizard();
  const { t, locale } = useI18n();
  const [error, setError] = React.useState<string | null>(null);
  const [errorSport, setErrorSport] = React.useState<string | null>(null);
  const [tab, setTab] = React.useState<"nutrition" | "sport" | "export">("nutrition");

  React.useEffect(() => {
    setReportSections((prev) =>
      prev.sportif === !!sportResult ? prev : { ...prev, sportif: !!sportResult },
    );
  }, [sportResult, setReportSections]);

  const handleGenerate = async () => {
    if (!calc) return;
    setError(null);
    setIsGeneratingNutrition(true);
    try {
      const result = await generateNutrition({ form: form.getValues() as PatientForm, calc, locale: generatedLocale, duration: 1 });
      setNutritionResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("MISSING_OPENAI_KEY") ? t("error.noKey") : `${t("error.generation")} [${msg}]`);
    } finally {
      setIsGeneratingNutrition(false);
    }
  };

  const handleGenerateSport = async () => {
    if (!calc) return;
    setErrorSport(null);
    setIsGeneratingSport(true);
    try {
      const result = await generateSport({ form: form.getValues() as PatientForm, calc, locale: generatedLocale });
      setSportResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setErrorSport(msg.includes("MISSING_OPENAI_KEY") ? t("error.noKey") : `${t("error.generation")} [${msg}]`);
    } finally {
      setIsGeneratingSport(false);
    }
  };

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

  const toggleSection = (key: SectionKey) =>
    setReportSections((prev) => ({ ...prev, [key]: !prev[key] }));

  const exportProgram = nutritionResult
    ? {
        analyse: nutritionResult.analyse,
        nutrition: nutritionResult.nutrition,
        sport: sportResult?.sport ?? { niveau: "", semaines: [], consignesSecurite: [], resume: "" },
      }
    : null;

  const isBusy = isGeneratingNutrition || isGeneratingSport;

  const tabs = [
    { id: "nutrition" as const, label: "🍽️ Nutrition", done: !!nutritionResult },
    { id: "sport" as const, label: "🏃 Sport", done: !!sportResult },
    { id: "export" as const, label: "📄 Export", done: !!program },
  ];

  return (
    <div className="space-y-5">
      <div className="flex gap-2 border-b border-border pb-3">
        {tabs.map((t) => (
          <button key={t.id} type="button" onClick={() => setTab(t.id)}
            className={cn("flex items-center gap-1.5 rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground")}>
            {t.done && <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Nutrition */}
      {tab === "nutrition" && (
        <div className="space-y-4">
          {!nutritionResult ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-white">
                  <Salad className="h-7 w-7" />
                </div>
                <div className="max-w-md space-y-2">
                  <h3 className="text-base font-semibold">Programme du jour</h3>
                  <p className="text-sm text-muted-foreground">L&apos;IA va générer un programme complet basé sur toutes les données du patient.</p>
                </div>
                {error && <Alert variant="danger" title="Erreur">{error}</Alert>}
                <Button size="lg" onClick={handleGenerate} disabled={isBusy} className="bg-secondary hover:bg-secondary-700">
                  {isGeneratingNutrition
                    ? <><Loader2 className="h-5 w-5 animate-spin" />{t("generate.generatingNutrition")}</>
                    : <><Salad className="h-5 w-5" />{t("generate.generateNutrition")}</>}
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
                <Button size="sm" variant="outline" onClick={handleGenerate} disabled={isBusy}>
                  {isGeneratingNutrition ? <Loader2 className="h-4 w-4 animate-spin" /> : "Régénérer"}
                </Button>
              </div>
              {error && <Alert variant="danger" title="Erreur">{error}</Alert>}
              <ProgramResult
                program={{ ...nutritionResult, sport: sportResult?.sport ?? { niveau: "", semaines: [], consignesSecurite: [], resume: "" } }}
                tabs={["nutrition", "recipes", "shopping", "reco"]}
              />
              <Button onClick={() => setTab("sport")} className="w-full">
                <Dumbbell className="h-4 w-4" />{t("generate.generateSport")} →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Tab Sport */}
      {tab === "sport" && (
        <div className="space-y-4">
          {!nutritionResult && <Alert variant="warning" title="Étape précédente requise">Générez d&apos;abord le programme alimentaire.</Alert>}
          {!sportResult ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
                  <Dumbbell className="h-7 w-7" />
                </div>
                <p className="max-w-md text-sm text-muted-foreground">{t("generate.sportOptional")}</p>
                {errorSport && <Alert variant="danger" title="Erreur">{errorSport}</Alert>}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" onClick={handleGenerateSport} disabled={isBusy || !nutritionResult}>
                    {isGeneratingSport ? <><Loader2 className="h-5 w-5 animate-spin" />{t("generate.generatingSport")}</> : <><Dumbbell className="h-5 w-5" />{t("generate.generateSport")}</>}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setTab("export")} disabled={isBusy || !nutritionResult}>
                    {t("generate.skipSport")} →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{t("generate.sportDone")}</Badge>
                <Button size="sm" variant="outline" onClick={handleGenerateSport} disabled={isBusy}>
                  {isGeneratingSport ? <Loader2 className="h-4 w-4 animate-spin" /> : "Régénérer"}
                </Button>
              </div>
              <ProgramResult program={{ analyse: nutritionResult!.analyse, nutrition: nutritionResult!.nutrition, sport: sportResult.sport }} tabs={["sport"]} />
              <Button onClick={() => setTab("export")} className="w-full"><Sparkles className="h-4 w-4" />Exporter le rapport →</Button>
            </div>
          )}
        </div>
      )}

      {/* Tab Export */}
      {tab === "export" && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">{t("export.sectionsTitle")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {SECTION_ORDER.map((key) => {
                  const checked = reportSections[key];
                  const disabled = key === "sportif" && !sportResult;
                  return (
                    <button key={key} type="button" disabled={disabled}
                      onClick={() => !disabled && toggleSection(key)}
                      className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-start text-xs font-medium transition-colors disabled:opacity-40",
                        checked && !disabled ? "border-secondary bg-secondary-50 text-secondary-700" : "border-border bg-white text-muted-foreground hover:bg-muted")}>
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

          {exportProgram && calc && (
            <>
              <ExportButtons form={form.getValues() as PatientForm} calc={calc} program={exportProgram} generatedLocale={generatedLocale} sections={reportSections} />
              <div className="grid gap-4 lg:grid-cols-2">
                <ReportPreview form={form.getValues() as PatientForm} calc={calc} program={exportProgram} locale={generatedLocale} sections={reportSections} />
                <AIChat program={exportProgram} locale={generatedLocale} form={form.getValues() as PatientForm} onUpdateDay={handleUpdateDay} />
              </div>
            </>
          )}
          {!nutritionResult && <Alert variant="warning" title={t("generate.exportHint")}>{t("generate.exportHint")}</Alert>}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   MODE SEMAINE PROGRESSIVE
───────────────────────────────────────── */
function ModeSemaine() {
  const {
    form, calc,
    weeklyPlans, setWeeklyPlans,
    weeklyAnalyse, setWeeklyAnalyse,
    openDays, setOpenDays,
    sportResult, setSportResult,
    generatedLocale,
    isGeneratingNutrition, setIsGeneratingNutrition,
    isGeneratingSport, setIsGeneratingSport,
    reportSections, setReportSections,
  } = useWizard();
  const { t, locale } = useI18n();
  const [error, setError] = React.useState<string | null>(null);
  const [errorSport, setErrorSport] = React.useState<string | null>(null);
  const [view, setView] = React.useState<"programme" | "sport" | "export">("programme");

  React.useEffect(() => {
    setReportSections((prev) =>
      prev.sportif === !!sportResult ? prev : { ...prev, sportif: !!sportResult },
    );
  }, [sportResult, setReportSections]);

  const nextJourIndex = weeklyPlans.length; // 0 = Lundi, 1 = Mardi…
  const nextJourNom = JOURS_SEMAINE[nextJourIndex] ?? null;
  const isWeekComplete = weeklyPlans.length === 7;

  const handleGenerateNext = async () => {
    if (!calc || !nextJourNom) return;
    setError(null);
    setIsGeneratingNutrition(true);
    try {
      const patientForm = form.getValues() as PatientForm;
      const historyJours = weeklyPlans.map((w) => w.plan);
      const [plan, analyse] = await Promise.all([
        generateOneDay({ form: patientForm, calc, locale: generatedLocale }, nextJourNom, historyJours),
        weeklyAnalyse ? Promise.resolve(weeklyAnalyse) : generateAnalyse({ form: patientForm, calc, locale: generatedLocale }),
      ]);
      if (!weeklyAnalyse) setWeeklyAnalyse(analyse);
      setWeeklyPlans((prev) => [...prev, { jourNom: nextJourNom, plan }]);
      // Le jour fraîchement généré s'ouvre, sans fermer les autres.
      setOpenDays((prev) => (prev.includes(nextJourIndex) ? prev : [...prev, nextJourIndex]));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("MISSING_OPENAI_KEY") ? t("error.noKey") : `${t("error.generation")} [${msg}]`);
    } finally {
      setIsGeneratingNutrition(false);
    }
  };

  const handleUpdateDay = React.useCallback(
    (index: number, day: DailyMealPlan) => {
      setWeeklyPlans((prev) =>
        prev.map((w, i) => (i === index ? { ...w, plan: day } : w)),
      );
    },
    [setWeeklyPlans],
  );

  const handleGenerateSport = async () => {
    if (!calc) return;
    setErrorSport(null);
    setIsGeneratingSport(true);
    try {
      const result = await generateSport({ form: form.getValues() as PatientForm, calc, locale: generatedLocale });
      setSportResult(result);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setErrorSport(msg.includes("MISSING_OPENAI_KEY") ? t("error.noKey") : `${t("error.generation")} [${msg}]`);
    } finally {
      setIsGeneratingSport(false);
    }
  };

  const toggleSection = (key: SectionKey) =>
    setReportSections((prev) => ({ ...prev, [key]: !prev[key] }));

  // Programme assemblé pour export (disponible quand semaine complète)
  const exportProgram =
    isWeekComplete && weeklyAnalyse
      ? {
          analyse: weeklyAnalyse,
          nutrition: {
            plans: weeklyPlans.map((w) => w.plan),
            recettes: [],
            listeCourses: [],
            resumeNutritionnel:
              generatedLocale === "ar"
                ? "برنامج غذائي متوسطي لمدة أسبوع، متنوع ومتوازن."
                : "Programme alimentaire méditerranéen sur une semaine, varié et équilibré.",
          },
          sport: sportResult?.sport ?? { niveau: "", semaines: [], consignesSecurite: [], resume: "" },
        }
      : null;

  const isBusy = isGeneratingNutrition || isGeneratingSport;

  return (
    <div className="space-y-5">
      {/* Barre de navigation : programme / sport / export */}
      <div className="flex gap-2 border-b border-border pb-3">
        {[
          { id: "programme" as const, label: "🍽️ Programme", done: weeklyPlans.length > 0 },
          { id: "sport" as const, label: "🏃 Sport", done: !!sportResult },
          { id: "export" as const, label: "📄 Export", done: !!exportProgram },
        ].map((tab) => (
          <button key={tab.id} type="button" onClick={() => setView(tab.id)}
            className={cn("flex items-center gap-1.5 rounded-t-md px-4 py-2 text-sm font-medium transition-colors",
              view === tab.id ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground")}>
            {tab.done && <CheckCircle2 className="h-3.5 w-3.5 text-secondary" />}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Vue programme ── */}
      {view === "programme" && (
        <div className="space-y-4">
          {/* Progression semaine */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {JOURS_SEMAINE.map((jour, i) => {
              const done = i < weeklyPlans.length;
              const isCurrent = i === weeklyPlans.length;
              return (
                <div key={jour} className={cn("flex shrink-0 flex-col items-center gap-1")}>
                  <div className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-bold transition-all",
                    done ? "border-secondary bg-secondary text-white" :
                    isCurrent ? "border-primary bg-primary-50 text-primary animate-pulse" :
                    "border-border bg-white text-muted-foreground",
                  )}>
                    {done ? <Check className="h-4 w-4" /> : jour.slice(0, 2)}
                  </div>
                  <span className="text-[10px] text-muted-foreground">{jour.slice(0, 3)}</span>
                </div>
              );
            })}
          </div>

          {/* Jours déjà générés */}
          <div className="space-y-3">
            {weeklyPlans.map((w, i) => (
              calc && (
                <DayPanel
                  key={w.jourNom}
                  plan={w.plan}
                  form={form.getValues() as PatientForm}
                  calc={calc}
                  locale={generatedLocale}
                  dayIndex={i}
                  onUpdateDay={handleUpdateDay}
                  isActive={openDays.includes(i)}
                  onActivate={() =>
                    setOpenDays((prev) =>
                      prev.includes(i) ? prev.filter((d) => d !== i) : [...prev, i],
                    )
                  }
                />
              )
            ))}
          </div>

          {/* Bouton générer jour suivant */}
          {error && <Alert variant="danger" title="Erreur">{error}</Alert>}
          {!isWeekComplete && (
            <Card className="border-dashed border-primary/40 bg-primary-50/30">
              <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-2xl",
                  isGeneratingNutrition ? "bg-primary/20" : "bg-primary text-white",
                )}>
                  {isGeneratingNutrition
                    ? <Loader2 className="h-7 w-7 animate-spin text-primary" />
                    : <Salad className="h-7 w-7" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {isGeneratingNutrition ? `Génération de ${nextJourNom}…` : `Générer ${nextJourNom}`}
                  </p>
                  {weeklyPlans.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      L&apos;IA connaît les {weeklyPlans.length} jour{weeklyPlans.length > 1 ? "s" : ""} précédent{weeklyPlans.length > 1 ? "s" : ""} et va proposer un menu différent.
                    </p>
                  )}
                </div>
                <Button size="lg" onClick={handleGenerateNext} disabled={isBusy} className="min-w-[200px]">
                  {isGeneratingNutrition
                    ? <><Loader2 className="h-5 w-5 animate-spin" />Génération…</>
                    : <><Salad className="h-5 w-5" />Générer {nextJourNom} <ChevronRight className="h-4 w-4" /></>}
                </Button>
                <p className="text-xs text-muted-foreground">{t("generate.langInfo")}</p>
              </CardContent>
            </Card>
          )}

          {/* Semaine complète */}
          {isWeekComplete && (
            <div className="flex flex-col items-center gap-3 rounded-xl border border-secondary bg-secondary-50 p-5 text-center">
              <CheckCircle2 className="h-10 w-10 text-secondary" />
              <p className="font-semibold text-secondary-700">Semaine complète !</p>
              <div className="flex gap-3">
                <Button onClick={() => setView("sport")} variant="outline">
                  <Dumbbell className="h-4 w-4" />Programme sportif
                </Button>
                <Button onClick={() => setView("export")}>
                  <FileText className="h-4 w-4" />Exporter →
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Vue sport ── */}
      {view === "sport" && (
        <div className="space-y-4">
          {!sportResult ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-5 py-10 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
                  <Dumbbell className="h-7 w-7" />
                </div>
                <p className="max-w-md text-sm text-muted-foreground">{t("generate.sportOptional")}</p>
                {errorSport && <Alert variant="danger" title="Erreur">{errorSport}</Alert>}
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" onClick={handleGenerateSport} disabled={isBusy}>
                    {isGeneratingSport ? <><Loader2 className="h-5 w-5 animate-spin" />{t("generate.generatingSport")}</> : <><Dumbbell className="h-5 w-5" />{t("generate.generateSport")}</>}
                  </Button>
                  <Button size="lg" variant="outline" onClick={() => setView("export")} disabled={isBusy || !isWeekComplete}>
                    {t("generate.skipSport")} →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              <Badge variant="success" className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />{t("generate.sportDone")}</Badge>
              <ProgramResult
                program={{
                  analyse: weeklyAnalyse ?? { resumeProfil: "", risquesPoids: "", analyseDiabete: "", analyseNutritionnelle: "", analyseActivite: "", recommandationsGenerales: [] },
                  nutrition: { plans: weeklyPlans.map((w) => w.plan), recettes: [], listeCourses: [], resumeNutritionnel: "" },
                  sport: sportResult.sport,
                }}
                tabs={["sport"]}
              />
              <Button onClick={() => setView("export")} className="w-full">
                <FileText className="h-4 w-4" />Exporter le rapport →
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Vue export ── */}
      {view === "export" && (
        <div className="space-y-4">
          {!isWeekComplete && (
            <Alert variant="warning" title="Semaine incomplète">
              Générez les 7 jours avant d&apos;exporter.
            </Alert>
          )}
          {exportProgram && calc && (
            <>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">{t("export.sectionsTitle")}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                    {SECTION_ORDER.map((key) => {
                      const checked = reportSections[key];
                      const disabled = key === "sportif" && !sportResult;
                      return (
                        <button key={key} type="button" disabled={disabled}
                          onClick={() => !disabled && toggleSection(key)}
                          className={cn("flex items-center gap-2 rounded-md border px-3 py-2 text-start text-xs font-medium transition-colors disabled:opacity-40",
                            checked && !disabled ? "border-secondary bg-secondary-50 text-secondary-700" : "border-border bg-white text-muted-foreground hover:bg-muted")}>
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
              <ExportButtons
                form={form.getValues() as PatientForm}
                calc={calc}
                program={exportProgram}
                generatedLocale={generatedLocale}
                sections={reportSections}
              />
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
                  onUpdateDay={(index, day) =>
                    setWeeklyPlans((prev) => prev.map((w, i) => (i === index ? { ...w, plan: day } : w)))
                  }
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   COMPOSANT PRINCIPAL — Step8Generate
───────────────────────────────────────── */
export function Step8Generate() {
  const { programType } = useWizard();
  const [confirmed, setConfirmed] = React.useState(false);
  const { t } = useI18n();

  if (!confirmed) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-lg font-semibold text-foreground">{t("generate.intro").split(".")[0]}</h2>
          <p className="mt-1 text-sm text-muted-foreground">Configurez le programme avant de générer.</p>
        </div>
        <ChoixInitiaux />
        <div className="flex justify-center">
          <Button size="lg" onClick={() => setConfirmed(true)} className="min-w-[220px]">
            <ChevronRight className="h-5 w-5" />
            Continuer vers la génération
          </Button>
        </div>
      </div>
    );
  }

  return programType === "day" ? <ModeDayUnique /> : <ModeSemaine />;
}
