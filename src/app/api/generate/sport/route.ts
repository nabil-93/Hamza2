import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildSportPrompt, buildAnalysisPrompt } from "@/lib/ai/prompts";
import type {
  PatientForm,
  CalculationResult,
  Locale,
  SportProgram,
  MedicalAnalysis,
} from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
}

/** Génère en parallèle le programme sportif ET l'analyse médicale. */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale } = (await req.json()) as Body;

    const [sport, analyse] = await Promise.all([
      generateJson<SportProgram>(buildSportPrompt(form, calc, locale)),
      generateJson<MedicalAnalysis>(buildAnalysisPrompt(form, calc, locale)),
    ]);

    return NextResponse.json({ sport, analyse });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
