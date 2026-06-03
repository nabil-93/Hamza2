import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildAnalysisPrompt } from "@/lib/ai/prompts";
import type { PatientForm, CalculationResult, Locale, MedicalAnalysis } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
}

/** Génère UNIQUEMENT l'analyse médicale (rapide, indépendante). */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale } = (await req.json()) as Body;
    const analyse = await generateJson<MedicalAnalysis>(buildAnalysisPrompt(form, calc, locale));
    return NextResponse.json({ analyse });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
