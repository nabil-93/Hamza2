"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientFormSchema, type PatientFormSchema } from "@/lib/schema";
import { computeAll } from "@/lib/calculations";
import type { CalculationResult, GeneratedProgram, PatientForm, Locale, NutritionResult, SportResult, DailyMealPlan, MedicalAnalysis } from "@/types";
import { assembleProgram } from "@/lib/ai/client";
import { useI18n } from "@/locales";
import { TOTAL_STEPS } from "@/lib/constants";
import { defaultSections, type SectionKey } from "@/lib/export/sections";

/** Type de programme : jour unique ou semaine progressive. */
export type ProgramType = "day" | "week";

/** Un jour de la semaine avec son historique de chat. */
export interface WeekDay {
  jourNom: string;
  plan: DailyMealPlan;
}

interface WizardContextValue {
  form: UseFormReturn<PatientFormSchema>;
  step: number;
  setStep: (s: number) => void;
  next: () => void;
  prev: () => void;
  calc: CalculationResult | null;
  recompute: () => void;
  /** Résultat nutritionnel (nutrition + analyse). Null avant génération. */
  nutritionResult: NutritionResult | null;
  setNutritionResult: React.Dispatch<React.SetStateAction<NutritionResult | null>>;
  /** Résultat sportif. Null avant génération. */
  sportResult: SportResult | null;
  setSportResult: (r: SportResult | null) => void;
  /** Programme complet assemblé (disponible quand les deux sont générés). */
  program: GeneratedProgram | null;
  isGeneratingNutrition: boolean;
  setIsGeneratingNutrition: (v: boolean) => void;
  isGeneratingSport: boolean;
  setIsGeneratingSport: (v: boolean) => void;
  /** Langue dans laquelle le programme a réellement été généré (= UI au moment du clic). */
  generatedLocale: Locale;
  setGeneratedLocale: (l: Locale) => void;
  /** Durée du plan alimentaire à générer : 1 (jour type), 7 ou 14 jours. */
  mealDuration: number;
  setMealDuration: (d: number) => void;
  /** Sections à inclure dans le rapport exporté. */
  reportSections: Record<SectionKey, boolean>;
  setReportSections: React.Dispatch<React.SetStateAction<Record<SectionKey, boolean>>>;
  /** Type de programme choisi par le médecin : jour unique ou semaine progressive. */
  programType: ProgramType;
  setProgramType: (t: ProgramType) => void;
  /** Jours déjà générés (mode semaine progressive). */
  weeklyPlans: WeekDay[];
  setWeeklyPlans: React.Dispatch<React.SetStateAction<WeekDay[]>>;
  /** Analyse médicale générée (partagée entre modes). */
  weeklyAnalyse: MedicalAnalysis | null;
  setWeeklyAnalyse: (a: MedicalAnalysis | null) => void;
  /** Index du jour actif dans weeklyPlans (mode semaine). */
  activeDay: number;
  setActiveDay: (i: number) => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

const DEFAULT_VALUES: PatientFormSchema = {
  nom: "",
  prenom: "",
  dateNaissance: "",
  sexe: "homme",
  taille: 170,
  poidsActuel: 80,
  niveauActivite: "moderement_actif",
  poidsCible: 75,
  objectif: "perte_poids",
  niveauSportif: "debutant",
  pathologies: [],
  commentairePathologies: "",
  diabete: {},
  limitations: [],
  commentaireLimitations: "",
  preferences: { commentaire: "", alimentsInterdits: "" },
  modeRamadan: false,
  branding: {},
};

export function WizardProvider({ children }: { children: React.ReactNode }) {
  const form = useForm<PatientFormSchema>({
    resolver: zodResolver(patientFormSchema),
    defaultValues: DEFAULT_VALUES,
    // Valide au blur, puis ré-évalue à chaque frappe : l'erreur disparaît
    // dès que le champ est corrigé (meilleur retour visuel).
    mode: "onTouched",
    reValidateMode: "onChange",
  });

  const { locale } = useI18n();
  const [step, setStepState] = useState(1);
  const [calc, setCalc] = useState<CalculationResult | null>(null);
  const [nutritionResult, setNutritionResult] = useState<NutritionResult | null>(null);
  const [sportResult, setSportResult] = useState<SportResult | null>(null);
  const [isGeneratingNutrition, setIsGeneratingNutrition] = useState(false);
  const [isGeneratingSport, setIsGeneratingSport] = useState(false);
  const [generatedLocale, setGeneratedLocale] = useState<Locale>(locale);
  const [mealDuration, setMealDuration] = useState<number>(1);
  const [reportSections, setReportSections] = useState<Record<SectionKey, boolean>>(defaultSections);
  const [programType, setProgramType] = useState<ProgramType>("day");
  const [weeklyPlans, setWeeklyPlans] = useState<WeekDay[]>([]);
  const [weeklyAnalyse, setWeeklyAnalyse] = useState<MedicalAnalysis | null>(null);
  const [activeDay, setActiveDay] = useState<number>(0);

  // Programme complet assemblé (disponible quand les deux sont générés).
  const program: GeneratedProgram | null =
    nutritionResult && sportResult
      ? assembleProgram(nutritionResult, sportResult)
      : null;

  const setStep = (s: number) => setStepState(Math.min(TOTAL_STEPS, Math.max(1, s)));

  const recompute = () => {
    const values = form.getValues();
    setCalc(computeAll(values as PatientForm));
  };

  const next = () => {
    if (step === 6) recompute(); // recalcule avant la revue (étape 7)
    setStep(step + 1);
  };
  const prev = () => setStep(step - 1);

  const value = useMemo<WizardContextValue>(
    () => ({
      form,
      step,
      setStep,
      next,
      prev,
      calc,
      recompute,
      nutritionResult,
      setNutritionResult,
      sportResult,
      setSportResult,
      program,
      isGeneratingNutrition,
      setIsGeneratingNutrition,
      isGeneratingSport,
      setIsGeneratingSport,
      generatedLocale,
      setGeneratedLocale,
      mealDuration,
      setMealDuration,
      reportSections,
      setReportSections,
      programType,
      setProgramType,
      weeklyPlans,
      setWeeklyPlans,
      weeklyAnalyse,
      setWeeklyAnalyse,
      activeDay,
      setActiveDay,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, step, calc, nutritionResult, sportResult, program, isGeneratingNutrition, isGeneratingSport, generatedLocale, mealDuration, reportSections, programType, weeklyPlans, weeklyAnalyse, activeDay],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard doit être utilisé dans WizardProvider");
  return ctx;
}
