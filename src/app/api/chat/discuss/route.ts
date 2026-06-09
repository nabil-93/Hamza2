import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { DISCUSS_SYSTEM_PROMPT, buildDiscussDayPrompt, type ChatTurn } from "@/lib/ai/prompts";
import { idealMacros } from "@/lib/utils";
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
    // Si une proposition de jour est jointe, on fige ses macros (P 13/G 52/L 35).
    const proposition = result.proposition ?? null;
    if (proposition) {
      const kcal = proposition.caloriesTotales || proposition.repas.reduce((s, r) => s + (r.calories || 0), 0);
      proposition.caloriesTotales = kcal;
      proposition.macros = idealMacros(kcal);
    }
    return NextResponse.json({
      reponse: result.reponse ?? "",
      proposition,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
