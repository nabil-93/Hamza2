import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildTranslationPrompt, TRANSLATION_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import type { GeneratedProgram, Locale } from "@/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  program: GeneratedProgram;
  target: Locale;
}

/** Traduit un programme déjà généré vers la langue cible (FR ⇄ AR). */
export async function POST(req: NextRequest) {
  try {
    const { program, target } = (await req.json()) as Body;
    const prompt = buildTranslationPrompt(program, target);
    const data = await generateJson<GeneratedProgram>(prompt, TRANSLATION_SYSTEM_PROMPT, 0.2);
    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
