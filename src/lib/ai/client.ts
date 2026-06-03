import type {
  PatientForm,
  CalculationResult,
  Locale,
  GeneratedProgram,
  NutritionProgram,
  SportProgram,
  MedicalAnalysis,
} from "@/types";

interface Payload {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  /** Durée du plan alimentaire en jours (1, 7 ou 14). */
  duration?: number;
}

async function postJson<T>(url: string, body: Payload): Promise<T> {
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

/** Lance la génération complète (nutrition + sport + analyse) en parallèle. */
export async function generateProgram(payload: Payload): Promise<GeneratedProgram> {
  const [nutrition, sportAnalyse] = await Promise.all([
    postJson<NutritionProgram>("/api/generate/nutrition", payload),
    postJson<{ sport: SportProgram; analyse: MedicalAnalysis }>("/api/generate/sport", payload),
  ]);

  return {
    nutrition,
    sport: sportAnalyse.sport,
    analyse: sportAnalyse.analyse,
  };
}

/** Traduit un programme vers la langue cible (avec cache en mémoire de session). */
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
