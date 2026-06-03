import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildNutritionPrompt } from "@/lib/ai/prompts";
import { macrosInRange, macroPercents } from "@/lib/utils";
import type { PatientForm, CalculationResult, Locale, NutritionProgram } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  duration?: number;
}

/** Tous les jours respectent-ils les fourchettes de macros EMC ? */
function allDaysValid(prog: NutritionProgram): boolean {
  return prog.plans.every((p) => macrosInRange(p.macros));
}

/** Liste lisible des écarts, pour guider la correction par l'IA. */
function describeDeviations(prog: NutritionProgram): string {
  return prog.plans
    .filter((p) => !macrosInRange(p.macros))
    .map((p) => {
      const m = macroPercents(p.macros);
      return `${p.jour} → P ${m.proteines}% / G ${m.glucides}% / L ${m.lipides}% (cible : P 11-15, G 50-55, L 35-40)`;
    })
    .join(" ; ");
}

export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale, duration } = (await req.json()) as Body;
    const days = duration === 7 || duration === 14 ? duration : 1;
    const prompt = buildNutritionPrompt(form, calc, locale, days);

    let data = await generateJson<NutritionProgram>(prompt);

    // Garantie EMC : si un jour est hors fourchette, UNE correction ciblée.
    // (Une seule reprise pour rester dans les limites de temps de Vercel.)
    if (!allDaysValid(data)) {
      const fixPrompt = `${prompt}

CORRECTION OBLIGATOIRE — la répartition des macronutriments doit IMPÉRATIVEMENT respecter, pour CHAQUE jour : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %.
Jours à corriger : ${describeDeviations(data)}.
Ajuste les quantités (féculents, huile, protéines) pour rentrer dans ces fourchettes, puis renvoie le JSON complet corrigé.`;
      try {
        const retry = await generateJson<NutritionProgram>(fixPrompt);
        if (allDaysValid(retry)) data = retry;
      } catch {
        // En cas d'échec de la reprise, on garde le premier résultat.
      }
    }

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
