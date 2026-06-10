/**
 * VALIDATION COMPLÈTE — 10 SEMAINES SIMULÉES (70 jours).
 *
 * Simule la planification serveur (dayRole) sur 10 semaines indépendantes,
 * construit les jours « ordonnance » correspondants et fait passer CHAQUE jour
 * dans le validateur (detecterAnomaliesJour) avec le jour de la veille.
 *
 * Vérifie :
 *  1. Aucun petit-déjeuner identique à la veille.
 *  2. Aucun déjeuner identique à la veille (protéine + féculent).
 *  3. Aucun dîner identique à la veille.
 *  4. Déjeuner : légumes autorisés + 150 g protéine + UN SEUL féculent.
 *  5. Jamais deux féculents au déjeuner. Jamais de boulgour.
 *  6. Poisson EXACTEMENT 2 déjeuners/semaine. Viande rouge ≤ 2/semaine.
 *  7. Couscous uniquement le vendredi midi.
 *  8. Dîner = banque fermée (œuf uniquement « durs », poisson uniquement « soupe »).
 *
 * Puis exécute une batterie de TESTS NÉGATIFS (violations injectées qui
 * DOIVENT être détectées) et de tests des corrections déterministes.
 *
 * Usage : npx tsx scripts/validate-10-semaines.ts
 */

import { dayRole } from "@/lib/ai/prompts";
import {
  detecterAnomaliesJour,
  compterPoissonReel,
  indexOptionPetitDej,
  indexOptionDiner,
  familleProteineDejeuner,
  feculentPrincipalDejeuner,
  corrigerRepasFallback,
  reconstruireDepuisBanque,
  permuterFeculentDejeuner,
  texteDuRepas,
} from "@/lib/ai/validation";
import { PETIT_DEJ_OPTIONS, DINER_OPTIONS } from "@/data/meal-bank";
import type { DailyMealPlan, Meal } from "@/types";

const JOURS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const NB_SEMAINES = 10;

let erreurs = 0;
let avertissements = 0;
const log = (msg: string) => console.log(msg);
const erreur = (msg: string) => {
  erreurs++;
  console.error(`  ❌ ${msg}`);
};

/* ------------------------------------------------------------------ */
/* Construction de jours synthétiques « ordonnance » depuis dayRole()  */
/* ------------------------------------------------------------------ */

function repasPetitDej(option: string): Meal {
  return {
    type: "Petit-déjeuner",
    nom: option.replace(" (sans fruit)", ""),
    calories: 350,
    ingredients: [{ nom: option.replace(" (sans fruit)", ""), quantite: "1 portion", preparation: "—" }],
  };
}

function repasDejeuner(role: ReturnType<typeof dayRole>, jourNom: string): Meal {
  if (jourNom === "Vendredi") {
    return {
      type: "Déjeuner",
      nom: "Couscous marocain du vendredi + 1 fruit",
      calories: 750,
      categorieProteine: "couscous",
      ingredients: [
        { nom: "Semoule de couscous", quantite: "100 g", preparation: "cuite à la vapeur" },
        { nom: "Poulet", quantite: "150 g", preparation: "mijoté" },
        { nom: "Légumes du couscous (courgette, carotte, navet)", quantite: "200 g", preparation: "cuits" },
        { nom: "1 fruit de saison", quantite: "1", preparation: "cru" },
      ],
    };
  }
  const proteine = role.lunch.replace(" + 1 fruit en dessert", "");
  return {
    type: "Déjeuner",
    nom: `Salade de légumes + ${proteine} + ${role.starch} + 1 fruit`,
    calories: 700,
    categorieProteine: role.lunchCategorie,
    ingredients: [
      { nom: "Légumes autorisés (concombre, tomate, laitue, courgette)", quantite: "200 g", preparation: "crus/cuits" },
      { nom: proteine, quantite: "150 g", preparation: "grillé" },
      { nom: role.starch, quantite: "1 portion", preparation: "cuit" },
      { nom: "1 fruit de saison", quantite: "1", preparation: "cru" },
      { nom: "Huile d'olive", quantite: "10 g", preparation: "—" },
    ],
  };
}

function repasDiner(option: string): Meal {
  const parts = option.split("+").map((p) => p.trim());
  return {
    type: "Dîner",
    nom: option,
    calories: 450,
    ingredients: parts.map((p) => ({ nom: p, quantite: "1 portion", preparation: "—" })),
  };
}

function jourDepuisRole(role: ReturnType<typeof dayRole>, jourNom: string): DailyMealPlan {
  return {
    jour: jourNom,
    caloriesTotales: 1500,
    macros: { proteines: 50, glucides: 190, lipides: 60 },
    repas: [repasPetitDej(role.breakfast), repasDejeuner(role, jourNom), repasDiner(role.dinner)],
  };
}

function trouverRepas(jour: DailyMealPlan, type: "petit" | "dej" | "diner"): Meal {
  return jour.repas.find((r) => {
    const t = r.type.toLowerCase();
    if (type === "petit") return t.includes("petit");
    if (type === "diner") return t.includes("dîner") || t.includes("diner");
    return (t.includes("déjeuner") || t.includes("dejeuner")) && !t.includes("petit");
  })!;
}

/* ------------------------------------------------------------------ */
/* PARTIE 1 — Simulation de 10 semaines                                 */
/* ------------------------------------------------------------------ */

log("════════════════════════════════════════════════════════════");
log(`PARTIE 1 — SIMULATION DE ${NB_SEMAINES} SEMAINES (${NB_SEMAINES * 7} jours)`);
log("════════════════════════════════════════════════════════════");

const distribPetitDej = new Map<number, number>();
const distribDiner = new Map<number, number>();
let totalAnomalies = 0;

for (let semaine = 1; semaine <= NB_SEMAINES; semaine++) {
  const history: DailyMealPlan[] = [];

  for (const jourNom of JOURS) {
    const role = dayRole(jourNom, history);
    const jour = jourDepuisRole(role, jourNom);
    const veille = history.length > 0 ? history[history.length - 1] : null;

    // 1) Validation officielle (celle exécutée par la route /api/generate/day).
    const anomalies = detecterAnomaliesJour(
      jour,
      compterPoissonReel(history),
      jourNom === "Dimanche",
      jourNom,
      veille,
    );
    if (anomalies.length > 0) {
      totalAnomalies += anomalies.length;
      for (const a of anomalies) {
        erreur(`S${semaine} ${jourNom} — anomalie sur « ${jour.repas[a.mealIndex].type} » : ${a.raisons.join(" ; ")}`);
      }
    }

    // 2) Vérifications anti-répétition croisées avec la veille.
    if (veille) {
      const pdA = indexOptionPetitDej(texteDuRepas(trouverRepas(jour, "petit")));
      const pdB = indexOptionPetitDej(texteDuRepas(trouverRepas(veille, "petit")));
      if (pdA !== -1 && pdA === pdB) erreur(`S${semaine} ${jourNom} — petit-déjeuner identique à la veille (option ${pdA + 1})`);

      const dnA = indexOptionDiner(texteDuRepas(trouverRepas(jour, "diner")));
      const dnB = indexOptionDiner(texteDuRepas(trouverRepas(veille, "diner")));
      if (dnA !== -1 && dnA === dnB) erreur(`S${semaine} ${jourNom} — dîner identique à la veille (option ${dnA + 1})`);

      const dejTexte = texteDuRepas(trouverRepas(jour, "dej"));
      const dejVeilleTexte = texteDuRepas(trouverRepas(veille, "dej"));
      const protA = familleProteineDejeuner(dejTexte);
      const protB = familleProteineDejeuner(dejVeilleTexte);
      const fecA = feculentPrincipalDejeuner(dejTexte);
      const fecB = feculentPrincipalDejeuner(dejVeilleTexte);
      const poissonForce = role.lunch.includes("OBLIGATOIRE");
      if (protA && protA === protB && fecA && fecA === fecB && !poissonForce && jourNom !== "Vendredi") {
        erreur(`S${semaine} ${jourNom} — déjeuner identique à la veille (${protA} + ${fecA})`);
      }
    }

    // Stats de variété.
    const pdIdx = indexOptionPetitDej(role.breakfast);
    const dnIdx = indexOptionDiner(role.dinner);
    distribPetitDej.set(pdIdx, (distribPetitDej.get(pdIdx) ?? 0) + 1);
    distribDiner.set(dnIdx, (distribDiner.get(dnIdx) ?? 0) + 1);

    history.push(jour);
  }

  // 3) Quotas hebdomadaires.
  const poisson = compterPoissonReel(history);
  if (poisson !== 2) erreur(`S${semaine} — quota poisson = ${poisson} déjeuners (attendu : exactement 2)`);
  const viandeRouge = history.filter((j) => trouverRepas(j, "dej").categorieProteine === "viande_rouge").length;
  if (viandeRouge > 2) erreur(`S${semaine} — viande rouge = ${viandeRouge} déjeuners (max 2)`);
  const couscousHorsVendredi = history.filter(
    (j) => j.jour !== "Vendredi" && texteDuRepas(trouverRepas(j, "dej")).includes("couscous"),
  ).length;
  if (couscousHorsVendredi > 0) erreur(`S${semaine} — couscous hors vendredi (${couscousHorsVendredi} jour(s))`);
}

log(`\n  Jours simulés        : ${NB_SEMAINES * 7}`);
log(`  Anomalies détectées  : ${totalAnomalies}`);
log(`  Répartition petit-déjeuner (option → tirages) : ${[...distribPetitDej.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `opt${k + 1}=${v}`).join(", ")}`);
log(`  Répartition dîner (option → tirages)          : ${[...distribDiner.entries()].sort((a, b) => a[0] - b[0]).map(([k, v]) => `opt${k + 1}=${v}`).join(", ")}`);
const pdManquantes = PETIT_DEJ_OPTIONS.map((_, i) => i).filter((i) => !distribPetitDej.has(i));
const dnManquantes = DINER_OPTIONS.map((_, i) => i).filter((i) => !distribDiner.has(i));
if (pdManquantes.length > 0) {
  avertissements++;
  log(`  ⚠️ Options petit-déjeuner jamais tirées sur 70 jours : ${pdManquantes.map((i) => i + 1).join(", ")}`);
}
if (dnManquantes.length > 0) {
  avertissements++;
  log(`  ⚠️ Options dîner jamais tirées sur 70 jours : ${dnManquantes.map((i) => i + 1).join(", ")}`);
}

/* ------------------------------------------------------------------ */
/* PARTIE 2 — Tests négatifs (violations qui DOIVENT être détectées)    */
/* ------------------------------------------------------------------ */

log("\n════════════════════════════════════════════════════════════");
log("PARTIE 2 — TESTS NÉGATIFS (chaque violation doit être détectée)");
log("════════════════════════════════════════════════════════════");

function meal(type: string, nom: string, ingredients: string[]): Meal {
  return { type, nom, calories: 400, ingredients: ingredients.map((i) => ({ nom: i, quantite: "1 portion" })) };
}
function jourAvec(...repas: Meal[]): DailyMealPlan {
  return { jour: "Mardi", caloriesTotales: 1500, macros: { proteines: 50, glucides: 190, lipides: 60 }, repas };
}
const dejOk = meal("Déjeuner", "Salade + poulet + riz + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Riz complet 100 g", "1 fruit"]);
const pdOk = meal("Petit-déjeuner", "Légumes + ½ avocat + pain complet", ["Concombre", "Tomate", "Laitue", "Avocat 1/2", "Pain complet 50 g"]);
const dinerOk = meal("Dîner", "Soupe de légumes + 150 g de poulet", ["Soupe de légumes", "Blanc de poulet 150 g"]);

function attend(nomTest: string, jour: DailyMealPlan, motif: string, veille: DailyMealPlan | null = null) {
  const anomalies = detecterAnomaliesJour(jour, 0, false, "Mardi", veille);
  const trouve = anomalies.some((a) => a.raisons.some((r) => r.includes(motif)));
  if (trouve) log(`  ✅ ${nomTest}`);
  else erreur(`${nomTest} — violation NON détectée (motif attendu : « ${motif} »)`);
}
function attendAucune(nomTest: string, jour: DailyMealPlan, veille: DailyMealPlan | null = null) {
  const anomalies = detecterAnomaliesJour(jour, 0, false, "Mardi", veille);
  if (anomalies.length === 0) log(`  ✅ ${nomTest}`);
  else erreur(`${nomTest} — faux positif : ${anomalies.map((a) => a.raisons.join(" ; ")).join(" | ")}`);
}

// Anti-répétition veille
const veilleJour = jourAvec(
  meal("Petit-déjeuner", "Légumes + 1 œuf au plat + pain complet + huile d'olive", ["Concombre", "Tomate", "Laitue", "Œuf au plat", "Pain complet 50 g", "Huile d'olive 5 g"]),
  meal("Déjeuner", "Salade + poulet + riz + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Riz complet 100 g", "1 fruit"]),
  meal("Dîner", "Soupe de légumes + 150 g de poulet", ["Soupe de légumes", "Blanc de poulet 150 g"]),
);
attend(
  "Petit-déjeuner identique à la veille (œuf 2 jours de suite) → refusé",
  jourAvec(meal("Petit-déjeuner", "Légumes + 1 œuf dur + pain complet + huile d'olive", ["Concombre", "Tomate", "Laitue", "Œuf dur", "Pain complet 50 g", "Huile d'olive 5 g"]), dejOk, dinerOk),
  "petit-déjeuner identique à la veille",
  veilleJour,
);
attend(
  "Dîner identique à la veille (soupe + poulet 2 jours de suite) → refusé",
  jourAvec(pdOk, dejOk, meal("Dîner", "Soupe de légumes + 150 g de poulet", ["Soupe de légumes", "Blanc de poulet 150 g"])),
  "dîner identique à la veille",
  veilleJour,
);
attend(
  "Déjeuner identique à la veille (poulet + riz 2 jours de suite) → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + poulet + riz + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Riz complet 100 g", "1 fruit"]), dinerOk),
  "déjeuner identique à la veille",
  veilleJour,
);
attendAucune(
  "Petit-déjeuner DIFFÉRENT de la veille (avocat après œuf) → accepté",
  jourAvec(pdOk, meal("Déjeuner", "Salade + steak + pain complet + 1 fruit", ["Légumes autorisés", "Steak de viande 150 g", "Pain complet 50 g", "1 fruit"]), meal("Dîner", "Légumes au four + 150 g de poulet", ["Légumes au four", "Blanc de poulet 150 g"])),
  veilleJour,
);

// Structure du déjeuner
attend(
  "Deux féculents au déjeuner (pain + riz) → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + poulet + pain + riz + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Pain complet 50 g", "Riz complet 100 g", "1 fruit"]), dinerOk),
  "deux féculents",
);
attend(
  "Boulgour au déjeuner → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + poulet + boulgour + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Boulgour 100 g", "1 fruit"]), dinerOk),
  "boulgour",
);
attend(
  "Féculent manquant au déjeuner → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + poulet + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "1 fruit"]), dinerOk),
  "féculent manquant",
);
attend(
  "Protéine manquante au déjeuner → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + riz + 1 fruit", ["Légumes autorisés", "Riz complet 100 g", "1 fruit"]), dinerOk),
  "protéine manquante",
);
attend(
  "Légume hors liste autorisée (petits pois) → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + poulet + riz + 1 fruit", ["Légumes autorisés", "Petits pois 100 g", "Poulet 150 g", "Riz complet 100 g", "1 fruit"]), dinerOk),
  "légume hors liste",
);
attend(
  "Œuf au déjeuner → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Salade + œufs durs + riz + 1 fruit", ["Légumes autorisés", "Œufs durs 2", "Riz complet 100 g", "1 fruit"]), dinerOk),
  "œuf au déjeuner",
);
attend(
  "Couscous un mardi → refusé",
  jourAvec(pdOk, meal("Déjeuner", "Couscous + 1 fruit", ["Semoule de couscous 100 g", "Poulet 150 g", "1 fruit"]), dinerOk),
  "couscous au déjeuner",
);

// Banque fermée du dîner
attend(
  "Omelette au dîner (œuf non dur) → refusé",
  jourAvec(pdOk, dejOk, meal("Dîner", "Omelette aux légumes", ["Œufs 2", "Légumes"])),
  "œuf au dîner",
);
attend(
  "Saumon grillé au dîner (hors « soupe de poisson ») → refusé",
  jourAvec(pdOk, dejOk, meal("Dîner", "Légumes + saumon grillé", ["Légumes au four", "Saumon 150 g"])),
  "poisson au dîner",
);
attend(
  "Pain au dîner (hors banque) → refusé",
  jourAvec(pdOk, dejOk, meal("Dîner", "Soupe de légumes + poulet + pain", ["Soupe de légumes", "Blanc de poulet 150 g", "Pain complet 50 g"])),
  "hors banque",
);
attend(
  "Fruit au dîner (pomme) → refusé",
  jourAvec(pdOk, dejOk, meal("Dîner", "Soupe de légumes + poulet + pomme", ["Soupe de légumes", "Blanc de poulet 150 g", "Pomme 1"])),
  "fruit au dîner",
);
attendAucune(
  "Option « 2 œufs durs » au dîner → acceptée (banque)",
  jourAvec(pdOk, dejOk, meal("Dîner", "Soupe de légumes + 2 œufs durs", ["Soupe de légumes", "Œufs durs 2"])),
);
attendAucune(
  "Option « Soupe de poisson + légumes sautés » au dîner → acceptée (banque)",
  jourAvec(pdOk, dejOk, meal("Dîner", "Soupe de poisson + légumes sautés", ["Soupe de poisson", "Légumes sautés"])),
);
attendAucune(
  "Option « fruits de mer » au dîner → acceptée (PAS un fruit — régression corrigée)",
  jourAvec(pdOk, dejOk, meal("Dîner", "Légumes au four + 150 g de fruits de mer", ["Légumes au four", "Fruits de mer 150 g"])),
);

/* ------------------------------------------------------------------ */
/* PARTIE 3 — Corrections déterministes (dernier recours)               */
/* ------------------------------------------------------------------ */

log("\n════════════════════════════════════════════════════════════");
log("PARTIE 3 — CORRECTIONS DÉTERMINISTES (fallback sans IA)");
log("════════════════════════════════════════════════════════════");

// Petit-déj identique → bascule automatique sur une autre option de la banque.
{
  const pd = meal("Petit-déjeuner", "Légumes + 1 œuf + pain complet", ["Concombre", "Œuf", "Pain complet 50 g"]);
  const corrige = reconstruireDepuisBanque(pd, "petit_dejeuner");
  const avant = indexOptionPetitDej(texteDuRepas(pd));
  const apres = indexOptionPetitDej(texteDuRepas(corrige));
  if (apres !== -1 && apres !== avant) log(`  ✅ Petit-déj identique → rebasculé automatiquement sur l'option ${apres + 1} de la banque`);
  else erreur(`Fallback petit-déj : option inchangée (avant=${avant + 1}, après=${apres + 1})`);
}
// Dîner identique → autre option de la banque.
{
  const dn = meal("Dîner", "Soupe de légumes + 150 g de poulet", ["Soupe de légumes", "Blanc de poulet 150 g"]);
  const corrige = reconstruireDepuisBanque(dn, "diner");
  const avant = indexOptionDiner(texteDuRepas(dn));
  const apres = indexOptionDiner(texteDuRepas(corrige));
  if (apres !== -1 && apres !== avant) log(`  ✅ Dîner identique → rebasculé automatiquement sur l'option ${apres + 1} de la banque`);
  else erreur(`Fallback dîner : option inchangée (avant=${avant + 1}, après=${apres + 1})`);
}
// Déjeuner identique → permutation du féculent.
{
  const dej = meal("Déjeuner", "Salade + poulet + riz + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Riz complet 100 g", "1 fruit"]);
  const corrige = permuterFeculentDejeuner(dej);
  const avant = feculentPrincipalDejeuner(texteDuRepas(dej));
  const apres = feculentPrincipalDejeuner(texteDuRepas(corrige));
  if (apres !== null && apres !== avant) log(`  ✅ Déjeuner identique → féculent permuté automatiquement (${avant} → ${apres})`);
  else erreur(`Fallback déjeuner : féculent inchangé (${avant} → ${apres})`);
}
// Deux féculents → un seul conservé.
{
  const dej = meal("Déjeuner", "Salade + poulet + pain + riz + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Pain complet 50 g", "Riz complet 100 g", "1 fruit"]);
  const corrige = corrigerRepasFallback(dej, ["deux féculents au déjeuner (Pain complet 50 g, Riz complet 100 g) — UN SEUL autorisé"]);
  const feculents = corrige.ingredients.filter((i) => /pain|riz|pâtes|pates|pomme de terre/.test(i.nom.toLowerCase())).length;
  if (feculents === 1) log("  ✅ Deux féculents → un seul féculent conservé après correction");
  else erreur(`Fallback deux féculents : ${feculents} féculents restants (attendu : 1)`);
}
// Boulgour → remplacé par un féculent autorisé.
{
  const dej = meal("Déjeuner", "Salade + poulet + boulgour + 1 fruit", ["Légumes autorisés", "Poulet 150 g", "Boulgour 100 g", "1 fruit"]);
  const corrige = corrigerRepasFallback(dej, ["boulgour (interdit, ne doit JAMAIS être généré)"]);
  const resteBoulgour = corrige.ingredients.some((i) => i.nom.toLowerCase().includes("boulgour"));
  const aFeculent = corrige.ingredients.some((i) => /pain|riz|pâtes|pates|pomme de terre/.test(i.nom.toLowerCase()));
  if (!resteBoulgour && aFeculent) log("  ✅ Boulgour → supprimé et remplacé par un féculent autorisé");
  else erreur(`Fallback boulgour : boulgour restant=${resteBoulgour}, féculent présent=${aFeculent}`);
}
// Légume hors liste → retiré.
{
  const dej = meal("Déjeuner", "Salade + poulet + riz + 1 fruit", ["Petits pois 100 g", "Poulet 150 g", "Riz complet 100 g", "1 fruit"]);
  const corrige = corrigerRepasFallback(dej, ["légume hors liste autorisée (Petits pois 100 g)"]);
  if (!corrige.ingredients.some((i) => i.nom.toLowerCase().includes("petit"))) log("  ✅ Légume hors liste (petits pois) → retiré automatiquement");
  else erreur("Fallback légume hors liste : petits pois toujours présents");
}

/* ------------------------------------------------------------------ */
/* RAPPORT FINAL                                                        */
/* ------------------------------------------------------------------ */

log("\n════════════════════════════════════════════════════════════");
log("RAPPORT FINAL");
log("════════════════════════════════════════════════════════════");
log(`  Semaines simulées : ${NB_SEMAINES} (${NB_SEMAINES * 7} jours, ${NB_SEMAINES * 21} repas)`);
log(`  Erreurs           : ${erreurs}`);
log(`  Avertissements    : ${avertissements}`);
log(erreurs === 0 ? "\n  ✅ VALIDATION COMPLÈTE RÉUSSIE — prêt pour le déploiement." : "\n  ❌ VALIDATION ÉCHOUÉE — corriger avant déploiement.");
process.exitCode = erreurs === 0 ? 0 : 1;
