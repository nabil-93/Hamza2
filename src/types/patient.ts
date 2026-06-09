/**
 * Types du domaine "Patient" et du formulaire médical.
 * Source de vérité partagée entre le wizard, les calculs, l'IA et l'export.
 */

export type Sex = "homme" | "femme";

export type ActivityLevel =
  | "sedentaire"
  | "faiblement_actif"
  | "moderement_actif"
  | "tres_actif";

export type Goal = "perte_poids" | "maintien" | "prise_poids";

export type FitnessLevel = "debutant" | "intermediaire" | "avance";

export type Locale = "fr" | "ar";

/** Pathologies prises en charge (cases à cocher). */
export type Pathology =
  | "diabete_type_1"
  | "diabete_type_2"
  | "prediabete"
  | "hypertension"
  | "dyslipidemie"
  | "maladie_cardiovasculaire"
  | "hypothyroidie"
  | "syndrome_metabolique"
  | "autre";

/** Limitations physiques (impactent le moteur sport). */
export type PhysicalLimitation =
  | "douleur_genou"
  | "douleur_hanche"
  | "douleur_epaule"
  | "douleur_dos"
  | "douleur_cervicale"
  | "essoufflement"
  | "asthme"
  | "arthrose"
  | "hernie_discale"
  | "autre";

export interface DiabetesData {
  /** HbA1c en % */
  hba1c?: number;
  /** Glycémie à jeun en g/L */
  glycemieJeun?: number;
  /** Glycémie post-prandiale en g/L */
  glycemiePostPrandiale?: number;
}

export interface FoodPreferences {
  /** Texte libre : aliments aimés, habitudes, préférences culinaires. */
  commentaire?: string;
  /** Texte libre : aliments interdits, allergies, intolérances. */
  alimentsInterdits?: string;
}

export interface ClinicBranding {
  /** Data URLs (base64) — restent côté client, jamais persistées en V1 */
  logo?: string;
  signature?: string;
  cachet?: string;
  nomCabinet?: string;
  nomMedecin?: string;
}

export interface PatientForm {
  // Étape 1 — Informations générales
  nom: string;
  prenom: string;
  dateNaissance: string; // ISO yyyy-mm-dd
  sexe: Sex;

  // Étape 2 — Mesures corporelles
  taille: number; // cm
  poidsActuel: number; // kg
  niveauActivite: ActivityLevel;

  // Étape 3 — Objectifs
  poidsCible: number; // kg
  objectif: Goal;
  niveauSportif: FitnessLevel;

  // Étape 4 — Pathologies & diabète
  pathologies: Pathology[];
  commentairePathologies?: string;
  diabete: DiabetesData;

  // Étape 5 — Limitations physiques
  limitations: PhysicalLimitation[];
  commentaireLimitations?: string;

  // Étape 6 — Préférences alimentaires
  preferences: FoodPreferences;
  modeRamadan: boolean;

  // Personnalisation cabinet (optionnel)
  branding: ClinicBranding;
}
