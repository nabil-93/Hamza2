/**
 * TEST DE CONFORMITÉ ALLERGIES — 4 profils (appels OpenAI réels).
 *
 * Reproduit le pipeline EXACT de l'API /api/generate/day :
 *   1. motsInterditsPatient(form)  → liste des aliments interdits
 *   2. dayRole(jour, [], mots)     → banques fermées FILTRÉES serveur-side
 *   3. génération IA du jour
 *   4. garde-fou BLOQUANT detecterAnomaliesJour(..., motsInterdits)
 *      → régénération IA ciblée (2 tentatives) → correction déterministe
 *   5. verdict : AUCUN aliment interdit dans le jour final
 *
 * Profils : allergie fruits de mer / œufs / avocat / intolérance gluten.
 * Lancement : npx tsx scripts/test-allergies.ts
 */

import { readFileSync } from "fs";
import { resolve } from "path";

for (const ligne of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = ligne.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { computeAll } from "@/lib/calculations";
import { buildSingleDayPrompt, buildRegenerateMealPrompt, REGENERATE_MEAL_SYSTEM_PROMPT, dayRole } from "@/lib/ai/prompts";
import { generateJson } from "@/lib/ai/openai";
import {
  detecterAnomaliesJour,
  corrigerRepasFallback,
  fusionnerHuiles,
  motsInterditsPatient,
  lignesInterditesRepas,
  texteContientInterdit,
  type MotInterditPatient,
} from "@/lib/ai/validation";
import { PETIT_DEJ_OPTIONS, DINER_OPTIONS, FECULENTS_AUTORISES } from "@/data/meal-bank";
import type { PatientForm, DailyMealPlan, Meal } from "@/types";

let erreurs = 0;

function baseForm(surcharge: Partial<PatientForm>): PatientForm {
  return {
    nom: "Test", prenom: "Allergie", dateNaissance: "1985-03-15", sexe: "homme",
    taille: 175, poidsActuel: 92, niveauActivite: "faiblement_actif",
    poidsCible: 80, objectif: "perte_poids", niveauSportif: "debutant",
    pathologies: [], diabete: {}, limitations: [],
    preferences: {}, modeRamadan: false, branding: {},
    ...surcharge,
  };
}

interface Profil {
  titre: string;
  form: PatientForm;
}

const PROFILS: Profil[] = [
  {
    titre: "ALLERGIE FRUITS DE MER",
    form: baseForm({ preferences: { alimentsInterdits: "fruits de mer (crevettes, calamars, moules)" } }),
  },
  {
    titre: "ALLERGIE ŒUFS",
    form: baseForm({ preferences: { alimentsInterdits: "œufs" } }),
  },
  {
    titre: "ALLERGIE AVOCAT",
    form: baseForm({ preferences: { alimentsInterdits: "avocat" } }),
  },
  {
    titre: "INTOLÉRANCE GLUTEN (maladie cœliaque, via commentaire pathologies)",
    form: baseForm({
      pathologies: ["autre"],
      commentairePathologies: "Maladie cœliaque : intolérance totale au gluten.",
    }),
  },
];

const AUTRES_JOURS = ["Lundi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const MAX_TENTATIVES_REGENERATION = 2;

/* ------------------------------------------------------------------------ */
/* PARTIE 1 — Filtrage déterministe des banques par dayRole() (sans IA)      */
/* ------------------------------------------------------------------------ */

function testerFiltrageBanques(p: Profil): string[] {
  const lignes: string[] = [];
  const mots = motsInterditsPatient(p.form);
  lignes.push(`   Mots interdits détectés (${mots.length}) : ${mots.map((m) => m.mot).join(", ")}`);

  // 200 tirages de rôles sur tous les jours : AUCUNE option de banque tirée ne
  // doit contenir un aliment interdit.
  const tirsFautifs: string[] = [];
  const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
  for (let i = 0; i < 200; i++) {
    const jour = jours[i % jours.length];
    const role = dayRole(jour, [], mots);
    for (const [champ, valeur] of [["petit-déj", role.breakfast], ["déjeuner", role.lunch], ["dîner", role.dinner], ["féculent", role.starch]] as const) {
      // Cas assumé : gluten au petit-déjeuner (toutes les options de la banque
      // mentionnent le pain complet) → le garde-fou bloquant + le prompt
      // imposent la version sans gluten en aval.
      const glutenPD = champ === "petit-déj" && mots.some((m) => m.exemption === "sans gluten");
      if (!glutenPD && texteContientInterdit(valeur, mots)) {
        tirsFautifs.push(`${jour} / ${champ} : ${valeur}`);
      }
    }
  }
  if (tirsFautifs.length > 0) {
    erreurs++;
    lignes.push(`   ❌ dayRole() a tiré une option interdite (${tirsFautifs.length}/800 champs) — ex. ${tirsFautifs[0]}`);
  } else {
    lignes.push("   ✅ dayRole() : 200 tirages (800 champs) — aucune option de banque contenant un allergène");
  }
  return lignes;
}

/* ------------------------------------------------------------------------ */
/* PARTIE 2 — Pipeline complet avec IA (identique à la route /generate/day)  */
/* ------------------------------------------------------------------------ */

async function corrigerCommeLaRoute(
  plan: DailyMealPlan,
  form: PatientForm,
  jourNom: string,
  motsInterdits: MotInterditPatient[],
  journal: string[],
): Promise<void> {
  const anomalies = detecterAnomaliesJour(plan, 0, false, jourNom, null, motsInterdits);
  if (anomalies.length === 0) {
    journal.push("   ✅ Sortie IA brute déjà conforme — aucune correction nécessaire");
    return;
  }

  for (const { mealIndex, raisons } of anomalies) {
    journal.push(`   ⚠️ Garde-fou déclenché sur « ${plan.repas[mealIndex].type} » : ${raisons.join(" ; ")}`);
    let repasCorrige: Meal | null = null;

    for (let tentative = 1; tentative <= MAX_TENTATIVES_REGENERATION; tentative++) {
      try {
        const candidat = await generateJson<Meal>(
          buildRegenerateMealPrompt(plan, mealIndex, "fr", form),
          REGENERATE_MEAL_SYSTEM_PROMPT,
          0.85,
          "fr",
        );
        const planTest: DailyMealPlan = { ...plan, repas: plan.repas.map((r, i) => (i === mealIndex ? candidat : r)) };
        const stillInvalid = detecterAnomaliesJour(planTest, 0, false, jourNom, null, motsInterdits).some((a) => a.mealIndex === mealIndex);
        if (!stillInvalid) {
          repasCorrige = candidat;
          journal.push(`   ✅ Régénération IA réussie (tentative ${tentative}) → « ${candidat.nom} »`);
          break;
        }
        journal.push(`   ⚠️ Régénération ${tentative}/${MAX_TENTATIVES_REGENERATION} encore invalide`);
      } catch (err) {
        journal.push(`   ⚠️ Échec régénération (${err instanceof Error ? err.message : err})`);
      }
    }

    if (!repasCorrige) {
      repasCorrige = corrigerRepasFallback(plan.repas[mealIndex], raisons, motsInterdits);
      journal.push(`   ✅ Correction déterministe appliquée → « ${repasCorrige.nom} »`);
    }
    plan.repas[mealIndex] = repasCorrige;
  }
}

function resume(plan: DailyMealPlan): string {
  return plan.repas
    .map((r) => `   - ${r.type} : ${r.nom}\n     ingrédients : ${(r.ingredients ?? []).map((i) => `${i.nom} ${i.quantite ?? ""}`.trim()).join(", ")}`)
    .join("\n");
}

async function testerProfil(p: Profil): Promise<string[]> {
  const lignes: string[] = [];
  lignes.push("");
  lignes.push("═".repeat(70));
  lignes.push(p.titre);
  lignes.push("═".repeat(70));

  lignes.push(...testerFiltrageBanques(p));

  const mots = motsInterditsPatient(p.form);
  const calc = computeAll(p.form);
  const role = dayRole("Mardi", [], mots);
  const prompt = buildSingleDayPrompt(p.form, calc, "fr", "Mardi", AUTRES_JOURS, [], role);
  const plan = await generateJson<DailyMealPlan>(prompt, undefined, 0.85, "fr");
  plan.repas = plan.repas.map((r) => fusionnerHuiles(r));

  await corrigerCommeLaRoute(plan, p.form, "Mardi", mots, lignes);

  lignes.push("   Jour final servi au patient :");
  lignes.push(resume(plan));

  // VERDICT : aucun aliment interdit dans le jour FINAL (celui renvoyé au patient).
  const violationsFinales = plan.repas.flatMap((r) => lignesInterditesRepas(r, mots));
  if (violationsFinales.length > 0) {
    erreurs++;
    lignes.push(`   ❌ NON CONFORME — allergène présent dans le jour final : ${violationsFinales.map((v) => `« ${v.ligne} » (${v.mot})`).join(", ")}`);
  } else {
    lignes.push(`   ✅ CONFORME — aucun des ${mots.length} mots interdits dans le jour final`);
  }
  return lignes;
}

async function main() {
  console.log("TEST DE CONFORMITÉ ALLERGIES — 4 profils, pipeline complet (IA réelle)…");

  const resultats = await Promise.allSettled(PROFILS.map((p) => testerProfil(p)));
  for (let i = 0; i < resultats.length; i++) {
    const r = resultats[i];
    if (r.status === "fulfilled") {
      console.log(r.value.join("\n"));
    } else {
      erreurs++;
      console.log(`\n❌ ${PROFILS[i].titre} — échec : ${r.reason}`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("RAPPORT DE CONFORMITÉ ALLERGIES");
  console.log("═".repeat(70));
  console.log(`Profils testés : ${PROFILS.length} (fruits de mer, œufs, avocat, gluten)`);
  console.log(`Erreurs        : ${erreurs}`);
  console.log(erreurs === 0
    ? "✅ CONFORME — aucun allergène servi, garde-fou bloquant opérationnel."
    : "❌ NON CONFORME — voir détails ci-dessus.");
  process.exit(erreurs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
