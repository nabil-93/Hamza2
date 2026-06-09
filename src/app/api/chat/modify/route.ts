import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { CHAT_SYSTEM_PROMPT, buildModifyDayPrompt } from "@/lib/ai/prompts";
import type { Locale, DailyMealPlan, PatientForm } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Type de cible modifiable. */
type Target = { kind: "day"; index: number; data: DailyMealPlan };

interface Body {
  target: Target;
  instruction: string;
  locale: Locale;
  form?: PatientForm;
}

/**
 * Modification CIBLÉE d'une partie du programme via instruction libre.
 * Ne régénère que l'élément visé → requête courte, pas de timeout.
 */
export async function POST(req: NextRequest) {
  try {
    const { target, instruction, locale, form } = (await req.json()) as Body;

    if (target.kind === "day") {
      const updated = await generateJson<DailyMealPlan>(
        buildModifyDayPrompt(target.data, instruction, locale, form),
        CHAT_SYSTEM_PROMPT,
        0.6,
        locale,
      );
      return NextResponse.json({ kind: "day", index: target.index, data: updated });
    }

    return NextResponse.json({ error: "UNSUPPORTED_TARGET" }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
