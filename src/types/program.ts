/** Types du programme généré par l'IA (nutrition + sport + analyse). */

export interface Macros {
  proteines: number; // g
  glucides: number; // g
  lipides: number; // g
}

export interface MealIngredient {
  nom: string;
  quantite: string; // ex: "120 g", "1 unité"
}

export interface Recipe {
  nom: string;
  ingredients: MealIngredient[];
  etapes: string[];
  tempsCuisson: string; // ex: "25 min"
  calories: number;
  macros: Macros;
}

export interface Meal {
  /** ex: "Petit-déjeuner", "Ftour", "Shour" */
  type: string;
  nom: string;
  ingredients: MealIngredient[];
  calories: number;
  recette?: Recipe;
}

export interface DailyMealPlan {
  jour: string; // ex: "Jour type"
  repas: Meal[];
  caloriesTotales: number;
  macros: Macros;
}

export interface ShoppingItem {
  nom: string;
  quantite: string; // ex: "1.5 kg"
}

export interface ShoppingCategory {
  categorie: string; // ex: "Protéines"
  items: ShoppingItem[];
}

export interface NutritionProgram {
  plan: DailyMealPlan;
  recettes: Recipe[];
  listeCourses: ShoppingCategory[];
  resumeNutritionnel: string;
}

export interface Exercise {
  nom: string;
  series?: number;
  repetitions?: string; // "12-15" ou "30 s"
  duree?: string;
  note?: string;
}

export interface WorkoutDay {
  jour: string; // ex: "Jour 1"
  focus: string; // ex: "Cardio doux + mobilité"
  echauffement: string;
  exercices: Exercise[];
  cardio?: string;
}

export interface WorkoutWeek {
  semaine: number; // 1..4
  objectif: string;
  jours: WorkoutDay[];
}

export interface SportProgram {
  niveau: string;
  semaines: WorkoutWeek[];
  consignesSecurite: string[];
  resume: string;
}

export interface MedicalAnalysis {
  resumeProfil: string;
  risquesPoids: string;
  analyseDiabete: string;
  analyseNutritionnelle: string;
  analyseActivite: string;
  recommandationsGenerales: string[];
}

/** Programme complet retourné par les API IA, prêt pour le rapport/export. */
export interface GeneratedProgram {
  analyse: MedicalAnalysis;
  nutrition: NutritionProgram;
  sport: SportProgram;
}
