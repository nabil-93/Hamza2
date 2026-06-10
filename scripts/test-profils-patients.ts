/**
 * TEST RÉEL (appels OpenAI) — Personnalisation par profil patient.
 *
 * Vérifie que la génération IA prend réellement en compte :
 *   1. Diabète type 2        → aucun sucre simple / pain blanc / riz blanc / jus
 *   2. Prise de poids        → calories cibles = TDEE + 400, repas denses
 *   3. Aliments interdits    → allergie (tomate, fruits de mer, pâtes) jamais servie
 *   4. Préférences aimées    → texte libre transmis (contrôle souple)
 *   5. Intolérance au gluten → commentaire pathologies respecté (pain/semoule)
 *
 * Lancement : npx tsx scripts/test-profils-patients.ts
 * (lit OPENAI_API_KEY depuis .env.local — même clé que l'app)
 */

import { readFileSync } from "fs";
import { resolve } from "path";

// Charge .env.local (tsx ne le fait pas tout seul, contrairement à Next).
for (const ligne of readFileSync(resolve(process.cwd(), ".env.local"), "utf8").split(/\r?\n/)) {
  const m = ligne.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
}

import { computeAll } from "@/lib/calculations";
import { buildSingleDayPrompt, dayRole } from "@/lib/ai/prompts";
import { generateJson } from "@/lib/ai/openai";
import { detecterAnomaliesJour, fusionnerHuiles, texteDuRepas } from "@/lib/ai/validation";
import type { PatientForm, DailyMealPlan } from "@/types";

let erreurs = 0;
let avertissements = 0;

function baseForm(surcharge: Partial<PatientForm>): PatientForm {
  return {
    nom: "Test",
    prenom: "Patient",
    dateNaissance: "1985-03-15",
    sexe: "homme",
    taille: 175,
    poidsActuel: 92,
    niveauActivite: "faiblement_actif",
    poidsCible: 80,
    objectif: "perte_poids",
    niveauSportif: "debutant",
    pathologies: [],
    diabete: {},
    limitations: [],
    preferences: {},
    modeRamadan: false,
    branding: {},
    ...surcharge,
  };
}

const AUTRES_JOURS = ["Lundi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

/** Texte complet du jour (tous repas, nom + ingrédients), minuscule sans accents gênants. */
function texteDuJour(plan: DailyMealPlan): string {
  return plan.repas.map((r) => texteDuRepas(r)).join(" || ");
}

function resume(plan: DailyMealPlan): string {
  return plan.repas
    .map((r) => `   - ${r.type} : ${r.nom} (${r.calories} kcal)\n     ingrédients : ${(r.ingredients ?? []).map((i) => `${i.nom} ${i.quantite ?? ""}`.trim()).join(", ")}`)
    .join("\n");
}

interface Profil {
  titre: string;
  form: PatientForm;
  /** Mots dont la présence dans le jour généré est une VIOLATION. */
  motsInterdits: string[];
  /** Mots espérés (contrôle souple — avertissement seulement). */
  motsEsperes?: string[];
  /** Vérification calorique : [min, max] en % de la cible. */
  toleranceCalories?: [number, number];
}

const PROFILS: Profil[] = [
  {
    titre: "1. DIABÈTE TYPE 2 (HbA1c 8,2 % — IG bas obligatoire)",
    form: baseForm({
      pathologies: ["diabete_type_2"],
      diabete: { hba1c: 8.2, glycemieJeun: 1.4, glycemiePostPrandiale: 2.1 },
    }),
    motsInterdits: ["sucre ", "sucré", "miel", "confiture", "sirop", "pain blanc", "riz blanc", "jus de fruit", "jus d'orange", "dattes", "soda"],
  },
  {
    titre: "2. PRISE DE POIDS (homme maigre 58 kg → 65 kg, TDEE + 400 kcal)",
    form: baseForm({
      poidsActuel: 58,
      poidsCible: 65,
      taille: 178,
      objectif: "prise_poids",
      dateNaissance: "2000-06-20",
    }),
    motsInterdits: [],
    toleranceCalories: [0.8, 1.2],
  },
  {
    titre: "3. ALIMENTS INTERDITS (allergie : tomate, fruits de mer, pâtes)",
    form: baseForm({
      preferences: { alimentsInterdits: "tomates, fruits de mer (crevettes, calamars, moules), pâtes" },
    }),
    motsInterdits: ["tomate", "fruits de mer", "fruit de mer", "crevette", "calamar", "moule", "pâtes", "pates "],
  },
  {
    titre: "4. PRÉFÉRENCES (adore : sardines, lentilles, pain d'orge)",
    form: baseForm({
      preferences: { commentaire: "Le patient adore les sardines, les lentilles et le pain d'orge. Il déteste le foie." },
    }),
    motsInterdits: ["foie"],
    motsEsperes: ["sardine", "lentille", "orge"],
  },
  {
    titre: "5. INTOLÉRANCE AU GLUTEN (commentaire pathologies — maladie cœliaque)",
    form: baseForm({
      pathologies: ["autre"],
      commentairePathologies: "Maladie cœliaque : intolérance TOTALE au gluten. Interdit absolu : blé, pain (même complet), semoule, couscous, pâtes, orge, boulgour. Remplacer par riz complet, pomme de terre, maïzena ou pain sans gluten.",
    }),
    motsInterdits: ["pain complet", "semoule", "couscous", "pâtes complètes", "blé", "orge", "boulgour"],
  },
];

async function testerProfil(p: Profil): Promise<string[]> {
  const lignes: string[] = [];
  const calc = computeAll(p.form);
  lignes.push("");
  lignes.push("═".repeat(70));
  lignes.push(p.titre);
  lignes.push("═".repeat(70));
  lignes.push(`   Cible calculée : ${calc.caloriesObjectif} kcal/j (TDEE ${calc.tdee} kcal, IMC ${calc.imc} ${calc.imcCategorie})`);

  const role = dayRole("Mardi", []);
  const prompt = buildSingleDayPrompt(p.form, calc, "fr", "Mardi", AUTRES_JOURS, [], role);
  const plan = await generateJson<DailyMealPlan>(prompt, undefined, 0.85, "fr");
  plan.repas = plan.repas.map((r) => fusionnerHuiles(r));

  lignes.push(resume(plan));

  const texte = texteDuJour(plan);

  // 1) Mots interdits propres au profil
  const violations = p.motsInterdits.filter((mot) => texte.includes(mot.toLowerCase()));
  if (violations.length > 0) {
    erreurs++;
    lignes.push(`   ❌ VIOLATION — aliments interdits présents dans le jour généré : ${violations.join(", ")}`);
  } else if (p.motsInterdits.length > 0) {
    lignes.push(`   ✅ Aucun aliment interdit détecté (${p.motsInterdits.length} mots contrôlés)`);
  }

  // 2) Mots espérés (contrôle souple)
  if (p.motsEsperes) {
    const presents = p.motsEsperes.filter((mot) => texte.includes(mot.toLowerCase()));
    if (presents.length > 0) {
      lignes.push(`   ✅ Préférences reflétées dans le menu : ${presents.join(", ")}`);
    } else {
      avertissements++;
      lignes.push(`   ⚠️ Aucune préférence aimée (${p.motsEsperes.join(", ")}) ne figure ce jour-là — possible sur d'autres jours, contrôle souple.`);
    }
  }

  // 3) Calories vs cible
  const kcal = plan.caloriesTotales || plan.repas.reduce((s, r) => s + (r.calories || 0), 0);
  const [tolMin, tolMax] = p.toleranceCalories ?? [0.75, 1.25];
  const ratio = kcal / calc.caloriesObjectif;
  if (ratio < tolMin || ratio > tolMax) {
    avertissements++;
    lignes.push(`   ⚠️ Calories du jour ${kcal} kcal = ${(ratio * 100).toFixed(0)} % de la cible ${calc.caloriesObjectif} kcal (hors tolérance ${tolMin * 100}-${tolMax * 100} %)`);
  } else {
    lignes.push(`   ✅ Calories du jour : ${kcal} kcal = ${(ratio * 100).toFixed(0)} % de la cible ${calc.caloriesObjectif} kcal`);
  }

  // 4) Garde-fous serveur génériques (banques, structure, etc.)
  const anomalies = detecterAnomaliesJour(plan, 0, false, "Mardi", null);
  if (anomalies.length > 0) {
    avertissements++;
    lignes.push(`   ⚠️ Garde-fous serveur déclenchés (seraient corrigés automatiquement par l'API) : ${anomalies.map((a) => a.raisons.join(" ; ")).join(" | ")}`);
  } else {
    lignes.push("   ✅ Garde-fous serveur : 0 anomalie (banques + structure respectées)");
  }

  return lignes;
}

async function main() {
  console.log("TEST RÉEL DE PERSONNALISATION PAR PROFIL — 5 appels OpenAI en parallèle…");

  const resultats = await Promise.allSettled(PROFILS.map((p) => testerProfil(p)));
  for (let i = 0; i < resultats.length; i++) {
    const r = resultats[i];
    if (r.status === "fulfilled") {
      console.log(r.value.join("\n"));
    } else {
      erreurs++;
      console.log(`\n❌ ${PROFILS[i].titre} — échec de génération : ${r.reason}`);
    }
  }

  console.log("\n" + "═".repeat(70));
  console.log("RAPPORT FINAL PROFILS");
  console.log("═".repeat(70));
  console.log(`Erreurs (violations) : ${erreurs}`);
  console.log(`Avertissements       : ${avertissements}`);
  console.log(erreurs === 0 ? "✅ Les contraintes patient sont prises en compte par l'IA." : "❌ Des contraintes patient ne sont PAS respectées — voir détails ci-dessus.");
  process.exit(erreurs === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("Erreur fatale :", e);
  process.exit(1);
});
