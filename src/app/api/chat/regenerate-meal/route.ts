import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { REGENERATE_MEAL_SYSTEM_PROMPT, buildRegenerateMealPrompt } from "@/lib/ai/prompts";
import type { PatientForm, Locale, DailyMealPlan, Meal } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  jour: DailyMealPlan;
  mealIndex: number;
  locale: Locale;
  form: PatientForm;
}

/**
 * Régénère UN SEUL repas d'un jour et renvoie le jour complet mis à jour
 * (avec ses caloriesTotales recalculées).
 */
export async function POST(req: NextRequest) {
  try {
    const { jour, mealIndex, locale, form } = (await req.json()) as Body;

    const newMeal = await generateJson<Meal>(
      buildRegenerateMealPrompt(jour, mealIndex, locale, form),
      REGENERATE_MEAL_SYSTEM_PROMPT,
      0.85,
      locale,
    );

    // Remplace le repas et recalcule le total calorique du jour.
    const repas = jour.repas.map((r, i) => (i === mealIndex ? newMeal : r));
    const caloriesTotales = repas.reduce((sum, r) => sum + (r.calories || 0), 0);
    const updatedJour: DailyMealPlan = { ...jour, repas, caloriesTotales };

    return NextResponse.json({ jour: updatedJour });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
