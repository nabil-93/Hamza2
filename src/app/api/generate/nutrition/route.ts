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

function describeDeviations(prog: NutritionProgram): string {
  return prog.plans
    .filter((p) => !macrosInRange(p.macros))
    .map((p) => {
      const m = macroPercents(p.macros);
      return `${p.jour} → P ${m.proteines}% / G ${m.glucides}% / L ${m.lipides}%`;
    })
    .join(" ; ");
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

    const deviations = describeDeviations(nutrition);
    if (deviations) console.warn("[nutrition] macros hors EMC:", deviations);

    return NextResponse.json({ nutrition });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
