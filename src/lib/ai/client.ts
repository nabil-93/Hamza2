import type {
  PatientForm,
  CalculationResult,
  Locale,
  NutritionResult,
  SportResult,
  GeneratedProgram,
} from "@/types";

export interface GeneratePayload {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  duration?: number;
}

async function postJson<T>(url: string, body: GeneratePayload): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let msg = "GENERATION_FAILED";
    try { msg = JSON.parse(text).error || msg; } catch { msg = text.slice(0, 200) || msg; }
    throw new Error(`HTTP_${res.status}: ${msg}`);
  }
  return (await res.json()) as T;
}

/** Génère programme nutritionnel + analyse médicale (indépendant du sport). */
export async function generateNutrition(payload: GeneratePayload): Promise<NutritionResult> {
  return postJson<NutritionResult>("/api/generate/nutrition", payload);
}

/** Génère programme sportif seul (indépendant de la nutrition). */
export async function generateSport(payload: GeneratePayload): Promise<SportResult> {
  return postJson<SportResult>("/api/generate/sport", payload);
}

/** Assemble NutritionResult + SportResult en GeneratedProgram pour l'export. */
export function assembleProgram(n: NutritionResult, s: SportResult): GeneratedProgram {
  return { analyse: n.analyse, nutrition: n.nutrition, sport: s.sport };
}

// Traduction (cache en mémoire de session).
const translationCache = new Map<string, GeneratedProgram>();

export async function translateProgram(
  program: GeneratedProgram,
  cacheKey: string,
  target: Locale,
): Promise<GeneratedProgram> {
  const key = `${cacheKey}:${target}`;
  const cached = translationCache.get(key);
  if (cached) return cached;

  const res = await fetch("/api/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ program, target }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "TRANSLATION_FAILED");
  }
  const translated = (await res.json()) as GeneratedProgram;
  translationCache.set(key, translated);
  return translated;
}
