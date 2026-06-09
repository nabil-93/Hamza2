import type {
  PatientForm,
  CalculationResult,
  Locale,
  NutritionResult,
  SportResult,
  GeneratedProgram,
  NutritionProgram,
  MedicalAnalysis,
  DailyMealPlan,
  Recipe,
  ShoppingCategory,
} from "@/types";

export type { MedicalAnalysis };

const JOURS_SEMAINE = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

async function postRaw<T>(url: string, body: unknown): Promise<T> {
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

/**
 * Génère le programme nutritionnel + l'analyse médicale.
 *
 * - Jour type : 1 requête nutrition + 1 requête analyse (parallèle).
 * - Semaine (7 j) : pour éviter les timeouts, chaque jour est généré par une
 *   requête COURTE séparée (7 en parallèle), puis recettes + liste de courses
 *   et l'analyse. Aucune requête longue → pas de timeout.
 */
export async function generateNutrition(payload: GeneratePayload): Promise<NutritionResult> {
  const days = payload.duration === 7 ? 7 : 1;

  if (days === 1) {
    const [nutritionRes, analyseRes] = await Promise.all([
      postJson<{ nutrition: NutritionProgram }>("/api/generate/nutrition", payload),
      postJson<{ analyse: MedicalAnalysis }>("/api/generate/analyse", payload),
    ]);
    return { nutrition: nutritionRes.nutrition, analyse: analyseRes.analyse };
  }

  // Semaine : 7 jours en parallèle + analyse en parallèle.
  const { form, calc, locale } = payload;
  const dayPromises = JOURS_SEMAINE.map((jourNom) =>
    postRaw<{ plan: DailyMealPlan }>("/api/generate/day", {
      form, calc, locale, jourNom, autresJours: JOURS_SEMAINE.filter((j) => j !== jourNom),
    }),
  );
  const analysePromise = postJson<{ analyse: MedicalAnalysis }>("/api/generate/analyse", payload);

  const [dayResults, analyseRes] = await Promise.all([Promise.all(dayPromises), analysePromise]);
  const plans = dayResults.map((d) => d.plan);

  // Recettes + liste de courses à partir des menus (1 requête courte).
  const extras = await postRaw<{ recettes: Recipe[]; listeCourses: ShoppingCategory[] }>(
    "/api/generate/extras",
    { plans, locale },
  );

  const nutrition: NutritionProgram = {
    plans,
    recettes: extras.recettes,
    listeCourses: extras.listeCourses,
    resumeNutritionnel:
      locale === "ar"
        ? "برنامج غذائي متوسطي لمدة أسبوع، متنوع ومتوازن وفق المرجع الطبي."
        : "Programme alimentaire méditerranéen sur une semaine, varié et équilibré selon le référentiel médical.",
  };

  return { nutrition, analyse: analyseRes.analyse };
}

/** Génère programme sportif seul (indépendant de la nutrition). */
export async function generateSport(payload: GeneratePayload): Promise<SportResult> {
  return postJson<SportResult>("/api/generate/sport", payload);
}

/** Assemble NutritionResult + SportResult en GeneratedProgram pour l'export. */
export function assembleProgram(n: NutritionResult, s: SportResult): GeneratedProgram {
  return { analyse: n.analyse, nutrition: n.nutrition, sport: s.sport };
}

/**
 * Génère UN seul jour (mode semaine progressive).
 * Passe l'historique complet des jours déjà générés pour garantir variété et mémoire.
 */
export async function generateOneDay(
  payload: GeneratePayload,
  jourNom: string,
  historyJours: DailyMealPlan[],
): Promise<DailyMealPlan> {
  const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  const autresJours = JOURS.filter((j) => j !== jourNom && !historyJours.some((h) => h.jour === j));
  const res = await postRaw<{ plan: DailyMealPlan }>("/api/generate/day", {
    form: payload.form,
    calc: payload.calc,
    locale: payload.locale,
    jourNom,
    autresJours,
    historyJours,
  });
  return res.plan;
}

/** Génère l'analyse médicale seule. */
export async function generateAnalyse(payload: GeneratePayload): Promise<MedicalAnalysis> {
  const res = await postJson<{ analyse: MedicalAnalysis }>("/api/generate/analyse", payload);
  return res.analyse;
}

/** Modifie un jour de menu via instruction libre (chat). Renvoie le jour mis à jour. */
export async function modifyDay(
  index: number,
  day: DailyMealPlan,
  instruction: string,
  locale: Locale,
  form?: PatientForm,
): Promise<DailyMealPlan> {
  const res = await postRaw<{ kind: string; index: number; data: DailyMealPlan }>(
    "/api/chat/modify",
    { target: { kind: "day", index, data: day }, instruction, locale, form },
  );
  return res.data;
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
