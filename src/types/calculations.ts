/** Résultats des calculs nutritionnels locaux (sans IA). */

export type BmiCategory =
  | "insuffisance_ponderale"
  | "normal"
  | "surpoids"
  | "obesite_1"
  | "obesite_2"
  | "obesite_3";

export interface WeightProjectionPoint {
  mois: number; // 0, 1, 3, 6
  poids: number; // kg
}

export interface CalculationResult {
  age: number;
  imc: number;
  imcCategorie: BmiCategory;
  bmr: number; // kcal
  tdee: number; // kcal (maintenance)
  caloriesObjectif: number; // kcal
  deficitCalorique: number; // kcal (signé : négatif = déficit)
  besoinHydrique: number; // litres / jour
  projection: WeightProjectionPoint[];
  /** Alerte si la perte hebdomadaire visée dépasse 1 kg/sem. */
  objectifAgressif: boolean;
  /** Perte/gain visé(e) par semaine, en kg (signé). */
  variationHebdo: number;
  /** Durée estimée (en mois) pour atteindre la cible à rythme sûr. 0 = maintien. */
  dureeEstimeeMois: number;
}
