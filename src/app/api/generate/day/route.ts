import { NextRequest, NextResponse } from "next/server";
import { generateJson } from "@/lib/ai/openai";
import { buildSingleDayPrompt, buildRegenerateMealPrompt, REGENERATE_MEAL_SYSTEM_PROMPT, dayRole } from "@/lib/ai/prompts";
import { detecterAnomaliesJour, corrigerRepasFallback, corrigerRepasImposerPoisson, compterPoissonReel } from "@/lib/ai/validation";
import { idealMacros } from "@/lib/utils";
import type { PatientForm, CalculationResult, Locale, DailyMealPlan, Meal } from "@/types";

/** Nombre maximum de tentatives de régénération IA par repas invalide. */
const MAX_TENTATIVES_REGENERATION = 2;

const PROTEINE_POISSON_IMPOSEE = "poisson (sardines, maquereau, thon, merlan, saumon ou cabillaud) — OBLIGATOIRE pour atteindre le quota hebdomadaire EXACT de 2 repas poisson";

/**
 * Vérifie le jour généré et corrige automatiquement toute violation BLOQUANTE
 * (fruit/dessert au dîner, œuf au déjeuner, œuf au dîner, poisson hors
 * déjeuner, poisson au-delà ou en-deçà du quota hebdomadaire EXACT de 2) :
 * régénération ciblée du repas via l'IA, puis correction déterministe en
 * dernier recours.
 *
 * @param poissonDejaUtilise Nombre de jours PRÉCÉDENTS de la semaine où du
 *   poisson a déjà été détecté au déjeuner (cf. `compterPoissonReel`).
 * @param dernierJourSemaine `true` si c'est le dernier jour non-vendredi de la
 *   semaine (dimanche) — déclenche la vérification "quota poisson atteint".
 */
async function corrigerAnomaliesBloquantes(
  plan: DailyMealPlan,
  locale: Locale,
  form: PatientForm,
  poissonDejaUtilise: number,
  dernierJourSemaine: boolean,
  jourNom: string,
): Promise<DailyMealPlan> {
  let anomalies = detecterAnomaliesJour(plan, poissonDejaUtilise, dernierJourSemaine, jourNom);
  if (anomalies.length === 0) return plan;

  for (const { mealIndex, raisons } of anomalies) {
    const poissonManquant = raisons.some((r) => r.includes("poisson manquant"));
    const poissonRetire = raisons.some((r) => r.includes("poisson") && !poissonManquant);
    let repasCorrige: Meal | null = null;

    for (let tentative = 1; tentative <= MAX_TENTATIVES_REGENERATION; tentative++) {
      try {
        const candidat = await generateJson<Meal>(
          buildRegenerateMealPrompt(plan, mealIndex, locale, form, poissonManquant ? PROTEINE_POISSON_IMPOSEE : undefined),
          REGENERATE_MEAL_SYSTEM_PROMPT,
          0.85,
          locale,
        );
        const planTest: DailyMealPlan = {
          ...plan,
          repas: plan.repas.map((r, i) => (i === mealIndex ? candidat : r)),
        };
        const stillInvalid = detecterAnomaliesJour(planTest, poissonDejaUtilise, dernierJourSemaine, jourNom).some((a) => a.mealIndex === mealIndex);
        if (!stillInvalid) {
          repasCorrige = candidat;
          break;
        }
        console.warn(`[QC] Régénération ${tentative}/${MAX_TENTATIVES_REGENERATION} encore invalide pour "${plan.repas[mealIndex].type}" (${raisons.join(", ")})`);
      } catch (err) {
        console.warn(`[QC] Échec régénération du repas "${plan.repas[mealIndex].type}" :`, err);
      }
    }

    if (!repasCorrige) {
      console.warn(`[QC] Correction déterministe appliquée pour "${plan.repas[mealIndex].type}" (${raisons.join(", ")})`);
      repasCorrige = poissonManquant
        ? corrigerRepasImposerPoisson(plan.repas[mealIndex])
        : corrigerRepasFallback(plan.repas[mealIndex], raisons);
    }

    // Recale categorieProteine sur le résultat réel de la correction :
    // - poisson imposé (quota incomplet)      -> "poisson"
    // - poisson retiré (quota dépassé/interdit) -> "volaille"
    // - sinon, conserve le label d'origine de dayRole().
    const categorieOrigine = plan.repas[mealIndex].categorieProteine;
    if (poissonManquant) {
      repasCorrige.categorieProteine = "poisson";
    } else if (categorieOrigine) {
      repasCorrige.categorieProteine = poissonRetire && categorieOrigine === "poisson" ? "volaille" : categorieOrigine;
    }

    plan.repas[mealIndex] = repasCorrige;
  }

  // Re-vérification finale (les régénérations successives ne se recoupent pas en pratique).
  anomalies = detecterAnomaliesJour(plan, poissonDejaUtilise, dernierJourSemaine, jourNom);
  if (anomalies.length > 0) {
    console.warn(`[QC] Anomalies résiduelles après correction sur "${plan.jour}" :`, anomalies);
  }

  return plan;
}

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  form: PatientForm;
  calc: CalculationResult;
  locale: Locale;
  jourNom: string;
  autresJours?: string[];
  /** Jours déjà générés cette semaine (mode progressif) — mémoire de l'IA. */
  historyJours?: DailyMealPlan[];
}

/** Génère le menu d'UN SEUL jour (réponse courte → rapide). */
export async function POST(req: NextRequest) {
  try {
    const { form, calc, locale, jourNom, autresJours, historyJours } = (await req.json()) as Body;

    // Calcul UNIQUE des contraintes du jour (protéine, catégorie, dîner, féculent...).
    // Réutilisé pour le prompt ET pour le stamping → cohérence garantie (aucun
    // tirage aléatoire exécuté deux fois).
    const role = (autresJours ?? []).length > 0 ? dayRole(jourNom, historyJours ?? []) : null;

    const plan = await generateJson<DailyMealPlan>(
      buildSingleDayPrompt(form, calc, locale, jourNom, autresJours ?? [], historyJours ?? [], role),
      undefined,
      0.85,
      locale,
    );

    // Catégorie de protéine du déjeuner = celle décidée par dayRole() (source de
    // vérité serveur, indépendante de l'IA) — sert aux quotas hebdomadaires.
    if (role) {
      const dejeuner = plan.repas.find(
        (r) => r.type.toLowerCase().includes("déjeuner") && !r.type.toLowerCase().includes("petit"),
      );
      if (dejeuner) {
        dejeuner.categorieProteine = role.lunchCategorie;
      }
    }

    // Garde-fou BLOQUANT : fruit/dessert au dîner, œuf au déjeuner, œuf au dîner,
    // poisson hors déjeuner, poisson ≠ exactement 2/semaine (jamais 0, 1 ou 3+).
    // Régénération ciblée du repas fautif (avec fallback déterministe) avant
    // de renvoyer le programme à l'utilisateur.
    const poissonDejaUtilise = compterPoissonReel(historyJours ?? []);
    const dernierJourSemaine = jourNom.toLowerCase() === "dimanche";
    await corrigerAnomaliesBloquantes(plan, locale, form, poissonDejaUtilise, dernierJourSemaine, jourNom);

    // Le modèle ne respecte pas fiablement les pourcentages de macros : on les
    // recalcule de façon déterministe à partir des calories réelles du jour,
    // pour garantir P 13 % / G 52 % / L 35 % (réf. EMC).
    const kcal = plan.caloriesTotales || plan.repas.reduce((s, r) => s + (r.calories || 0), 0);
    plan.caloriesTotales = kcal;
    plan.macros = idealMacros(kcal);
    return NextResponse.json({ plan });
  } catch (err) {
    const message = err instanceof Error ? err.message : "UNKNOWN";
    const status = message === "MISSING_OPENAI_KEY" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
