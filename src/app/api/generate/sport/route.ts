import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildSportPrompt } from "@/lib/ai/prompts";
import type { PatientForm, CalculationResult, Locale, SportResult } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
}

/** Génère UNIQUEMENT le programme sportif (indépendant de la nutrition). */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale } = (await req.json()) as Body;
    const sport = await generateJson<SportResult["sport"]>(buildSportPrompt(form, calc, locale));
    return NextResponse.json({ sport } satisfies SportResult);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
