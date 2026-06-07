import type { PatientForm, CalculationResult, Locale, GeneratedProgram, DailyMealPlan } from "@/types";
import { MOROCCAN_RECIPES } from "@/data/recipes";

/** System prompt pour l'assistant de modification ciblée du programme. */
export const CHAT_SYSTEM_PROMPT = `Tu es l'assistant nutritionniste de l'application. Le médecin te demande de MODIFIER une partie précise d'un programme déjà généré (un jour de menu, une recette, l'analyse, etc.).

Règles :
- Modifie UNIQUEMENT l'élément demandé. Ne touche à rien d'autre.
- Respecte le régime méditerranéen, la cuisine marocaine saine, et les macros EMC (Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %).
- Respecte les calories demandées si précisées, sinon garde les calories actuelles.
- Le couscous reste réservé au vendredi midi.
- Réponds UNIQUEMENT avec l'objet JSON demandé, sans texte ni balises markdown.`;

/**
 * Modifie UN jour de menu selon une instruction libre du médecin.
 * Renvoie le jour complet modifié (même structure DailyMealPlan).
 */
export function buildModifyDayPrompt(
  jour: DailyMealPlan,
  instruction: string,
  locale: Locale,
): string {
  const lang = locale === "ar" ? "arabe (arabe médical professionnel)" : "français";
  return `LANGUE : ${lang}.

Voici le menu actuel du jour « ${jour.jour} » :
${JSON.stringify(jour)}

DEMANDE DU MÉDECIN : « ${instruction} »

Régénère CE SEUL jour (« ${jour.jour} ») en appliquant la demande. Ne modifie QUE ce que demande le médecin (ex. s'il demande de changer le petit-déjeuner, ne touche pas aux autres repas). Propose quelque chose de RÉELLEMENT DIFFÉRENT de l'actuel pour la partie modifiée, adapté au jour « ${jour.jour} ». Conserve la structure des repas, respecte le régime méditerranéen et les macros (P 11-15 %, G 50-55 %, L 35-40 %).

Réponds STRICTEMENT avec ce JSON (le jour complet modifié) :
{
  "jour": "${jour.jour}",
  "caloriesTotales": number,
  "macros": { "proteines": number, "glucides": number, "lipides": number },
  "repas": [
    { "type": "string", "nom": "string", "calories": number,
      "ingredients": [ { "nom": "string", "quantite": "string" } ] }
  ]
}`;
}

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

== RÉPARTITION DES MACRONUTRIMENTS (Tableau 3) — RÈGLE LA PLUS IMPORTANTE, NON NÉGOCIABLE ==
La répartition énergétique de CHAQUE jour DOIT IMPÉRATIVEMENT respecter ces fourchettes (vérifie le calcul P×4, G×4, L×9 kcal avant de répondre) :
- Protéines : 11 à 15 % de la ration énergétique.
- Glucides : 50 à 55 % (privilégier les glucides complexes à index glycémique bas).
- Lipides : 35 à 40 % (privilégier huiles végétales olive/colza, AG mono-insaturés ; limiter AG saturés).
C'est l'exigence prioritaire : ajuste les quantités (féculents, huile, protéines) pour que chaque jour tombe EXACTEMENT dans ces bornes. Un jour hors de ces fourchettes est une erreur à corriger.

== STRUCTURE OBLIGATOIRE DU PETIT-DÉJEUNER ==
Le petit-déjeuner ne doit JAMAIS se résumer à un yaourt + un fruit. Il DOIT contenir les 4 éléments :
1. Glucides complexes : pain complet, pain d'orge, msemen complet (à l'huile d'olive), harcha complète, baghrir complet ou autre céréale complète marocaine. (N'utilise PAS de flocons d'avoine ni de quinoa.)
2. Protéines : œufs, yaourt nature, fromage frais, lait ou fromage blanc.
3. 1 fruit frais.
4. Bonnes graisses : amandes, noix, graines ou huile d'olive.
Objectif : repas rassasiant et équilibré.

== STRUCTURE OBLIGATOIRE DU DÉJEUNER ET DU DÎNER (Tableau 8) ==
Chaque repas principal DOIT contenir TOUS ces éléments (aucun omis sans justification médicale) :
1. Crudités.
2. Source protéique OBLIGATOIRE et clairement listée dans les ingrédients avec sa quantité : viande maigre 100-120 g OU poisson 150-200 g OU volaille 120 g OU œufs OU légumineuses 150 g. AUCUN repas principal (déjeuner, dîner) sans protéine explicite.
3. Légumes à volonté.
4. Féculent complet (riz/pâtes/semoule/pomme de terre/légumes secs).
5. Pain complet : OBLIGATOIRE à chaque déjeuner ET dîner, listé dans les ingrédients (ex. « Pain complet : 50 g »). Ne l'oublie jamais.
6. Produit laitier (yaourt nature ou fromage).
Huile d'olive pour la cuisson, huile de colza pour l'assaisonnement. Sel limité.

RÈGLE D'AFFICHAGE : pour CHAQUE repas, la source de protéine et le pain complet DOIVENT apparaître explicitement dans la liste des ingrédients avec leur quantité en grammes. Le petit-déjeuner contient aussi une protéine (œufs, yaourt, fromage, lait) et une source de glucides complexes (pain complet, pain d'orge, msemen complet, harcha complète). N'utilise JAMAIS de flocons d'avoine ni de quinoa.

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

== ORGANISATION HEBDOMADAIRE (programme sur une semaine) ==
PROTÉINES :
- Poisson : 2 fois/semaine MAX (gras : sardines/maquereau, ou blanc), de préférence au DÉJEUNER, à éviter au dîner.
- Viande rouge : 2 repas/semaine MAX, de préférence au DÉJEUNER, à éviter au dîner.
- Les autres jours : privilégier volaille (poulet, dinde), œufs, légumineuses, thon — la MAJORITÉ des repas protéiques.
- Alterner les protéines : jamais le même type deux jours de suite.

DÎNERS :
- Soupes ≈ 2 fois/semaine au dîner (harira légère, soupe de légumes, chorba légère, velouté), accompagnées d'une protéine ou d'un produit laitier.

RYTHME PROFESSIONNEL :
- Déjeuners du LUNDI au VENDREDI : RAPIDES (< 30 min), simples — salades complètes, poulet/dinde grillé, omelette, thon-crudités, légumineuses simples, poisson grillé rapide, bowls, sandwichs équilibrés. ÉVITER tajines longs et plats à cuisson prolongée.
- SAMEDI et DIMANCHE : plats traditionnels marocains plus élaborés autorisés (tajines, rfissa allégée, harira traditionnelle allégée, plats familiaux).
- Le programme doit être réaliste pour une personne active qui travaille.

== RÉGIMES SPÉCIFIQUES (à appliquer selon le profil) ==
- Méditerranéen : régime de référence à privilégier (huile d'olive, légumes, légumineuses, poisson, fruits à coque, peu de viande rouge).
- Obésité : régime hypocalorique MODÉRÉ (~700 kcal/repas chez la femme, ~830 chez l'homme), jamais agressif, perte ≤ 1 kg/semaine.
- Diabète T2 : glucides complexes à IG bas, fractionnement, limiter sucres simples, surveiller HbA1c et glycémies.
- Dyslipidémies : limiter AG saturés et cholestérol (hypercholestérolémie) ou sucres simples et alcool (hypertriglycéridémie).
- Hyposodé / hypertension : limiter le sel, ne pas resaler.
- Troubles digestifs fonctionnels : repères de confort, éviter FODMAP si besoin.

== CONTRÔLE DE LA COHÉRENCE ÉNERGÉTIQUE (impératif) ==
Les calories affichées pour chaque repas DOIVENT correspondre aux quantités réellement indiquées dans les ingrédients.
- INTERDIT d'afficher 800 kcal pour un repas qui en contient réellement 500, ou 300 kcal pour 150 kcal réels.
- La somme des calories des repas doit être égale à "caloriesTotales" du jour (~calories cible).
- Vérifie chaque chiffre avant de répondre.

== TRADITIONS CULINAIRES MAROCAINES (à respecter strictement) ==
- Le COUSCOUS est un plat traditionnel du VENDREDI MIDI uniquement. Il n'apparaît QU'AU DÉJEUNER DU VENDREDI, et NULLE PART AILLEURS (jamais un autre jour, jamais à un autre repas, jamais en jour type).
- Si le programme ne contient pas de vendredi (jour type, ou semaine sans vendredi), ne propose AUCUN couscous.

== PRINCIPES GÉNÉRAUX ==
- Diversité alimentaire, équilibre 421-GPL (4 portions glucides / 2 protéines / 1 lipide d'addition par repas).
- Personnalisation, prudence, pas de carences, adhésion du patient.

Ne jamais recommander : régimes dangereux, pertes de poids excessives (> 1 kg/semaine), exercices contre-indiqués, aliments inadaptés au profil glycémique.

Les recommandations doivent être prudentes, réalistes, personnalisées et adaptées à la CUISINE MAROCAINE SAINE (tajines allégés, poisson grillé, harira légère, légumes, légumineuses), tout en respectant les répartitions et structures de repas ci-dessus.

== CONTRÔLE QUALITÉ FINAL (à vérifier AVANT de répondre, corriger le menu sinon) ==
✓ Régime méditerranéen respecté
✓ Au moins 5 portions de fruits/légumes par jour
✓ 3 produits laitiers par jour
✓ Poisson ≥ 2 fois/semaine
✓ Petit-déjeuner complet (glucides complexes + protéines + fruit + bonnes graisses)
✓ Déjeuner complet (les 6 éléments)
✓ Dîner complet (les 6 éléments)
✓ Calories de chaque repas cohérentes avec les quantités
✓ Macros cohérentes (P 11-15 %, G 50-55 %, L 35-40 %)
Si une règle n'est pas respectée, CORRIGE automatiquement le menu avant de produire le résultat.

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
      : duration === 7
        ? `"jour" = jour de la semaine dans l'ordre : "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"`
        : `"jour": "Jour 1" … "Jour ${duration}"`;

  const couscousRule =
    duration >= 7
      ? `\n- COUSCOUS : uniquement au DÉJEUNER DU VENDREDI (tradition marocaine). Jamais un autre jour, jamais à un autre repas.`
      : ``;

  return `${listProfile(form, calc, locale)}

TÂCHE : Génère ${dureeTexte} (~${calc.caloriesObjectif} kcal par jour), des recettes détaillées et UNE liste de courses regroupée par catégorie couvrant TOUTE la durée (${duration} jour(s)).${couscousRule}

CONTRAINTES ISSUES DU RÉFÉRENTIEL EMC (à respecter impérativement) :
- BASE OBLIGATOIRE : régime MÉDITERRANÉEN (huile d'olive, légumes, légumineuses, céréales complètes, poisson plusieurs fois/semaine, peu de viande rouge), exprimé en cuisine marocaine saine.
- Répartition des macros CHAQUE jour : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 % de ${calc.caloriesObjectif} kcal. Calcule les grammes en conséquence.
- Déjeuner et dîner doivent suivre la structure du repas « vertueux » : crudités/potage + viande(100-120g) ou poisson(150-200g) ou œuf + légumes verts à volonté + 1 portion de féculents + 1 tranche de pain + 1 produit laitier (yaourt/fromage).
- OBLIGATOIRE pour CHAQUE déjeuner et dîner : lister explicitement dans les ingrédients le PAIN COMPLET (ex. « Pain complet : 50 g ») ET une SOURCE DE PROTÉINE avec quantité. Ne les oublie jamais.
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

Le tableau "plans" DOIT contenir exactement ${duration} élément(s). Donne aussi 3 recettes détaillées issues de la cuisine marocaine saine, avec quantités exactes en grammes.${duration > 1 ? "\nSois CONCIS : pour gagner du temps, n'inclus QUE 3 recettes au total (pas une par jour), et garde les étapes de préparation courtes (2-4 étapes max)." : ""}`;
}

/**
 * Rôle hebdomadaire DÉTERMINISTE d'un jour (protéine du déjeuner + dîner).
 * Réparti dans le code pour GARANTIR : poisson ≤2/sem, viande rouge ≤2/sem,
 * soupes ≈2/sem au dîner, déjeuners rapides en semaine, plats élaborés le week-end.
 */
export function dayRole(jourNom: string): {
  lunch: string;
  dinner: string;
  breakfast: string;
  starch: string;
  pace: string;
} {
  const j = jourNom.toLowerCase();
  const ROLES: Record<
    string,
    { lunch: string; dinner: string; breakfast: string; starch: string }
  > = {
    lundi: {
      breakfast: "pain complet + fromage frais + œuf + fruit + amandes",
      lunch: "volaille (poulet ou dinde grillé)",
      dinner: "soupe légère (soupe de légumes ou velouté) + produit laitier",
      starch: "riz complet",
    },
    mardi: {
      breakfast: "pain d'orge + fromage frais + œuf + fruit + huile d'olive",
      lunch: "poisson gras (sardines ou maquereau) — l'un des 2 jours poisson de la semaine",
      dinner: "œufs ou légumineuses, léger",
      starch: "pâtes complètes",
    },
    mercredi: {
      breakfast: "baghrir complet + miel léger + fromage frais + fruit + noix",
      lunch: "légumineuses (lentilles, pois chiches, haricots)",
      dinner: "volaille légère ou omelette + salade",
      starch: "boulgour",
    },
    jeudi: {
      breakfast: "rghaif (msemen feuilleté) complet + yaourt nature + fruit + graines",
      lunch: "viande rouge maigre — l'un des 2 jours viande rouge de la semaine",
      dinner: "soupe légère (chorba ou harira légère) + produit laitier",
      starch: "orge complet",
    },
    vendredi: {
      breakfast: "harcha complète + fromage blanc + fruit + amandes",
      lunch: "couscous traditionnel marocain (tradition du vendredi midi)",
      dinner: "léger : thon et crudités ou œufs",
      starch: "semoule complète (couscous)",
    },
    samedi: {
      breakfast: "msemen complet + miel léger + yaourt nature + fruit + amandes",
      lunch: "poisson (2e et dernier jour poisson) OU plat marocain élaboré (tajine léger)",
      dinner: "volaille ou légumineuses",
      starch: "patate douce",
    },
    dimanche: {
      breakfast: "pain complet grillé + œuf + fromage + fruit + huile d'olive",
      lunch: "plat traditionnel marocain familial élaboré (tajine, rfissa allégée, viande rouge 2e fois si pas déjà jeudi)",
      dinner: "léger : salade complète ou légumineuses",
      starch: "pain complet",
    },
  };
  const role = ROLES[j] ?? {
    breakfast: "pain complet + protéine + fruit + bonnes graisses",
    lunch: "volaille ou légumineuses",
    dinner: "léger",
    starch: "féculent complet",
  };
  const weekend = j === "samedi" || j === "dimanche";
  const pace = weekend
    ? "C'est le WEEK-END : un plat marocain plus élaboré est autorisé au déjeuner."
    : "C'est un jour de SEMAINE (travail) : le déjeuner doit être RAPIDE à préparer (< 30 min), simple. Évite les tajines longs.";
  return { ...role, pace };
}

/**
 * Génère UN SEUL jour de menu (réponse courte → rapide).
 * Utilisé pour la génération parallèle d'une semaine (1 requête par jour).
 */
export function buildSingleDayPrompt(
  form: PatientForm,
  calc: CalculationResult,
  locale: Locale,
  jourNom: string,
  autresJours: string[],
): string {
  const repasStruct = form.modeRamadan
    ? `"type" parmi : "Ftour", "Collation après Tarawih", "Shour"`
    : `"type" parmi : "Petit-déjeuner", "Collation matin", "Déjeuner", "Collation après-midi", "Dîner"`;

  const couscousNote =
    jourNom.toLowerCase() === "vendredi"
      ? `\n- C'est VENDREDI : couscous au déjeuner (tradition marocaine).`
      : `\n- Ce n'est PAS vendredi : AUCUN couscous.`;

  const eviter =
    autresJours.length > 0
      ? `\nVARIÉTÉ STRICTE : chaque jour de la semaine doit être TOTALEMENT DIFFÉRENT des autres (${autresJours.join(", ")}). Ne répète AUCUN plat — ni le même petit-déjeuner, ni le même déjeuner, ni le même dîner. Varie les protéines, les féculents, les légumes et les modes de cuisson.`
      : ``;

  // Rôle hebdomadaire du jour (seulement en mode semaine, pas en jour type).
  const role = autresJours.length > 0 ? dayRole(jourNom) : null;
  const roleGuidance = role
    ? `\n\nMENU IMPOSÉ DE CE JOUR (à respecter pour garantir la variété et l'équilibre hebdomadaire) :
- Petit-déjeuner : base-toi sur ${role.breakfast} (différent des autres jours).
- Déjeuner : privilégier ${role.lunch}.
- Dîner : ${role.dinner}.
- Féculent principal du jour : ${role.starch} (n'utilise PAS le même féculent que les autres jours).
- ${role.pace}`
    : ``;

  return `${listProfile(form, calc, locale)}

TÂCHE : Génère le menu du jour « ${jourNom} » uniquement (~${calc.caloriesObjectif} kcal), conforme au régime méditerranéen et au référentiel EMC.${couscousNote}${eviter}${roleGuidance}

Réponds STRICTEMENT avec ce JSON (UN seul jour) :
{
  "jour": "${jourNom}",
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

Macros OBLIGATOIRES : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %.
OBLIGATOIRE : à chaque déjeuner et dîner, liste explicitement le PAIN COMPLET (ex. « Pain complet : 50 g ») ET une SOURCE DE PROTÉINE avec sa quantité (viande/poisson/volaille/œufs/légumineuses). Le petit-déjeuner doit aussi contenir une protéine.`;
}

/**
 * Génère les recettes détaillées + la liste de courses à partir des menus déjà
 * générés (jours). Réponse modérée → rapide.
 */
export function buildExtrasPrompt(
  plans: { jour: string; repas: { type: string; nom: string; ingredients: { nom: string; quantite: string }[] }[] }[],
  locale: Locale,
): string {
  const lang = locale === "ar" ? "arabe (arabe médical professionnel)" : "français";
  return `LANGUE : ${lang}.

Voici les menus déjà établis :
${JSON.stringify(plans)}

TÂCHE :
1. Donne 3 recettes détaillées (cuisine marocaine saine) parmi les plats principaux ci-dessus.
2. Établis UNE liste de courses regroupée par catégorie, en ADDITIONNANT les quantités de TOUS les jours.

Réponds STRICTEMENT avec ce JSON :
{
  "recettes": [
    { "nom": "string", "tempsCuisson": "string", "calories": number,
      "macros": { "proteines": number, "glucides": number, "lipides": number },
      "ingredients": [ { "nom": "string", "quantite": "string" } ],
      "etapes": [ "string" ] }
  ],
  "listeCourses": [
    { "categorie": "string", "items": [ { "nom": "string", "quantite": "string (ex: 1.5 kg)" } ] }
  ]
}`;
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
