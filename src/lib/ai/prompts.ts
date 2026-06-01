import type { PatientForm, CalculationResult, Locale, GeneratedProgram } from "@/types";
import { MOROCCAN_RECIPES } from "@/data/recipes";

/** System prompt pour la traduction médicale d'un programme déjà généré. */
export const TRANSLATION_SYSTEM_PROMPT = `Tu es un traducteur médical professionnel (français ⇄ arabe).
Tu traduis fidèlement un programme nutritionnel et sportif en conservant EXACTEMENT la même structure JSON (mêmes clés).
Règles :
- Ne traduis que les valeurs textuelles, jamais les clés.
- Conserve les nombres, unités (g, kg, kcal, L) et la structure inchangés.
- Utilise une terminologie médicale et nutritionnelle correcte et naturelle dans la langue cible.
- Réponds UNIQUEMENT avec l'objet JSON traduit, sans texte ni balises autour.`;

export function buildTranslationPrompt(program: GeneratedProgram, target: Locale): string {
  const langue = target === "ar" ? "arabe (arabe médical professionnel)" : "français";
  return `Traduis intégralement le programme suivant en ${langue}, en gardant la même structure JSON.

${JSON.stringify(program)}`;
}

/** System prompt strict — qualité médicale, sécurité, cuisine marocaine. */
export const MEDICAL_SYSTEM_PROMPT = `Tu es une équipe d'experts médicaux : nutritionniste clinicien, diabétologue, endocrinologue et médecin du sport.

Génère uniquement des recommandations conformes aux recommandations internationales récentes concernant le diabète, l'obésité, la nutrition clinique, l'activité physique adaptée et le régime méditerranéen.

Ne jamais recommander :
- des régimes dangereux
- des pertes de poids excessives (> 1 kg/semaine)
- des exercices contre-indiqués selon les pathologies ou limitations du patient
- des aliments inadaptés au profil glycémique

Les recommandations doivent être prudentes, réalistes, personnalisées et adaptées à la cuisine marocaine saine.
Privilégie le régime méditerranéen et les recettes marocaines traditionnelles allégées.

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown. Respecte exactement le schéma demandé.`;

function listProfile(form: PatientForm, calc: CalculationResult, locale: Locale): string {
  const pref = form.preferences;
  const lang = locale === "ar" ? "arabe (langue arabe médicale professionnelle)" : "français";
  return `LANGUE DE RÉPONSE : ${lang}.

PROFIL PATIENT :
- Sexe : ${form.sexe}
- Âge : ${calc.age} ans
- Taille : ${form.taille} cm
- Poids actuel : ${form.poidsActuel} kg
- Poids cible : ${form.poidsCible} kg
- Objectif : ${form.objectif}
- Niveau d'activité : ${form.niveauActivite}
- Niveau sportif : ${form.niveauSportif}

CALCULS :
- IMC : ${calc.imc} (${calc.imcCategorie})
- BMR : ${calc.bmr} kcal
- TDEE (maintenance) : ${calc.tdee} kcal
- Calories objectif : ${calc.caloriesObjectif} kcal/jour
- Besoin hydrique : ${calc.besoinHydrique} L/jour

PATHOLOGIES : ${form.pathologies.join(", ") || "aucune"}
COMMENTAIRE LIBRE PATHOLOGIES (à prendre en compte impérativement) : ${form.commentairePathologies?.trim() || "—"}
DONNÉES DIABÉTIQUES : HbA1c=${form.diabete.hba1c ?? "—"}%, Glycémie à jeun=${form.diabete.glycemieJeun ?? "—"} g/L, Post-prandiale=${form.diabete.glycemiePostPrandiale ?? "—"} g/L
LIMITATIONS PHYSIQUES : ${form.limitations.join(", ") || "aucune"}
COMMENTAIRE LIBRE LIMITATIONS (à prendre en compte impérativement, notamment si « Autre » est coché) : ${form.commentaireLimitations?.trim() || "—"}

PRÉFÉRENCES ALIMENTAIRES :
- Légumes : ${pref.legumes.join(", ") || "libre"}
- Fruits : ${pref.fruits.join(", ") || "libre"}
- Protéines : ${pref.proteines.join(", ") || "libre"}
- Féculents : ${pref.feculents.join(", ") || "libre"}
- AUTRES ALIMENTS / ALLERGIES / INTOLÉRANCES (à respecter impérativement) : ${pref.commentaire?.trim() || "—"}

MODE RAMADAN : ${form.modeRamadan ? "OUI — organise le plan en Ftour, collation après Tarawih, et Shour" : "non"}

RECETTES MAROCAINES À PRIVILÉGIER : ${MOROCCAN_RECIPES.map((r) => r.nom).join(", ")}.`;
}

export function buildNutritionPrompt(
  form: PatientForm,
  calc: CalculationResult,
  locale: Locale,
): string {
  const repasStruct = form.modeRamadan
    ? `"type" parmi : "Ftour", "Collation après Tarawih", "Shour"`
    : `"type" parmi : "Petit-déjeuner", "Collation matin", "Déjeuner", "Collation après-midi", "Dîner"`;

  return `${listProfile(form, calc, locale)}

TÂCHE : Génère un programme alimentaire journalier complet (~${calc.caloriesObjectif} kcal), des recettes détaillées et une liste de courses hebdomadaire regroupée par catégorie.

Réponds STRICTEMENT avec ce JSON :
{
  "resumeNutritionnel": "string (2-3 phrases)",
  "plan": {
    "jour": "Jour type",
    "caloriesTotales": number,
    "macros": { "proteines": number, "glucides": number, "lipides": number },
    "repas": [
      {
        "type": "string (${repasStruct})",
        "nom": "string",
        "calories": number,
        "ingredients": [ { "nom": "string", "quantite": "string (ex: 120 g)" } ]
      }
    ]
  },
  "recettes": [
    {
      "nom": "string",
      "tempsCuisson": "string",
      "calories": number,
      "macros": { "proteines": number, "glucides": number, "lipides": number },
      "ingredients": [ { "nom": "string", "quantite": "string" } ],
      "etapes": [ "string" ]
    }
  ],
  "listeCourses": [
    { "categorie": "string", "items": [ { "nom": "string", "quantite": "string (ex: 1.5 kg)" } ] }
  ]
}

Donne 3 à 4 recettes détaillées issues de la cuisine marocaine saine. Quantités exactes en grammes.`;
}

export function buildSportPrompt(
  form: PatientForm,
  calc: CalculationResult,
  locale: Locale,
): string {
  return `${listProfile(form, calc, locale)}

TÂCHE : Génère un programme sportif progressif sur 4 semaines, adapté au niveau "${form.niveauSportif}", aux pathologies et aux limitations physiques.

RÈGLES DE SÉCURITÉ OBLIGATOIRES :
- Douleur genou : éviter course intensive, squats lourds, sauts. Favoriser marche, vélo, natation, elliptique.
- Douleur dos / hernie discale : éviter charges axiales, privilégier gainage doux et mobilité.
- Douleur épaule : adapter le haut du corps, éviter développés au-dessus de la tête.
- Essoufflement / asthme : progression très graduelle, cardio à faible intensité.
- Diabète : prévoir échauffement, hydratation, surveillance glycémique autour de l'effort.
- COMMENTAIRE LIBRE LIMITATIONS : s'il est renseigné (ex. limitation « Autre » précisée), tu DOIS adapter les exercices en conséquence et éviter tout mouvement contre-indiqué qui y est mentionné.

Réponds STRICTEMENT avec ce JSON :
{
  "niveau": "string",
  "resume": "string",
  "consignesSecurite": [ "string" ],
  "semaines": [
    {
      "semaine": number,
      "objectif": "string",
      "jours": [
        {
          "jour": "string (ex: Jour 1)",
          "focus": "string",
          "echauffement": "string",
          "cardio": "string",
          "exercices": [ { "nom": "string", "series": number, "repetitions": "string", "duree": "string", "note": "string" } ]
        }
      ]
    }
  ]
}

3 à 4 jours d'entraînement par semaine. Progression graduelle entre les semaines 1 à 4.`;
}

export function buildAnalysisPrompt(
  form: PatientForm,
  calc: CalculationResult,
  locale: Locale,
): string {
  return `${listProfile(form, calc, locale)}

TÂCHE : Rédige une analyse médicale professionnelle et synthétique du profil.

Réponds STRICTEMENT avec ce JSON :
{
  "resumeProfil": "string (3-4 phrases)",
  "risquesPoids": "string",
  "analyseDiabete": "string",
  "analyseNutritionnelle": "string",
  "analyseActivite": "string",
  "recommandationsGenerales": [ "string", "string", "string" ]
}`;
}
