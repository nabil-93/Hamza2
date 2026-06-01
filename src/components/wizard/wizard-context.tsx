"use client";

import React, { createContext, useContext, useMemo, useState } from "react";
import { useForm, type UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { patientFormSchema, type PatientFormSchema } from "@/lib/schema";
import { computeAll } from "@/lib/calculations";
import type { CalculationResult, GeneratedProgram, PatientForm, Locale } from "@/types";
import { useI18n } from "@/locales";
import { TOTAL_STEPS } from "@/lib/constants";

interface WizardContextValue {
  form: UseFormReturn<PatientFormSchema>;
  step: number;
  setStep: (s: number) => void;
  next: () => void;
  prev: () => void;
  calc: CalculationResult | null;
  recompute: () => void;
  program: GeneratedProgram | null;
  setProgram: (p: GeneratedProgram | null) => void;
  isGenerating: boolean;
  setIsGenerating: (v: boolean) => void;
  /** Langue dans laquelle le programme a réellement été généré (= UI au moment du clic). */
  generatedLocale: Locale;
  setGeneratedLocale: (l: Locale) => void;
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
  preferences: { legumes: [], fruits: [], proteines: [], feculents: [], commentaire: "" },
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
  const [program, setProgram] = useState<GeneratedProgram | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  // Langue effective de génération (figée au moment du clic « Générer »).
  const [generatedLocale, setGeneratedLocale] = useState<Locale>(locale);

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
      program,
      setProgram,
      isGenerating,
      setIsGenerating,
      generatedLocale,
      setGeneratedLocale,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [form, step, calc, program, isGenerating, generatedLocale],
  );

  return <WizardContext.Provider value={value}>{children}</WizardContext.Provider>;
}

export function useWizard() {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error("useWizard doit être utilisé dans WizardProvider");
  return ctx;
}
