import type {
  ActivityLevel,
  Goal,
  FitnessLevel,
  Pathology,
  PhysicalLimitation,
} from "@/types";

/** Coefficients d'activité pour le calcul du TDEE (Mifflin-St Jeor). */
export const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentaire: 1.2,
  faiblement_actif: 1.375,
  moderement_actif: 1.55,
  tres_actif: 1.725,
};

export const ACTIVITY_OPTIONS: { value: ActivityLevel; labelKey: string }[] = [
  { value: "sedentaire", labelKey: "activity.sedentaire" },
  { value: "faiblement_actif", labelKey: "activity.faiblement_actif" },
  { value: "moderement_actif", labelKey: "activity.moderement_actif" },
  { value: "tres_actif", labelKey: "activity.tres_actif" },
];

export const GOAL_OPTIONS: { value: Goal; labelKey: string }[] = [
  { value: "perte_poids", labelKey: "goal.perte_poids" },
  { value: "maintien", labelKey: "goal.maintien" },
  { value: "prise_poids", labelKey: "goal.prise_poids" },
];

export const FITNESS_OPTIONS: { value: FitnessLevel; labelKey: string }[] = [
  { value: "debutant", labelKey: "fitness.debutant" },
  { value: "intermediaire", labelKey: "fitness.intermediaire" },
  { value: "avance", labelKey: "fitness.avance" },
];

export const PATHOLOGY_OPTIONS: { value: Pathology; labelKey: string }[] = [
  { value: "diabete_type_1", labelKey: "pathology.diabete_type_1" },
  { value: "diabete_type_2", labelKey: "pathology.diabete_type_2" },
  { value: "prediabete", labelKey: "pathology.prediabete" },
  { value: "hypertension", labelKey: "pathology.hypertension" },
  { value: "dyslipidemie", labelKey: "pathology.dyslipidemie" },
  { value: "maladie_cardiovasculaire", labelKey: "pathology.maladie_cardiovasculaire" },
  { value: "hypothyroidie", labelKey: "pathology.hypothyroidie" },
  { value: "syndrome_metabolique", labelKey: "pathology.syndrome_metabolique" },
  { value: "autre", labelKey: "pathology.autre" },
];

export const LIMITATION_OPTIONS: { value: PhysicalLimitation; labelKey: string }[] = [
  { value: "douleur_genou", labelKey: "limitation.douleur_genou" },
  { value: "douleur_hanche", labelKey: "limitation.douleur_hanche" },
  { value: "douleur_epaule", labelKey: "limitation.douleur_epaule" },
  { value: "douleur_dos", labelKey: "limitation.douleur_dos" },
  { value: "douleur_cervicale", labelKey: "limitation.douleur_cervicale" },
  { value: "essoufflement", labelKey: "limitation.essoufflement" },
  { value: "asthme", labelKey: "limitation.asthme" },
  { value: "arthrose", labelKey: "limitation.arthrose" },
  { value: "hernie_discale", labelKey: "limitation.hernie_discale" },
  { value: "autre", labelKey: "limitation.autre" },
];

export const TOTAL_STEPS = 8;
