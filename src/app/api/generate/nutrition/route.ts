import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildNutritionPrompt } from "@/lib/ai/prompts";
import { idealMacros } from "@/lib/utils";
import type { PatientForm, CalculationResult, Locale, NutritionProgram } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  duration?: number;
}

/** Génère UNIQUEMENT le programme alimentaire (indépendant du sport et de l'analyse). */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale, duration } = (await req.json()) as Body;
    const days = duration === 7 ? 7 : 1;
    const nutrition = await generateJson<NutritionProgram>(
      buildNutritionPrompt(form, calc, locale, days),
      undefined,
      0.6,
      locale,
    );

    // Recalcule les macros de chaque jour de façon déterministe (P 13 / G 52 / L 35)
    // à partir des calories réelles : le modèle ne tient pas les pourcentages EMC.
    nutrition.plans.forEach((p) => {
      const kcal = p.caloriesTotales || p.repas.reduce((s, r) => s + (r.calories || 0), 0);
      p.caloriesTotales = kcal;
      p.macros = idealMacros(kcal);
    });

    return NextResponse.json({ nutrition });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
