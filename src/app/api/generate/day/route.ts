import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildSingleDayPrompt } from "@/lib/ai/prompts";
import type { PatientForm, CalculationResult, Locale, DailyMealPlan } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  jourNom: string;
  autresJours?: string[];
}

/** Génère le menu d'UN SEUL jour (réponse courte → rapide, pour parallélisation). */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale, jourNom, autresJours } = (await req.json()) as Body;
    const plan = await generateJson<DailyMealPlan>(
      buildSingleDayPrompt(form, calc, locale, jourNom, autresJours ?? []),
      undefined,
      0.85, // température élevée → variété entre patients
    );
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
