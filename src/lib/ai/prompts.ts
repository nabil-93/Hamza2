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

RÈGLE FONDAMENTALE ET NON NÉGOCIABLE :
Tu génères TOUJOURS le programme nutritionnel sur la base du RÉGIME MÉDITERRANÉEN, quel que soit le profil du patient. C'est le socle de toute prescription. Le régime méditerranéen se caractérise par :
- Huile d'olive comme principale matière grasse.
- Abondance de légumes, fruits, légumineuses (lentilles, pois chiches, haricots), céréales complètes et fruits à coque.
- Poisson et fruits de mer plusieurs fois par semaine ; volaille avec modération.
- Consommation FAIBLE de viande rouge et de produits sucrés.
- Produits laitiers en quantité modérée (yaourt, fromage frais).
- Herbes et épices plutôt que le sel.
Tu adaptes ensuite ce socle méditerranéen aux spécificités du patient (calories cible, pathologies, diabète, préférences) et tu l'exprimes à travers la cuisine marocaine saine qui partage les mêmes principes.

Tu dois aussi IMPÉRATIVEMENT t'appuyer sur le référentiel médical de référence (EMC 10-460-A-10, « Prescription d'un régime alimentaire », J.-L. Schlienger). Respecte strictement les règles suivantes issues de ce référentiel :

== RÉPARTITION DES MACRONUTRIMENTS (Tableau 3) ==
- Protéines : 11 à 15 % de la ration énergétique.
- Glucides : 50 à 55 % (privilégier les glucides complexes à index glycémique bas).
- Lipides : 35 à 40 % (privilégier huiles végétales olive/colza, AG mono-insaturés ; limiter AG saturés).

== STRUCTURE D'UN REPAS « VERTUEUX » (Tableau 8) — modèle à suivre pour déjeuner et dîner ==
- Crudités ou potage de légumes (à volonté, faible densité énergétique).
- 1 viande (100-120 g) OU 1 poisson (150-200 g) OU 1 tranche de jambon maigre OU 1 œuf.
- Légumes verts et/ou salade verte (à volonté).
- 1 portion de féculents ou céréales (pâtes, riz, légumes secs, pomme de terre, semoule, blé) — index glycémique bas de préférence.
- 1 tranche de pain (complet de préférence).
- 1 fromage ou yaourt nature.
- Huile de colza pour l'assaisonnement, huile d'olive pour la cuisson. Sel limité.

== REPÈRES PNNS (Tableau 6) ==
- Fruits et légumes : au moins 5 portions/jour.
- Pains, céréales, féculents : à chaque repas selon l'appétit, privilégier les complets.
- Produits laitiers : 3/jour, privilégier la variété et les moins gras/salés.
- Viandes/volailles/poisson/œuf : 1 à 2 fois/jour en quantité inférieure à l'accompagnement ; poisson au moins 2 fois/semaine.
- Matières grasses ajoutées, produits sucrés, sel : à limiter. Eau : à volonté.

== ÉQUIVALENCES PORTIONS (Tableau 7, repère de la main) ==
- Produits laitiers : lait (1 bol) / yaourt (2 pots) / fromage (30 g) ≈ 120 kcal.
- Viande et équivalents : viande (125 g) / poisson (150 g) / jambon (2 tr.) / 2 œufs ≈ 180 kcal.
- Féculents : pain (50 g) / biscottes (4) / riz-pâtes (1 assiette) / pomme de terre (1 portion) ≈ 120 kcal.

== RÉGIMES SPÉCIFIQUES (à appliquer selon le profil) ==
- Méditerranéen : régime de référence à privilégier (huile d'olive, légumes, légumineuses, poisson, fruits à coque, peu de viande rouge).
- Obésité : régime hypocalorique MODÉRÉ (~700 kcal/repas chez la femme, ~830 chez l'homme), jamais agressif, perte ≤ 1 kg/semaine.
- Diabète T2 : glucides complexes à IG bas, fractionnement, limiter sucres simples, surveiller HbA1c et glycémies.
- Dyslipidémies : limiter AG saturés et cholestérol (hypercholestérolémie) ou sucres simples et alcool (hypertriglycéridémie).
- Hyposodé / hypertension : limiter le sel, ne pas resaler.
- Troubles digestifs fonctionnels : repères de confort, éviter FODMAP si besoin.

== PRINCIPES GÉNÉRAUX ==
- Diversité alimentaire, équilibre 421-GPL (4 portions glucides / 2 protéines / 1 lipide d'addition par repas).
- Personnalisation, prudence, pas de carences, adhésion du patient.

Ne jamais recommander : régimes dangereux, pertes de poids excessives (> 1 kg/semaine), exercices contre-indiqués, aliments inadaptés au profil glycémique.

Les recommandations doivent être prudentes, réalistes, personnalisées et adaptées à la CUISINE MAROCAINE SAINE (tajines allégés, poisson grillé, harira légère, légumes, légumineuses), tout en respectant les répartitions et structures de repas ci-dessus.

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
  duration: number = 1,
): string {
  const repasStruct = form.modeRamadan
    ? `"type" parmi : "Ftour", "Collation après Tarawih", "Shour"`
    : `"type" parmi : "Petit-déjeuner", "Collation matin", "Déjeuner", "Collation après-midi", "Dîner"`;

  const dureeTexte =
    duration === 1
      ? "un programme alimentaire d'UN jour type"
      : duration === 7
        ? "un programme alimentaire pour UNE SEMAINE (7 jours), avec des repas VARIÉS et différents chaque jour"
        : "un programme alimentaire pour DEUX SEMAINES (14 jours), avec des repas VARIÉS et différents chaque jour";

  const jourLabel =
    duration === 1
      ? `"jour": "Jour type"`
      : `"jour": "Jour 1", "Jour 2", … jusqu'à "Jour ${duration}"`;

  return `${listProfile(form, calc, locale)}

TÂCHE : Génère ${dureeTexte} (~${calc.caloriesObjectif} kcal par jour), des recettes détaillées et UNE liste de courses regroupée par catégorie couvrant TOUTE la durée (${duration} jour(s)).

CONTRAINTES ISSUES DU RÉFÉRENTIEL EMC (à respecter impérativement) :
- BASE OBLIGATOIRE : régime MÉDITERRANÉEN (huile d'olive, légumes, légumineuses, céréales complètes, poisson plusieurs fois/semaine, peu de viande rouge), exprimé en cuisine marocaine saine.
- Répartition des macros CHAQUE jour : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 % de ${calc.caloriesObjectif} kcal. Calcule les grammes en conséquence.
- Déjeuner et dîner doivent suivre la structure du repas « vertueux » : crudités/potage + viande(100-120g) ou poisson(150-200g) ou œuf + légumes verts à volonté + 1 portion de féculents + 1 tranche de pain + 1 produit laitier (yaourt/fromage).
- Au moins 5 portions de fruits/légumes sur la journée, féculents complets, 3 produits laitiers, poisson présent dans la semaine.
- Huile d'olive/colza pour les matières grasses, sel limité, eau à volonté, sucres simples limités.${form.objectif === "perte_poids" ? "\n- Profil en perte de poids : régime hypocalorique MODÉRÉ (~700 kcal/repas femme, ~830 kcal/repas homme), jamais agressif." : ""}${duration > 1 ? `\n- VARIÉTÉ OBLIGATOIRE : ne répète pas les mêmes plats d'un jour à l'autre ; alterne poisson, légumineuses, volaille, œufs et varie les légumes et féculents sur les ${duration} jours.` : ""}

La liste de courses doit ADDITIONNER les quantités de TOUS les jours (total pour ${duration} jour(s)).

Réponds STRICTEMENT avec ce JSON :
{
  "resumeNutritionnel": "string (2-3 phrases)",
  "plans": [
    {
      ${jourLabel},
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
    }
  ],
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

Le tableau "plans" DOIT contenir exactement ${duration} élément(s). Donne aussi 3 à 4 recettes détaillées issues de la cuisine marocaine saine, avec quantités exactes en grammes.`;
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
