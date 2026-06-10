import type { DailyMealPlan, Meal } from "@/types";

/** Mots-clés de fruits (frais, séchés, jus, compotes...). */
const MOTS_FRUIT = [
  "pomme", "orange", "banane", "poire", "fraise", "pêche", "peche", "raisin", "kiwi",
  "mandarine", "clémentine", "clementine", "abricot", "prune", "datte", "figue",
  "pastèque", "pasteque", "melon", "ananas", "mangue", "fruit",
];

/** Mots-clés de desserts / laitages sucrés. */
const MOTS_DESSERT = [
  "compote", "salade de fruits", "dessert", "yaourt aux fruits", "yaourt sucré", "yaourt sucre",
  "crème dessert", "creme dessert", "flan", "pâtisserie", "patisserie", "gâteau", "gateau",
];

const MOTS_OEUF = ["œuf", "oeuf"];

/**
 * Mots-clés d'aliments INTERDITS au dîner par la banque fermée DINER_OPTIONS
 * (légumes/soupe + protéine UNIQUEMENT — aucun ajout de pain, laitage, féculent...).
 */
const MOTS_HORS_BANQUE_DINER = [
  "fromage", "yaourt", "yahourt", "pain", "riz", "pâtes", "pates", "semoule",
  "boulgour", "pomme de terre", "huile",
];

/**
 * Mots-clés POISSON au sens strict (toute mention, même en garniture).
 * Les fruits de mer (crevette, moules, calamar...) sont autorisés au dîner
 * (cf. DINER_OPTIONS « Légumes au four + fruits de mer ») et NE comptent PAS
 * dans le quota poisson — voir `MOTS_FRUITS_DE_MER`.
 */
const MOTS_POISSON = [
  "poisson", "sardine", "maquereau", "thon", "merlan", "saumon", "cabillaud", "sole", "lotte", "dorade",
];

function texteRepas(repas: Meal): string {
  const ingr = (repas.ingredients ?? []).map((i) => i.nom).join(" ");
  return `${repas.nom} ${ingr}`.toLowerCase();
}

function contient(texte: string, mots: string[]): boolean {
  return mots.some((m) => texte.includes(m));
}

function estPetitDejeuner(type: string): boolean {
  return type.includes("petit");
}

function estDejeuner(type: string): boolean {
  return (type.includes("déjeuner") || type.includes("dejeuner")) && !type.includes("petit");
}

function estDiner(type: string): boolean {
  return type.includes("dîner") || type.includes("diner");
}

export interface AnomalieRepas {
  mealIndex: number;
  raisons: string[];
}

/**
 * Compte le nombre de jours (déjà générés cette semaine) dont le déjeuner
 * contient RÉELLEMENT du poisson — détection par mots-clés sur le texte du
 * plat, indépendante de `categorieProteine` (qui n'est qu'un label de
 * planification et n'empêche pas l'IA d'ajouter du poisson en garniture).
 */
export function compterPoissonReel(historyJours: DailyMealPlan[]): number {
  return historyJours.filter((jour) => {
    const dej = jour.repas.find((r) => estDejeuner(r.type.toLowerCase()));
    return dej ? contient(texteRepas(dej), MOTS_POISSON) : false;
  }).length;
}

/** Quota hebdomadaire EXACT de poisson (déjeuner uniquement). */
export const POISSON_OBJECTIF_HEBDO = 2;

/**
 * Détecte les anomalies BLOQUANTES sur un jour généré :
 * - fruit ou dessert au dîner
 * - œuf au déjeuner
 * - œuf au dîner
 * - poisson au petit-déjeuner ou au dîner (réservé au déjeuner)
 * - poisson au déjeuner au-delà du quota hebdomadaire EXACT de 2
 * - dernier jour de la semaine : quota poisson PAS ENCORE ATTEINT (jamais 0, jamais 1)
 * - dîner contenant un ingrédient hors banque fermée DINER_OPTIONS (pain,
 *   fromage, yaourt, féculent, huile listée séparément...)
 * (le petit-déjeuner sans fruit/dessert et le déjeuner avec exactement 1 fruit
 * sont déjà couverts par le prompt et ne sont pas re-vérifiés ici.)
 *
 * @param poissonDejaUtilise Nombre de jours PRÉCÉDENTS de la semaine où du
 *   poisson a déjà été détecté au déjeuner (cf. `compterPoissonReel`).
 * @param dernierJourSemaine `true` si `jour` est le dernier jour non-vendredi
 *   de la semaine (dimanche) — déclenche la vérification "quota atteint".
 */
export function detecterAnomaliesJour(
  jour: DailyMealPlan,
  poissonDejaUtilise = 0,
  dernierJourSemaine = false,
): AnomalieRepas[] {
  const anomalies: AnomalieRepas[] = [];

  jour.repas.forEach((repas, mealIndex) => {
    const type = repas.type.toLowerCase();
    const texte = texteRepas(repas);
    const raisons: string[] = [];
    const poissonIci = contient(texte, MOTS_POISSON);

    if (estPetitDejeuner(type)) {
      if (poissonIci) raisons.push("poisson au petit-déjeuner");
    }

    if (estDiner(type)) {
      if (contient(texte, MOTS_FRUIT)) raisons.push("fruit au dîner");
      if (contient(texte, MOTS_DESSERT)) raisons.push("dessert au dîner");
      if (contient(texte, MOTS_OEUF)) raisons.push("œuf au dîner");
      if (poissonIci) raisons.push("poisson au dîner");
      const ingredientsHorsBanque = (repas.ingredients ?? []).filter((ing) =>
        contient(ing.nom.toLowerCase(), MOTS_HORS_BANQUE_DINER),
      );
      if (ingredientsHorsBanque.length > 0) {
        raisons.push(
          `ingrédient hors banque DINER_OPTIONS au dîner (${ingredientsHorsBanque.map((i) => i.nom).join(", ")})`,
        );
      }
    }

    if (estDejeuner(type)) {
      if (contient(texte, MOTS_OEUF)) raisons.push("œuf au déjeuner");
      if (poissonIci && poissonDejaUtilise >= POISSON_OBJECTIF_HEBDO) {
        raisons.push(`poisson au déjeuner au-delà du quota hebdomadaire (${POISSON_OBJECTIF_HEBDO} exactement)`);
      }
      if (!poissonIci && dernierJourSemaine && poissonDejaUtilise + (poissonIci ? 1 : 0) < POISSON_OBJECTIF_HEBDO) {
        raisons.push(`poisson manquant pour atteindre le quota hebdomadaire (${POISSON_OBJECTIF_HEBDO} exactement)`);
      }
    }

    if (raisons.length > 0) {
      anomalies.push({ mealIndex, raisons });
    }
  });

  return anomalies;
}

/**
 * Correction déterministe de dernier recours, appliquée si la régénération IA
 * échoue toujours après plusieurs tentatives. Retire les ingrédients fruit/
 * dessert/œuf incriminés et les remplace par un complément neutre conforme.
 */
export function corrigerRepasFallback(repas: Meal, raisons: string[]): Meal {
  const type = repas.type.toLowerCase();
  const motsAExclure = [
    ...(raisons.some((r) => r.includes("fruit")) ? MOTS_FRUIT : []),
    ...(raisons.some((r) => r.includes("dessert")) ? MOTS_DESSERT : []),
    ...(raisons.some((r) => r.includes("œuf")) ? MOTS_OEUF : []),
    ...(raisons.some((r) => r.includes("poisson")) ? MOTS_POISSON : []),
    ...(raisons.some((r) => r.includes("hors banque")) ? MOTS_HORS_BANQUE_DINER : []),
  ];

  const ingredients = repas.ingredients.filter((ing) => !contient(ing.nom.toLowerCase(), motsAExclure));

  // Si l'œuf ou le poisson retiré était la protéine principale, on ajoute un
  // remplacement conforme au rôle du repas (déjeuner/dîner = volaille).
  const proteineRetiree = raisons.some((r) => r.includes("œuf") || r.includes("poisson"));
  if (proteineRetiree && (estDejeuner(type) || estDiner(type))) {
    ingredients.push({ nom: "Blanc de poulet", quantite: "120 g", preparation: "grillé" });
  }

  const nom = repas.nom
    .split(/[+,]/)
    .map((part) => part.trim())
    .filter((part) => !contient(part.toLowerCase(), motsAExclure))
    .join(proteineRetiree ? " + Blanc de poulet" : "");

  return {
    ...repas,
    nom: nom || repas.nom,
    ingredients: ingredients.length > 0 ? ingredients : repas.ingredients,
  };
}

/**
 * Correction déterministe de dernier recours : impose du poisson au déjeuner
 * (remplace la protéine actuelle) pour garantir le quota hebdomadaire EXACT
 * de 2 repas poisson, quand on arrive au dernier jour de la semaine sans
 * l'avoir atteint.
 */
export function corrigerRepasImposerPoisson(repas: Meal): Meal {
  // Retire toute mention de protéine "classique" pour éviter le doublon
  // (volaille/viande rouge/œuf), garde le reste (légumes, féculent, pain).
  const motsProteineNonPoisson = [
    "poulet", "dinde", "escalope", "volaille", "steak", "viande hachée", "viande maigre",
    "brochette", "bœuf", "boeuf", ...MOTS_OEUF,
  ];
  const ingredients = repas.ingredients.filter((ing) => !contient(ing.nom.toLowerCase(), motsProteineNonPoisson));
  ingredients.push({ nom: "Sardines grillées", quantite: "150 g", preparation: "grillé" });

  const nom = repas.nom
    .split(/[+,]/)
    .map((part) => part.trim())
    .filter((part) => !contient(part.toLowerCase(), motsProteineNonPoisson))
    .concat("Sardines grillées")
    .join(" + ");

  return {
    ...repas,
    nom: nom || repas.nom,
    ingredients,
  };
}
