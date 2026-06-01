import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildNutritionPrompt } from "@/lib/ai/prompts";
import type { PatientForm, CalculationResult, Locale, NutritionProgram } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
}

export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale } = (await req.json()) as Body;
    const prompt = buildNutritionPrompt(form, calc, locale);
    const data = await generateJson<NutritionProgram>(prompt);
    return NextResponse.json(data);
  } catch (err) {
    return handleError(err);
  }
}

function handleError(err: unknown) {
  const message = err instanceof Error ? err.message : "UNKNOWN";
  const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
  return NextResponse.json({ error: message }, { status });
}
