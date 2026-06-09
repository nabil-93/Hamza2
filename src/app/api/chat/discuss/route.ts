import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { DISCUSS_SYSTEM_PROMPT, buildDiscussDayPrompt, type ChatTurn } from "@/lib/ai/prompts";
import type { PatientForm, CalculationResult, Locale, DailyMealPlan } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  jour: DailyMealPlan;
  message: string;
  locale: Locale;
  form: PatientForm;
  calc: CalculationResult;
  history?: ChatTurn[];
}

/** Réponse de l'IA : texte + proposition optionnelle de jour modifié. */
interface DiscussResult {
  reponse: string;
  proposition: DailyMealPlan | null;
}

/**
 * Chat CONVERSATIONNEL sur un jour de menu.
 * L'IA répond par du texte et ne joint une proposition de jour modifié
 * que si le médecin demande explicitement une modification.
 */
export async function POST(req: NextRequest) {
  try {
    const { jour, message, locale, form, calc, history } = (await req.json()) as Body;
    const result = await generateJson<DiscussResult>(
      buildDiscussDayPrompt(jour, message, locale, form, calc, history ?? []),
      DISCUSS_SYSTEM_PROMPT,
      0.6,
      locale,
    );
    return NextResponse.json({
      reponse: result.reponse ?? "",
      proposition: result.proposition ?? null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
