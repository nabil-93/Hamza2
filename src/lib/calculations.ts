import type {
  PatientForm,
  CalculationResult,
  BmiCategory,
  WeightProjectionPoint,
} from "@/types";
import { ACTIVITY_FACTORS } from "./constants";

/** Âge en années à partir d'une date ISO. */
export function computeAge(dateNaissance: string, ref = new Date()): number {
  const birth = new Date(dateNaissance);
  if (Number.isNaN(birth.getTime())) return 0;
  let age = ref.getFullYear() - birth.getFullYear();
  const m = ref.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--;
  return Math.max(0, age);
}

/** IMC = poids(kg) / taille(m)². */
export function computeBmi(poidsKg: number, tailleCm: number): number {
  if (!tailleCm) return 0;
  const m = tailleCm / 100;
  return poidsKg / (m * m);
}

export function bmiCategory(imc: number): BmiCategory {
  if (imc < 18.5) return "insuffisance_ponderale";
  if (imc < 25) return "normal";
  if (imc < 30) return "surpoids";
  if (imc < 35) return "obesite_1";
  if (imc < 40) return "obesite_2";
  return "obesite_3";
}

/**
 * BMR via l'équation de Mifflin-St Jeor.
 * Homme : 10·P + 6.25·T − 5·A + 5
 * Femme : 10·P + 6.25·T − 5·A − 161
 */
export function computeBmr(
  poidsKg: number,
  tailleCm: number,
  age: number,
  sexe: "homme" | "femme",
): number {
  const base = 10 * poidsKg + 6.25 * tailleCm - 5 * age;
  return sexe === "homme" ? base + 5 : base - 161;
}

export function computeTdee(bmr: number, niveau: PatientForm["niveauActivite"]): number {
  return bmr * ACTIVITY_FACTORS[niveau];
}

/**
 * Calories objectif selon le but.
 * Déficit/surplus modéré et borné pour rester dans des recommandations prudentes.
 */
export function computeTargetCalories(
  tdee: number,
  objectif: PatientForm["objectif"],
): { calories: number; deficit: number } {
  let calories = tdee;
  if (objectif === "perte_poids") calories = tdee - 500;
  else if (objectif === "prise_poids") calories = tdee + 400;

  // Plancher de sécurité : ne jamais descendre sous ~1200/1500 kcal.
  const plancher = 1200;
  if (calories < plancher) calories = plancher;

  return { calories: Math.round(calories), deficit: Math.round(calories - tdee) };
}

/** Besoin hydrique : ~35 ml / kg / jour, en litres. */
export function computeWaterNeed(poidsKg: number): number {
  return Math.round((poidsKg * 0.035) * 10) / 10;
}

const SEMAINES_PAR_MOIS = 4.345;

/**
 * Projection de poids réaliste.
 *
 * Le rythme est TOUJOURS plafonné à ±1 kg/semaine (recommandation médicale).
 * On en déduit la durée réaliste pour atteindre la cible, puis on choisit
 * des jalons adaptés à cette durée (et non figés à 1/3/6 mois) afin que la
 * projection montre réellement l'atteinte de l'objectif.
 *
 * `agressif` est vrai quand l'objectif souhaité impliquerait > 1 kg/semaine
 * sur un horizon de 6 mois — le rythme reste bridé, mais la durée s'allonge.
 */
export function computeProjection(
  poidsActuel: number,
  poidsCible: number,
  objectif: PatientForm["objectif"],
): {
  projection: WeightProjectionPoint[];
  variationHebdo: number;
  agressif: boolean;
  dureeEstimeeMois: number;
} {
  const projection: WeightProjectionPoint[] = [{ mois: 0, poids: round1(poidsActuel) }];

  if (objectif === "maintien" || poidsActuel === poidsCible) {
    [1, 3, 6].forEach((mois) => projection.push({ mois, poids: round1(poidsActuel) }));
    return { projection, variationHebdo: 0, agressif: false, dureeEstimeeMois: 0 };
  }

  const ecartTotal = poidsCible - poidsActuel; // signé
  const sens = Math.sign(ecartTotal);

  // Rythme prudent : plafonné à 1 kg/semaine.
  const maxHebdo = 1;
  const varHebdoVisee = sens * maxHebdo;
  const varMensuelle = varHebdoVisee * SEMAINES_PAR_MOIS;

  // Durée réaliste pour atteindre la cible à ce rythme.
  const dureeMois = Math.abs(ecartTotal) / Math.abs(varMensuelle);
  const dureeEstimeeMois = Math.ceil(dureeMois);

  // Objectif jugé agressif si, ramené à 6 mois, il dépasserait 1 kg/semaine.
  const agressif = Math.abs(ecartTotal) / 26 > maxHebdo;

  // Jalons adaptés : on répartit 3 étapes intermédiaires + l'atteinte de la cible.
  const jalons = buildMilestones(dureeEstimeeMois);
  jalons.forEach((mois) => {
    let p = poidsActuel + varMensuelle * mois;
    if (sens < 0) p = Math.max(p, poidsCible);
    else p = Math.min(p, poidsCible);
    projection.push({ mois, poids: round1(p) });
  });

  return { projection, variationHebdo: round2(varHebdoVisee), agressif, dureeEstimeeMois };
}

/**
 * Choisit des jalons (en mois) pour la projection.
 * Court terme → 1/3/6 mois classiques ; long terme → étapes réparties jusqu'à la cible.
 */
function buildMilestones(dureeMois: number): number[] {
  if (dureeMois <= 6) return [1, 3, 6];
  const tiers = Math.round(dureeMois / 3);
  return [tiers, tiers * 2, dureeMois];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Agrège tous les calculs en un seul résultat exploitable par l'UI et l'IA. */
export function computeAll(form: PatientForm, ref = new Date()): CalculationResult {
  const age = computeAge(form.dateNaissance, ref);
  const imc = computeBmi(form.poidsActuel, form.taille);
  const bmr = computeBmr(form.poidsActuel, form.taille, age, form.sexe);
  const tdee = computeTdee(bmr, form.niveauActivite);
  const { calories, deficit } = computeTargetCalories(tdee, form.objectif);
  const besoinHydrique = computeWaterNeed(form.poidsActuel);
  const { projection, variationHebdo, agressif, dureeEstimeeMois } = computeProjection(
    form.poidsActuel,
    form.poidsCible,
    form.objectif,
  );

  return {
    age,
    imc: round1(imc),
    imcCategorie: bmiCategory(imc),
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    caloriesObjectif: calories,
    deficitCalorique: deficit,
    besoinHydrique,
    projection,
    objectifAgressif: agressif,
    variationHebdo,
    dureeEstimeeMois,
  };
}
