import type { PatientForm, CalculationResult, Locale, GeneratedProgram, DailyMealPlan } from "@/types";
import { MOROCCAN_RECIPES } from "@/data/recipes";
import {
  PETIT_DEJ_OPTIONS,
  DINER_OPTIONS,
  LEGUMES_AUTORISES,
  FECULENTS_AUTORISES,
} from "@/data/meal-bank";

/** System prompt pour l'assistant de modification ciblée du programme. */
export const CHAT_SYSTEM_PROMPT = `Tu es l'assistant nutritionniste de l'application. Le médecin te demande de MODIFIER une partie précise d'un programme déjà généré (un jour de menu, une recette, l'analyse, etc.).

Règles :
- Modifie UNIQUEMENT l'élément demandé. Ne touche à rien d'autre.
- Respecte le régime méditerranéen, la cuisine marocaine saine, et les macros EMC (Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %).
- Respecte les calories demandées si précisées, sinon garde les calories actuelles.
- Le couscous reste réservé au vendredi midi.
- Réponds UNIQUEMENT avec l'objet JSON demandé, sans texte ni balises markdown.`;

/** System prompt pour l'assistant CONVERSATIONNEL (discussion + proposition). */
export const DISCUSS_SYSTEM_PROMPT = `Tu es un nutritionniste assistant qui DISCUTE avec un médecin à propos d'un jour de menu déjà généré.

Tu fonctionnes comme un vrai collègue : tu réponds à ses questions, tu donnes ton avis, tu expliques tes choix, tu proposes des alternatives. Tu es naturel, concis et professionnel.

DEUX TYPES D'ÉCHANGES :
1. QUESTION / DISCUSSION (« qu'en penses-tu ? », « pourquoi ce plat ? », « est-ce adapté au diabète ? », « propose-moi autre chose pour le dîner ») → tu réponds par du TEXTE clair. Tu peux suggérer une idée de modification dans ta réponse, mais tu n'appliques RIEN.
2. DEMANDE D'APPLICATION (« remplace le déjeuner par X », « applique », « modifie le petit-déjeuner », « mets du poisson au lieu du poulet », « baisse à 1600 kcal ») → là tu PRÉPARES la version modifiée complète du jour ET tu l'inclus dans le champ "proposition".

RÈGLES MÉTIER (à respecter dans toute proposition) :
- Régime méditerranéen, cuisine marocaine saine.
- Macros EMC : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %.
- Déjeuner et dîner : protéine explicite + pain complet listés. Petit-déjeuner sans fruit. Déjeuner = seul repas avec 1 fruit. Couscous = vendredi midi uniquement. Pas de quinoa ni d'avoine.
- CALORIES : le déjeuner doit TOUJOURS être plus calorique que le dîner (déjeuner > dîner). Si une modification casse cette règle, rééquilibre les portions pour la rétablir.
- ŒUF : uniquement au petit-déjeuner. JAMAIS d'œuf au déjeuner ni au dîner. Si tu dois mettre une protéine au dîner, choisis volaille/viande/fromage (jamais œuf, jamais poisson).
- Garde les calories actuelles sauf demande contraire.

FORMAT DE RÉPONSE — réponds TOUJOURS avec cet objet JSON (sans texte ni markdown autour) :
{
  "reponse": "ta réponse en langage naturel au médecin (toujours présente)",
  "proposition": null | { jour complet modifié, même structure que le menu fourni }
}
- "proposition" vaut null pour une simple discussion ou question.
- "proposition" contient le jour modifié UNIQUEMENT quand le médecin demande explicitement une modification/application. Dans ce cas, "reponse" décrit en une phrase ce que tu as changé.

RÈGLES STRICTES POUR "proposition" (le médecin VOIT la proposition avant de l'appliquer) :
- Tu inclus le JOUR COMPLET (tous les repas), pas seulement le repas modifié.
- Tu ne changes QUE ce que le médecin a demandé. Tous les autres repas restent IDENTIQUES au menu fourni (mêmes noms, ingrédients, quantités, préparations) — ne les reformule pas, ne les "améliore" pas.
- Recalcule "calories" du repas modifié et "caloriesTotales" du jour (= somme des repas).
- Dans "reponse", décris précisément ce que tu as ajouté/remplacé pour que le médecin sache exactement à quoi s'attendre avant de cliquer sur Appliquer.`;

/**
 * Modifie UN jour de menu selon une instruction libre du médecin.
 * Renvoie le jour complet modifié (même structure DailyMealPlan).
 */
export function buildModifyDayPrompt(
  jour: DailyMealPlan,
  instruction: string,
  locale: Locale,
  form?: PatientForm,
): string {
  const lang = locale === "ar" ? "arabe (arabe médical professionnel)" : "français";
  const contraintes = form ? buildPatientConstraints(form) : "";
  return `LANGUE : ${lang}.${contraintes}

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
      "ingredients": [ { "nom": "string", "quantite": "string", "preparation": "string (cru, cuit vapeur, grillé…)" } ] }
  ]
}`;
}

/** Un tour de conversation du chat (mémoire). */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/**
 * Construit le prompt de DISCUSSION sur un jour : l'IA répond en langage naturel
 * et n'inclut une proposition de jour modifié QUE si le médecin le demande.
 * history = échanges précédents (l'IA garde le contexte).
 */
export function buildDiscussDayPrompt(
  jour: DailyMealPlan,
  message: string,
  locale: Locale,
  form: PatientForm,
  calc: CalculationResult,
  history: ChatTurn[] = [],
): string {
  const lang = locale === "ar" ? "arabe (arabe médical professionnel)" : "français";
  const contraintes = buildPatientConstraints(form);

  const historyBlock =
    history.length > 0
      ? `\n\nHISTORIQUE DE LA CONVERSATION (garde ce contexte) :\n${history
          .map((h) => `${h.role === "user" ? "MÉDECIN" : "TOI"} : ${h.content}`)
          .join("\n")}`
      : "";

  return `LANGUE DE RÉPONSE : ${lang}.${contraintes}

CONTEXTE PATIENT : objectif ${form.objectif}, ~${calc.caloriesObjectif} kcal/jour, IMC ${calc.imc} (${calc.imcCategorie}), pathologies : ${form.pathologies.join(", ") || "aucune"}.

JOUR EN COURS DE DISCUSSION (« ${jour.jour} ») — menu actuel :
${JSON.stringify(jour)}${historyBlock}

NOUVEAU MESSAGE DU MÉDECIN : « ${message} »

Réponds comme un collègue nutritionniste. Si c'est une question/discussion → réponds par du texte, "proposition" = null. Si le médecin demande une modification du jour → applique-la dans "proposition" (jour complet, même structure, avec "preparation" par ingrédient) et résume le changement dans "reponse".

Réponds STRICTEMENT avec ce JSON :
{
  "reponse": "string",
  "proposition": null | {
    "jour": "${jour.jour}",
    "caloriesTotales": number,
    "macros": { "proteines": number, "glucides": number, "lipides": number },
    "repas": [
      { "type": "string", "nom": "string", "calories": number,
        "ingredients": [ { "nom": "string", "quantite": "string", "preparation": "string" } ] }
    ]
  }
}`;
}

/** System prompt pour la régénération d'un seul repas. */
export const REGENERATE_MEAL_SYSTEM_PROMPT = `Tu es un nutritionniste qui régénère UN SEUL repas d'un menu marocain sain (régime méditerranéen, référentiel EMC).
Tu proposes une ALTERNATIVE différente du repas actuel, en respectant la structure et le rôle nutritionnel du repas.
Réponds UNIQUEMENT avec l'objet JSON du repas, sans texte ni balises markdown.`;

/**
 * Régénère UN SEUL repas d'un jour (petit-déjeuner, déjeuner ou dîner).
 * Renvoie le repas modifié (structure Meal). Garde le rôle du repas et vise
 * les mêmes calories ; propose un plat DIFFÉRENT de l'actuel et des autres repas du jour.
 */
export function buildRegenerateMealPrompt(
  jour: DailyMealPlan,
  mealIndex: number,
  locale: Locale,
  form: PatientForm,
): string {
  const lang = locale === "ar" ? "arabe (arabe médical professionnel)" : "français";
  const contraintes = buildPatientConstraints(form);
  const repas = jour.repas[mealIndex];
  const autresRepas = jour.repas.filter((_, i) => i !== mealIndex);

  // Règles spécifiques selon le type de repas.
  const type = repas.type.toLowerCase();
  let regleRepas = "";
  if (type.includes("petit")) {
    regleRepas = "C'est un PETIT-DÉJEUNER : glucides complexes (pain complet/orge/msemen/harcha) + protéine (œuf/fromage/yaourt) + bonnes graisses. AUCUN fruit. Pas d'avoine ni de quinoa.";
  } else if (type.includes("déjeuner") || type.includes("dejeuner")) {
    const diner = jour.repas.find((r) => {
      const tt = r.type.toLowerCase();
      return tt.includes("dîner") || tt.includes("diner");
    });
    const plancher = diner ? ` Les calories du déjeuner doivent rester SUPÉRIEURES à celles du dîner (${diner.calories} kcal) — le déjeuner est le repas le plus copieux.` : "";
    regleRepas = `C'est le DÉJEUNER (repas principal) : crudités + protéine 120-150 g (viande/poisson/volaille/œufs) + petit féculent complet + pain complet + 1 fruit en dessert. Le déjeuner est le SEUL repas avec un fruit.${plancher}`;
  } else if (type.includes("dîner") || type.includes("diner")) {
    const dej = jour.repas.find((r) => {
      const tt = r.type.toLowerCase();
      return (tt.includes("déjeuner") || tt.includes("dejeuner")) && !tt.includes("petit");
    });
    const plafond = dej ? ` Les calories du dîner doivent rester INFÉRIEURES à celles du déjeuner (${dej.calories} kcal) — le dîner est plus léger que le déjeuner.` : "";
    regleRepas = `C'est le DÎNER : toujours une protéine explicite (volaille/viande/fromage) + légumes + pain complet. JAMAIS d'œuf au dîner (l'œuf est réservé au petit-déjeuner). JAMAIS de poisson au dîner. Pas de fruit.${plafond}`;
  }

  const couscousNote =
    jour.jour.toLowerCase() === "vendredi" && (type.includes("déjeuner") || type.includes("dejeuner"))
      ? "C'est le déjeuner du vendredi : le couscous est autorisé."
      : "Pas de couscous (réservé au déjeuner du vendredi).";

  return `LANGUE DE RÉPONSE : ${lang}.${contraintes}

Jour « ${jour.jour} » — tu dois RÉGÉNÉRER UNIQUEMENT le repas « ${repas.type} » (~${repas.calories} kcal).

REPAS ACTUEL (à remplacer par une alternative DIFFÉRENTE) :
${JSON.stringify(repas)}

AUTRES REPAS DU JOUR (NE PAS répéter leurs plats/protéines) :
${JSON.stringify(autresRepas)}

${regleRepas}
${couscousNote}
Vise environ ${repas.calories} kcal. Propose un plat marocain sain RÉELLEMENT DIFFÉRENT de l'actuel et des autres repas du jour.

Réponds STRICTEMENT avec ce JSON (UN seul repas) :
{
  "type": "${repas.type}",
  "nom": "string",
  "calories": number,
  "ingredients": [ { "nom": "string", "quantite": "string (ex: 120 g)", "preparation": "string (cru, grillé, vapeur…)" } ]
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
Le petit-déjeuner ne doit JAMAIS se résumer à un yaourt + un fruit. Il DOIT contenir :
1. Glucides complexes : pain complet, pain d'orge, msemen complet (à l'huile d'olive), harcha complète, baghrir complet ou autre céréale complète marocaine. (N'utilise PAS de flocons d'avoine ni de quinoa.)
2. Protéines : œufs, yaourt nature, fromage frais, lait ou fromage blanc.
3. Bonnes graisses : amandes, noix, graines ou huile d'olive.
INTERDIT au petit-déjeuner : AUCUN fruit ni dessert. Les fruits/desserts sont réservés au DÉJEUNER. Tu peux ajouter une boisson chaude (thé/café sans sucre) ou des olives.
Objectif : repas rassasiant et équilibré, sans fruit.

== STRUCTURE OBLIGATOIRE DU DÉJEUNER ET DU DÎNER (Tableau 8) ==
RÈGLE ABSOLUE : le DÉJEUNER et le DÎNER de CHAQUE jour DOIVENT CHACUN contenir une source de protéine animale ou végétale clairement identifiée et chiffrée. Jamais un déjeuner ni un dîner sans protéine, même quand c'est une soupe ou une salade : dans ce cas, AJOUTE une protéine (poulet, viande hachée, thon, fromage en quantité protéique, pois chiches). ⚠️ L'ŒUF EST INTERDIT AU DÎNER (et au déjeuner) : l'œuf/l'omelette ne se met QU'AU PETIT-DÉJEUNER. N'utilise jamais d'œuf comme protéine du dîner ni du déjeuner.
Chaque repas principal DOIT contenir TOUS ces éléments (aucun omis sans justification médicale) :
1. Crudités.
2. Source protéique OBLIGATOIRE et clairement listée dans les ingrédients avec sa quantité : viande maigre 100-120 g OU poisson 150-200 g OU volaille 120 g OU thon OU légumineuses 150 g. PAS d'œuf au déjeuner ni au dîner (l'œuf est réservé au petit-déjeuner). AUCUN repas principal (déjeuner, dîner) sans protéine explicite. Une soupe au dîner DOIT être accompagnée d'une protéine (ex. soupe de légumes + blanc de poulet, ou + dinde, ou + fromage).
3. Légumes à volonté.
4. Féculent complet (riz/pâtes/semoule/pomme de terre/légumes secs).
5. Pain complet : OBLIGATOIRE à chaque déjeuner ET dîner, listé dans les ingrédients (ex. « Pain complet : 50 g »). Ne l'oublie jamais.
6. Produit laitier (yaourt nature ou fromage).
Huile d'olive pour la cuisson, huile de colza pour l'assaisonnement. Sel limité.

== RÈGLES SPÉCIFIQUES SUPPLÉMENTAIRES ==
- DÉJEUNER = repas PRINCIPAL de la journée (le plus complet et copieux). C'est le SEUL repas qui contient un FRUIT/DESSERT (1 portion en fin de repas). Aucun fruit ailleurs (ni petit-déjeuner, ni dîner).
- RÈGLE CALORIQUE ABSOLUE ET NON NÉGOCIABLE : les calories du DÉJEUNER doivent TOUJOURS être SUPÉRIEURES à celles du DÎNER (déjeuner > dîner), CHAQUE jour, sans exception. Le déjeuner est le repas le plus calorique de la journée, le dîner reste plus léger. Avant de répondre, vérifie pour chaque jour que calories(déjeuner) > calories(dîner) ; si ce n'est pas le cas, ajuste les portions pour que le déjeuner repasse au-dessus du dîner.
- POISSON (l7out) : 2 repas/semaine MAXIMUM, et UNIQUEMENT au DÉJEUNER. JAMAIS de poisson au dîner ni au petit-déjeuner.
- LENTILLES (l3dess) : 1 à 2 fois/semaine MAXIMUM, et UNIQUEMENT en ACCOMPAGNEMENT (jamais comme plat principal). Le plat principal protéique doit être une viande/volaille/poisson/œufs, pas les lentilles.
- Les autres repas alternent des protéines variées et riches : poulet, dinde, escalope de poulet, viande maigre, œufs, thon. Programme RICHE EN PROTÉINES toute la semaine.
- ŒUFS / OMELETTE / ŒUFS BROUILLÉS / ŒUFS DURS : UNIQUEMENT au PETIT-DÉJEUNER. RÈGLE STRICTE ET NON NÉGOCIABLE : JAMAIS d'œuf au déjeuner, JAMAIS d'œuf au dîner, sous aucune forme. L'œuf n'apparaît que dans le petit-déjeuner.
- Ne JAMAIS utiliser de quinoa ni de flocons d'avoine.

RÈGLE D'AFFICHAGE : pour CHAQUE repas, la source de protéine et le pain complet DOIVENT apparaître explicitement dans la liste des ingrédients avec leur quantité en grammes. Le petit-déjeuner contient une protéine (œufs, yaourt, fromage, lait) et une source de glucides complexes (pain complet, pain d'orge, msemen complet, harcha complète), SANS fruit. N'utilise JAMAIS de flocons d'avoine ni de quinoa.

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
✓ Calories du DÉJEUNER strictement SUPÉRIEURES à celles du DÎNER (déjeuner > dîner) CHAQUE jour
✓ AUCUN œuf au déjeuner ni au dîner (œuf = petit-déjeuner uniquement) ; aucun poisson au dîner
✓ Macros cohérentes (P 11-15 %, G 50-55 %, L 35-40 %)
Si une règle n'est pas respectée, CORRIGE automatiquement le menu avant de produire le résultat.

IMPORTANT : Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour, sans balises markdown. Respecte exactement le schéma demandé.`;

/**
 * Bloc de contraintes patient dérivées du formulaire.
 * Injecté dans chaque prompt de génération pour que l'IA ne les ignore jamais.
 */
function buildPatientConstraints(form: PatientForm): string {
  const lines: string[] = [];

  // Objectif calorique
  if (form.objectif === "perte_poids") {
    lines.push("- OBJECTIF PERTE DE POIDS : régime hypocalorique modéré. Portions contrôlées, jamais de plats riches ou copieux.");
  } else if (form.objectif === "prise_poids") {
    lines.push("- OBJECTIF PRISE DE POIDS : augmenter les portions de féculents et protéines. Repas complets et denses.");
  }

  // Pathologies
  if (form.pathologies.includes("diabete_type_1") || form.pathologies.includes("diabete_type_2") || form.pathologies.includes("prediabete")) {
    lines.push("- DIABÈTE : index glycémique bas obligatoire. INTERDIT : sucres simples, pain blanc, riz blanc, pomme de terre seule, jus de fruits, desserts sucrés, miel. Féculents complets uniquement, petites portions, fractionner les glucides sur les repas.");
  }
  if (form.pathologies.includes("hypertension")) {
    lines.push("- HYPERTENSION : sel limité au maximum. INTERDIT : plats salés, charcuteries, fromages très salés, conserves salées. Pas de resalage.");
  }
  if (form.pathologies.includes("dyslipidemie")) {
    lines.push("- DYSLIPIDÉMIE : limiter graisses saturées et cholestérol. INTERDIT : viande rouge grasse, beurre, crème, friture, œufs en excès (max 3/sem). Privilégier poisson gras, huile d'olive, noix.");
  }
  if (form.pathologies.includes("maladie_cardiovasculaire")) {
    lines.push("- MALADIE CARDIOVASCULAIRE : régime méditerranéen strict. INTERDIT : graisses saturées, sel en excès, sucres simples, alcool, fritures.");
  }
  if (form.pathologies.includes("hypothyroidie")) {
    lines.push("- HYPOTHYROÏDIE : limiter les crucifères crus (chou, brocoli, chou-fleur) — les cuire obligatoirement. Privilégier iode (poisson, fruits de mer).");
  }
  if (form.pathologies.includes("syndrome_metabolique")) {
    lines.push("- SYNDROME MÉTABOLIQUE : réduire glucides raffinés et graisses saturées. Favoriser fibres, légumes, légumineuses et poisson. INTERDIT : sucres simples, pain blanc, fritures.");
  }

  // Commentaire pathologies libre
  if (form.commentairePathologies?.trim()) {
    lines.push(`- CONTRAINTE MÉDICALE SPÉCIFIQUE (à respecter impérativement) : ${form.commentairePathologies.trim()}`);
  }

  // Aliments interdits
  const interdits = form.preferences.alimentsInterdits?.trim();
  if (interdits) {
    lines.push(`- ⚠️ ALIMENTS STRICTEMENT INTERDITS (allergie / intolérance / refus du patient) — NE JAMAIS UTILISER DANS AUCUN REPAS NI AUCUN INGRÉDIENT : ${interdits}`);
    lines.push("  → Avant de répondre, vérifie chaque ingrédient de chaque repas. Si l'un de ces aliments apparaît, remplace-le immédiatement par un équivalent compatible.");
  }

  // Préférences
  const prefs = form.preferences.commentaire?.trim();
  if (prefs) {
    lines.push(`- PRÉFÉRENCES ALIMENTAIRES (à intégrer en priorité dans les menus) : ${prefs}`);
  }

  if (lines.length === 0) return "";

  return `\n⚠️ CONTRAINTES PATIENT OBLIGATOIRES — À VÉRIFIER POUR CHAQUE REPAS ET CHAQUE INGRÉDIENT :\n${lines.join("\n")}`;
}

function listProfile(form: PatientForm, calc: CalculationResult, locale: Locale): string {
  const pref = form.preferences;
  const lang = locale === "ar" ? "arabe (langue arabe médicale professionnelle)" : "français";

  const aDesPreferences = !!(pref.commentaire?.trim());
  const aDesInterdits = !!(pref.alimentsInterdits?.trim());

  const consignePreferences = aDesPreferences
    ? `Le patient a indiqué des préférences à respecter en priorité : ${pref.commentaire!.trim()}`
    : `Le patient n'a indiqué AUCUNE préférence : compose librement avec les aliments les plus COURANTS et ACCESSIBLES au Maroc (faciles à trouver au souk/supermarché, économiques, simples à cuisiner pour une personne qui travaille). Évite les aliments rares, chers ou difficiles à trouver.`;

  const consigneInterdits = aDesInterdits
    ? `⚠️ ALIMENTS STRICTEMENT INTERDITS — NE JAMAIS UTILISER DANS AUCUN REPAS (allergie / intolérance / refus du patient) : ${pref.alimentsInterdits!.trim()}
Vérifie CHAQUE repas et CHAQUE ingrédient : si l'un de ces aliments apparaît, remplace-le immédiatement par un équivalent compatible avant de répondre.`
    : `Aucun aliment interdit signalé.`;

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

PRÉFÉRENCES ALIMENTAIRES : ${consignePreferences}

${consigneInterdits}

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

  return `${listProfile(form, calc, locale)}${buildPatientConstraints(form)}

TÂCHE : Génère ${dureeTexte} (~${calc.caloriesObjectif} kcal par jour), des recettes détaillées et UNE liste de courses regroupée par catégorie couvrant TOUTE la durée (${duration} jour(s)).${couscousRule}

CONTRAINTES ISSUES DU RÉFÉRENTIEL EMC (à respecter impérativement) :
- BASE OBLIGATOIRE : régime MÉDITERRANÉEN (huile d'olive, légumes, légumineuses, céréales complètes, poisson plusieurs fois/semaine, peu de viande rouge), exprimé en cuisine marocaine saine.
- Répartition des macros CHAQUE jour : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 % de ${calc.caloriesObjectif} kcal. Calcule les grammes en conséquence.
- Déjeuner et dîner doivent suivre la structure du repas « vertueux » : crudités/potage + viande(100-120g) ou poisson(150-200g, déjeuner uniquement) ou volaille + légumes verts à volonté + 1 portion de féculents + 1 tranche de pain + 1 produit laitier (yaourt/fromage).
- ⚠️ ŒUF : UNIQUEMENT au PETIT-DÉJEUNER. JAMAIS d'œuf au déjeuner ni au dîner, sous aucune forme (ni dur, ni omelette, ni au plat). La protéine du dîner est de la volaille, viande ou fromage (jamais œuf, jamais poisson).
- OBLIGATOIRE pour CHAQUE déjeuner et dîner : lister explicitement dans les ingrédients le PAIN COMPLET (ex. « Pain complet : 50 g ») ET une SOURCE DE PROTÉINE avec quantité. Ne les oublie jamais.
- Au moins 5 portions de fruits/légumes sur la journée, féculents complets, 3 produits laitiers, poisson présent dans la semaine.
- Huile d'olive/colza pour les matières grasses, sel limité, eau à volonté, sucres simples limités.${form.objectif === "perte_poids" ? "\n- Profil en perte de poids : régime hypocalorique MODÉRÉ (~700 kcal/repas femme, ~830 kcal/repas homme), jamais agressif." : ""}${duration > 1 ? `\n- VARIÉTÉ OBLIGATOIRE : ne répète pas les mêmes plats d'un jour à l'autre ; alterne poisson, légumineuses, volaille, œufs et varie les légumes et féculents sur les ${duration} jours.` : ""}

BANQUE DE RÉFÉRENCE (inspire-toi de ces modèles, MAIS VARIE — deux patients ne doivent jamais avoir le même programme) :
• Petit-déjeuner (SANS fruit) : ${PETIT_DEJ_OPTIONS.slice(0, 4).join(" | ")}.
• Déjeuner : crudités + 150 g de protéine + petit féculent (50-100 g) + 1 fruit en dessert.
• Dîner (toujours une protéine) : ${DINER_OPTIONS.slice(0, 6).join(" | ")}.
• Légumes autorisés : ${LEGUMES_AUTORISES.slice(0, 14).join(", ")}…

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
          "ingredients": [ { "nom": "string", "quantite": "string (ex: 120 g)", "preparation": "string (cru, cuit vapeur, grillé, bouilli, poêlé…)" } ]
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Contraintes d'un jour. La PROTÉINE du déjeuner respecte des quotas FIXES par
 * jour (poisson Mer+Dim, viande rouge Jeu, vendredi couscous) pour garantir
 * poisson ≤2/sem et viande rouge ≤2/sem. Le reste (dîner, féculent, petit-déj)
 * est tiré ALÉATOIREMENT à chaque génération → deux programmes ne se ressemblent pas.
 */
export function dayRole(jourNom: string): {
  lunch: string;
  dinner: string;
  breakfast: string;
  starch: string;
  pace: string;
} {
  const j = jourNom.toLowerCase();

  // Protéine du déjeuner : fixée pour respecter les quotas hebdomadaires.
  const LUNCH_PROTEINE: Record<string, string> = {
    lundi: "volaille (poulet OU dinde, grillé/au four/en tajine léger)",
    mardi: "poisson (sardines, maquereau, thon OU merlan) — 1er des 2 jours poisson",
    mercredi: "volaille OU escalope de poulet/dinde",
    jeudi: "viande rouge maigre (steak, viande hachée OU brochettes) — jour viande rouge",
    vendredi: "couscous marocain (vendredi)",
    samedi: "poisson (2e jour poisson) OU volaille en tajine",
    dimanche: "plat familial élaboré (tajine de poulet/dinde, rfissa allégée OU viande)",
  };

  // Petit-déjeuner : base aléatoire parmi plusieurs styles marocains (sans fruit).
  const breakfast = pick([
    "pain complet + œuf + fromage frais + huile d'olive",
    "pain d'orge + fromage blanc + 1 œuf dur + olives",
    "msemen complet + fromage frais + amandes + thé sans sucre",
    "baghrir complet + miel léger + yaourt nature + noix",
    "harcha complète + fromage frais + huile d'olive",
    "rghaif complet + œuf + yaourt nature + graines",
    "pain complet + ¼ avocat + 1 œuf + olives",
    "bol de belboula d'orge + fromage frais + amandes",
  ]);

  // Dîner : tiré aléatoirement, TOUJOURS avec protéine (jamais d'œuf ni de poisson au dîner).
  const dinner = pick([
    "soupe de légumes + 150 g de poulet émincé + produit laitier",
    "soupe de légumes + 150 g de poulet émincé",
    "légumes au four + 150 g de poulet",
    "légumes sautés + 150 g de dinde",
    "tajine de légumes + 150 g de dinde",
    "chorba légère + 150 g de poulet",
    "velouté de légumes + 120 g de poulet + fromage",
    "légumes vapeur + 150 g de blanc de dinde",
  ]);

  // Féculent : tiré aléatoirement.
  const starch = pick([
    "riz complet", "pâtes complètes", "boulgour", "orge complet",
    "pomme de terre", "patate douce", "semoule complète", "pain complet",
  ]);

  const role = {
    breakfast: `${breakfast} (sans fruit)`,
    lunch: `${LUNCH_PROTEINE[j] ?? "volaille"} + 1 fruit en dessert`,
    dinner,
    starch,
  };
  const weekend = j === "samedi" || j === "dimanche";
  const pace = weekend
    ? "C'est le WEEK-END : un plat marocain plus élaboré est autorisé au déjeuner."
    : "C'est un jour de SEMAINE (travail) : le déjeuner doit être RAPIDE à préparer (< 30 min), simple. Évite les tajines longs.";
  return { ...role, pace };
}

/**
 * Génère UN SEUL jour de menu (réponse courte → rapide).
 * Utilisé pour la génération jour-par-jour (mode semaine progressive).
 * historyJours = jours déjà générés cette semaine (mémoire complète).
 */
export function buildSingleDayPrompt(
  form: PatientForm,
  calc: CalculationResult,
  locale: Locale,
  jourNom: string,
  autresJours: string[],
  historyJours: DailyMealPlan[] = [],
): string {
  const repasStruct = form.modeRamadan
    ? `"type" parmi : "Ftour", "Collation après Tarawih", "Shour"`
    : `"type" parmi : "Petit-déjeuner", "Collation matin", "Déjeuner", "Collation après-midi", "Dîner"`;

  const couscousNote =
    jourNom.toLowerCase() === "vendredi"
      ? `\n- C'est VENDREDI : couscous au déjeuner (tradition marocaine).`
      : `\n- Ce n'est PAS vendredi : AUCUN couscous.`;

  // Mémoire des jours déjà générés : extraire protéines, féculents, petits-dej déjà utilisés
  let memoireBlock = "";
  if (historyJours.length > 0) {
    const proteinesUsees: string[] = [];
    const petitDejUsees: string[] = [];
    const dinerUsees: string[] = [];

    historyJours.forEach((j) => {
      j.repas.forEach((r) => {
        if (r.type.toLowerCase().includes("déjeuner") && !r.type.toLowerCase().includes("petit")) {
          proteinesUsees.push(`${j.jour}: ${r.nom}`);
        }
        if (r.type.toLowerCase().includes("petit")) {
          petitDejUsees.push(`${j.jour}: ${r.nom}`);
        }
        if (r.type.toLowerCase().includes("dîner") || r.type.toLowerCase().includes("diner")) {
          dinerUsees.push(`${j.jour}: ${r.nom}`);
        }
      });
    });

    const poissonCount = historyJours.filter((j) =>
      j.repas.some((r) => {
        const nom = r.nom.toLowerCase();
        return nom.includes("poisson") || nom.includes("sardine") || nom.includes("maquereau") || nom.includes("merlan") || nom.includes("thon") || nom.includes("saumon");
      })
    ).length;

    const lentillesCount = historyJours.filter((j) =>
      j.repas.some((r) => r.ingredients?.some((i) => i.nom.toLowerCase().includes("lentille")))
    ).length;

    memoireBlock = `

MÉMOIRE DE LA SEMAINE (jours déjà générés — NE PAS RÉPÉTER les mêmes plats) :
${historyJours.map((j) => `• ${j.jour} : ${j.repas.map((r) => `${r.type}=${r.nom}`).join(", ")}`).join("\n")}

Déjeuners déjà utilisés (protéines) : ${proteinesUsees.join(" | ") || "aucun"}
Petits-déjeuners déjà utilisés : ${petitDejUsees.join(" | ") || "aucun"}
Dîners déjà utilisés : ${dinerUsees.join(" | ") || "aucun"}
Poisson utilisé : ${poissonCount}/2 fois cette semaine${poissonCount >= 2 ? " → INTERDIT d'utiliser du poisson ce jour" : " → encore autorisé si le rôle du jour l'indique"}.
Lentilles utilisées : ${lentillesCount}/2 fois cette semaine${lentillesCount >= 2 ? " → INTERDIT d'utiliser des lentilles ce jour" : ""}.

RÈGLE ABSOLUE : le menu de « ${jourNom} » doit être ENTIÈREMENT DIFFÉRENT de tous les jours ci-dessus (aucun plat, aucun petit-déjeuner, aucun dîner identique).`;
  }

  const eviter =
    autresJours.length > 0 && historyJours.length === 0
      ? `\nVARIÉTÉ STRICTE : chaque jour de la semaine doit être TOTALEMENT DIFFÉRENT des autres (${autresJours.join(", ")}). Ne répète AUCUN plat — ni le même petit-déjeuner, ni le même déjeuner, ni le même dîner. Varie les protéines, les féculents, les légumes et les modes de cuisson.`
      : ``;

  // Contraintes du jour (type de protéine + rythme), SANS imposer les plats exacts
  // → laisse à l'IA la liberté de varier réellement à chaque génération.
  const role = autresJours.length > 0 ? dayRole(jourNom) : null;
  const roleGuidance = role
    ? `\n\nCONTRAINTES DE CE JOUR (à respecter, mais COMPOSE librement les plats — varie le style, les recettes, les légumes, les modes de cuisson) :
- Déjeuner : ${role.lunch} (tu peux choisir une recette marocaine différente avec cette protéine).
- Dîner : oriente-toi vers « ${role.dinner} » mais propose un plat DIFFÉRENT et original (jamais le même qu'un autre jour).
- Féculent principal : autour de ${role.starch}, mais libre de varier.
- ${role.pace}`
    : ``;

  // Tirage pseudo-aléatoire pour forcer la diversité d'une génération à l'autre.
  const seed = Math.floor(Math.random() * 100000);
  const shuffled = [...PETIT_DEJ_OPTIONS].sort(() => Math.random() - 0.5);

  // Banque de référence (modèles du médecin) — l'IA s'en inspire et VARIE.
  const banque = `\n\nVARIANTE #${seed} — compose un menu ORIGINAL et différent de toute version précédente.

BANQUE DE RÉFÉRENCE (inspire-toi librement, NE recopie JAMAIS à l'identique, change l'ordre et les combinaisons) :
• Petit-déjeuner (SANS fruit), pioche/adapte une idée parmi (dans le désordre) : ${shuffled.join(" | ")}.
• Déjeuner : assiette de crudités/légumes + 150 g de protéine + petit féculent (50-100 g) + 1 fruit en dessert.
• Dîner, inspire-toi de : ${DINER_OPTIONS.join(" | ")} (TOUJOURS avec une protéine).
• Légumes autorisés (cuits ou crus, à volonté) : ${LEGUMES_AUTORISES.join(", ")}.
• Féculents autorisés (petites portions) : ${FECULENTS_AUTORISES.join(", ")}.
IMPORTANT : pioche et combine différemment à chaque jour et à chaque patient pour que deux programmes ne soient jamais identiques.`;

  return `${listProfile(form, calc, locale)}${buildPatientConstraints(form)}${memoireBlock}

TÂCHE : Génère le menu du jour « ${jourNom} » uniquement (~${calc.caloriesObjectif} kcal), conforme au régime méditerranéen et au référentiel EMC.${couscousNote}${eviter}${roleGuidance}${banque}

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
      "ingredients": [ { "nom": "string", "quantite": "string (ex: 120 g)", "preparation": "string" } ]
    }
  ]
}

Pour CHAQUE ingrédient, indique son mode de préparation dans "preparation" : « cru », « cuit à la vapeur », « grillé », « bouilli », « poêlé à l'huile d'olive », « au four », « en salade (cru) », « mijoté », etc. Exemples : courgette → « cuite à la vapeur », tomate en salade → « crue », poulet → « grillé », œufs → « durs » ou « à la coque », pain → « complet ». Sois précis pour que le patient sache exactement comment préparer chaque aliment.

Macros OBLIGATOIRES : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %.
RÈGLE CALORIQUE ABSOLUE : les calories du DÉJEUNER doivent être SUPÉRIEURES à celles du DÎNER (déjeuner > dîner). Le déjeuner est le repas le plus copieux, le dîner reste plus léger. Vérifie ce point avant de répondre et ajuste les portions si besoin.
OBLIGATOIRE : à chaque déjeuner et dîner, liste explicitement le PAIN COMPLET (ex. « Pain complet : 50 g ») ET une SOURCE DE PROTÉINE avec sa quantité (viande/poisson/volaille/œufs/légumineuses). Le petit-déjeuner doit aussi contenir une protéine.
RAPPELS : le DÉJEUNER est le repas principal et se termine TOUJOURS par 1 fruit frais. ⚠️ L'ŒUF (œuf dur, au plat, omelette, œufs brouillés) ne se met QU'AU PETIT-DÉJEUNER — JAMAIS au déjeuner, JAMAIS au dîner. La protéine du dîner doit être de la volaille, viande ou fromage (pas d'œuf, pas de poisson). PAS de quinoa ni de flocons d'avoine.`;
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

Les "recommandationsGenerales" DOIVENT inclure les aliments interdits/à limiter (style modèle médecin) : aliments transformés ; boissons gazeuses et sodas (même 0 % sucre) ; beurre ; biscuits/viennoiseries/pâtisseries (max 1×/10 jours) ; jus de fruits industriels et naturels (max 1×/semaine) ; pizzas/hamburgers (max 1×/10 jours) ; fritures ; pain blanc (uniquement pain complet) ; grignotage entre les repas. Ajoute aussi : respecter le rythme de 3 repas/jour, eau à volonté, 1 fruit/jour au déjeuner uniquement.

Réponds STRICTEMENT avec ce JSON :
{
  "resumeProfil": "string (3-4 phrases)",
  "risquesPoids": "string",
  "analyseDiabete": "string",
  "analyseNutritionnelle": "string",
  "analyseActivite": "string",
  "recommandationsGenerales": [ "string", "string", "string", "string", "string", "string" ]
}`;
}
