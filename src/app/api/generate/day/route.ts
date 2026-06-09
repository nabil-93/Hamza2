import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildSingleDayPrompt } from "@/lib/ai/prompts";
import { idealMacros } from "@/lib/utils";
import type { PatientForm, CalculationResult, Locale, DailyMealPlan } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  jourNom: string;
  autresJours?: string[];
  /** Jours déjà générés cette semaine (mode progressif) — mémoire de l'IA. */
  historyJours?: DailyMealPlan[];
}

/** Génère le menu d'UN SEUL jour (réponse courte → rapide). */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale, jourNom, autresJours, historyJours } = (await req.json()) as Body;
    const plan = await generateJson<DailyMealPlan>(
      buildSingleDayPrompt(form, calc, locale, jourNom, autresJours ?? [], historyJours ?? []),
      undefined,
      0.85,
      locale,
    );
    // Le modèle ne respecte pas fiablement les pourcentages de macros : on les
    // recalcule de façon déterministe à partir des calories réelles du jour,
    // pour garantir P 13 % / G 52 % / L 35 % (réf. EMC).
    const kcal = plan.caloriesTotales || plan.repas.reduce((s, r) => s + (r.calories || 0), 0);
    plan.caloriesTotales = kcal;
    plan.macros = idealMacros(kcal);
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
