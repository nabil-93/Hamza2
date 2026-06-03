import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildExtrasPrompt } from "@/lib/ai/prompts";
import type { Locale, DailyMealPlan, Recipe, ShoppingCategory } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  plans: DailyMealPlan[];
  locale: Locale;
}

interface ExtrasResult {
  recettes: Recipe[];
  listeCourses: ShoppingCategory[];
}

/** Génère recettes + liste de courses à partir des menus déjà établis. */
export async function POST(req: NextRequest) {
  try {
    const { plans, locale } = (await req.json()) as Body;
    const data = await generateJson<ExtrasResult>(buildExtrasPrompt(plans, locale));
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
