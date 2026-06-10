import type { PatientForm, CalculationResult, Locale, GeneratedProgram, DailyMealPlan, ProteineCategorie } from "@/types";
import {
  compterPoissonReel,
  texteDuRepas,
  indexOptionPetitDej,
  indexOptionDiner,
  familleProteineDejeuner,
  feculentPrincipalDejeuner,
  motsInterditsPatient,
  texteContientInterdit,
  type MotInterditPatient,
} from "@/lib/ai/validation";
import { MOROCCAN_RECIPES } from "@/data/recipes";
import {
  PETIT_DEJ_OPTIONS,
  DINER_OPTIONS,
  LEGUMES_AUTORISES,
  FECULENTS_AUTORISES,
  DEJEUNER_PROTEINES_AUTORISEES,
  BOISSONS_CHAUDES,
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
- Déjeuner : assiette de légumes + 150 g de protéine + UN féculent (pain complet 50 g OU 100 g riz/pâtes/pomme de terre) + 1 fruit. Petit-déjeuner sans fruit. Déjeuner = seul repas avec 1 fruit. Dîner = exclusivement une option de la banque fermée DINER_OPTIONS. Couscous = vendredi midi uniquement. Pas de quinoa ; l'avoine UNIQUEMENT dans l'option petit-déjeuner « belboula d'orge ou avoine ».
- CALORIES : le déjeuner doit TOUJOURS être plus calorique que le dîner (déjeuner > dîner). Si une modification casse cette règle, rééquilibre les portions pour la rétablir.
- ŒUF : au petit-déjeuner, et au dîner UNIQUEMENT via l'option « Soupe de légumes + 2 œufs durs ». JAMAIS d'œuf au déjeuner. Poisson au dîner UNIQUEMENT via l'option « Soupe de poisson + légumes sautés ».
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
  proteineImposee?: string,
  repasVeilleNom?: string,
): string {
  const lang = locale === "ar" ? "arabe (arabe médical professionnel)" : "français";
  const contraintes = buildPatientConstraints(form);
  const repas = jour.repas[mealIndex];
  const autresRepas = jour.repas.filter((_, i) => i !== mealIndex);

  // Allergies/intolérances : les options de banque contenant un aliment
  // interdit sont RETIRÉES de la liste proposée à l'IA. S'il ne reste aucune
  // option (ex. gluten au petit-déjeuner), on garde la banque complète avec
  // consigne d'adaptation (remplacer l'aliment interdit par un équivalent).
  const motsInterdits = motsInterditsPatient(form);
  const filtrerBanque = (options: readonly string[]): { liste: string[]; note: string } => {
    if (motsInterdits.length === 0) return { liste: [...options], note: "" };
    const compatibles = options.filter((o) => !texteContientInterdit(o, motsInterdits));
    if (compatibles.length === options.length) return { liste: [...options], note: "" };
    if (compatibles.length > 0) {
      return {
        liste: compatibles,
        note: "\n⚠️ Les options contenant un aliment INTERDIT pour ce patient (allergie/intolérance) ont déjà été retirées de cette liste : choisis UNIQUEMENT parmi les options ci-dessus.",
      };
    }
    return {
      liste: [...options],
      note: "\n⚠️ Ce patient a des aliments INTERDITS (voir contraintes ci-dessus) présents dans toutes les options : ADAPTE l'option choisie en REMPLAÇANT chaque aliment interdit par un équivalent compatible (ex. pain complet → pain sans gluten).",
    };
  };

  // Règles spécifiques selon le type de repas.
  const type = repas.type.toLowerCase();
  let regleRepas = "";
  if (type.includes("petit")) {
    const banquePD = filtrerBanque(PETIT_DEJ_OPTIONS);
    regleRepas = `C'est un PETIT-DÉJEUNER : DOIT être EXACTEMENT l'une de ces options de la banque fermée PETIT_DEJ_OPTIONS (+ boisson chaude sans sucre : ${BOISSONS_CHAUDES.join(", ")}) :\n${banquePD.liste.map((o, i) => `${i + 1}. ${o}`).join("\n")}${banquePD.note}\nAUCUN fruit, AUCUNE compote, AUCUN dessert, AUCUN yaourt ni laitage. Pas de quinoa.`;
  } else if (type.includes("déjeuner") || type.includes("dejeuner")) {
    const diner = jour.repas.find((r) => {
      const tt = r.type.toLowerCase();
      return tt.includes("dîner") || tt.includes("diner");
    });
    const plancher = diner ? ` Les calories du déjeuner doivent rester SUPÉRIEURES à celles du dîner (${diner.calories} kcal) — le déjeuner est le repas le plus copieux.` : "";
    regleRepas = `C'est le DÉJEUNER (repas principal) : assiette de légumes cuits ou crus + 150 g de protéine (viande/poisson/volaille) + UN SEUL féculent au choix : un petit morceau de pain complet 50 g OU 100 g de riz/pâtes/pomme de terre (JAMAIS de boulgour, JAMAIS de couscous sauf si vendredi) + 1 fruit en dessert. PAS de produit laitier. Le déjeuner est le SEUL repas avec un fruit.${plancher}`;
  } else if (type.includes("dîner") || type.includes("diner")) {
    const dej = jour.repas.find((r) => {
      const tt = r.type.toLowerCase();
      return (tt.includes("déjeuner") || tt.includes("dejeuner")) && !tt.includes("petit");
    });
    const plafond = dej ? ` Les calories du dîner doivent rester INFÉRIEURES à celles du déjeuner (${dej.calories} kcal) — le dîner est plus léger que le déjeuner.` : "";
    const banqueDiner = filtrerBanque(DINER_OPTIONS);
    regleRepas = `C'est le DÎNER : DOIT être EXACTEMENT l'une de ces options (RIEN d'autre — pas de pain, pas de fromage, pas de yaourt) :\n${banqueDiner.liste.map((o, i) => `${i + 1}. ${o}`).join("\n")}${banqueDiner.note}\nL'œuf au dîner UNIQUEMENT via l'option « Soupe de légumes + 2 œufs durs » ; le poisson au dîner UNIQUEMENT via l'option « Soupe de poisson + légumes sautés ». Pas de fruit.${plafond}`;
  }

  const couscousNote =
    jour.jour.toLowerCase() === "vendredi" && (type.includes("déjeuner") || type.includes("dejeuner"))
      ? "C'est le déjeuner du vendredi : le couscous est autorisé."
      : "Pas de couscous (réservé au déjeuner du vendredi).";

  const proteineNote = proteineImposee
    ? `\nPROTÉINE IMPOSÉE (OBLIGATOIRE, AUCUNE EXCEPTION) : ${proteineImposee}.`
    : "";

  const veilleNote = repasVeilleNom
    ? `\nANTI-RÉPÉTITION (OBLIGATOIRE) : la VEILLE, ce repas était « ${repasVeilleNom} ». INTERDIT de reproduire la même option/composition — choisis une option DIFFÉRENTE de la banque.`
    : "";

  return `LANGUE DE RÉPONSE : ${lang}.${contraintes}

Jour « ${jour.jour} » — tu dois RÉGÉNÉRER UNIQUEMENT le repas « ${repas.type} » (~${repas.calories} kcal).

REPAS ACTUEL (à remplacer par une alternative DIFFÉRENTE) :
${JSON.stringify(repas)}

AUTRES REPAS DU JOUR (NE PAS répéter leurs plats/protéines) :
${JSON.stringify(autresRepas)}

${regleRepas}
${couscousNote}${proteineNote}${veilleNote}
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
- Produits laitiers : AUCUN dans les menus de ce programme (le modèle du médecin n'en contient pas — ne mets ni yaourt ni fromage dans les repas).
- Herbes et épices plutôt que le sel.
Tu adaptes ensuite ce socle méditerranéen aux spécificités du patient (calories cible, pathologies, diabète, préférences) et tu l'exprimes à travers la cuisine marocaine saine qui partage les mêmes principes.

Tu dois aussi IMPÉRATIVEMENT t'appuyer sur le référentiel médical de référence (EMC 10-460-A-10, « Prescription d'un régime alimentaire », J.-L. Schlienger). Respecte strictement les règles suivantes issues de ce référentiel :

== RÉPARTITION DES MACRONUTRIMENTS (Tableau 3) — RÈGLE LA PLUS IMPORTANTE, NON NÉGOCIABLE ==
La répartition énergétique de CHAQUE jour DOIT IMPÉRATIVEMENT respecter ces fourchettes (vérifie le calcul P×4, G×4, L×9 kcal avant de répondre) :
- Protéines : 11 à 15 % de la ration énergétique.
- Glucides : 50 à 55 % (privilégier les glucides complexes à index glycémique bas).
- Lipides : 35 à 40 % (privilégier huiles végétales olive/colza, AG mono-insaturés ; limiter AG saturés).
C'est l'exigence prioritaire : ajuste les quantités (féculents, huile, protéines) pour que chaque jour tombe EXACTEMENT dans ces bornes. Un jour hors de ces fourchettes est une erreur à corriger.

== STYLE DE FORMULATION DES PLATS — PRIORITÉ ÉLEVÉE, NON NÉGOCIABLE ==
Formule chaque plat de façon SIMPLE et DIRECTE, comme une ORDONNANCE NUTRITIONNELLE marocaine, JAMAIS comme une carte de restaurant.
- Utilise des noms d'aliments courants avec leur quantité, jamais des noms de recettes sophistiqués.
- Exemples de formulation OBLIGATOIRE :
  • Petit-déjeuner : « 1 œuf au plat + pain complet + huile d'olive » / « ¼ avocat + pain complet » / « belboula d'orge + pain complet »
  • Déjeuner : « Salade de crudités + 150 g de poulet + riz complet + 1 fruit »
  • Dîner : « Soupe de légumes + 150 g de poulet » / « Légumes au four + 150 g de dinde » / « Légumes sautés + 150 g de viande maigre »
- ÉVITE STRICTEMENT les noms de plats élaborés ou les recettes à étapes multiples (ex. évite « tajine mijoté aux épices », « velouté onctueux », « chorba traditionnelle »). Préfère « légumes au four », « légumes sautés », « soupe de légumes ».
- Le champ "nom" de chaque repas doit rester COURT et descriptif (ex. « Salade + poulet grillé + riz complet »), jamais un titre de recette de chef.

== STRUCTURE OBLIGATOIRE DU PETIT-DÉJEUNER ==
Le petit-déjeuner DOIT être EXACTEMENT L'UNE des 4 OPTIONS SUIVANTES (choisis-en une, varie d'un jour à l'autre, AUCUNE autre composition n'est autorisée) :
${PETIT_DEJ_OPTIONS.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Plus, chaque jour, une boisson chaude sans sucre (${BOISSONS_CHAUDES.join(", ")}).
Reformule l'option choisie en ingrédients chiffrés (ex. « Concombre 50 g, Tomate 50 g, Laitue 30 g, Œuf au plat 1, Pain complet 50 g, Huile d'olive 5 g, Thé sans sucre »), mais NE CHANGE PAS la composition de l'option (toujours l'assiette de légumes concombre/tomate/laitue, sauf pour l'option belboula).

ALIMENTS AUTORISÉS au petit-déjeuner UNIQUEMENT : œufs, avocat, pain complet, belboula d'orge ou avoine, légumes (concombre, tomate, laitue), huile d'olive, thé, café, infusion.

RÈGLE ABSOLUE — INTERDIT au petit-déjeuner (AUCUNE EXCEPTION) :
- AUCUN fruit, sous quelque forme que ce soit (frais, séché, en jus, en compote).
- AUCUNE compote, salade de fruits, ou dessert.
- AUCUN yaourt aux fruits, ni laitage sucré (yaourt sucré, yaourt aromatisé, crème dessert, etc.).
Les fruits et desserts sont réservés EXCLUSIVEMENT au DÉJEUNER (1 portion en fin de repas).
Objectif : repas rassasiant et équilibré, sans aucune trace de fruit ou de sucre ajouté.

== STRUCTURE OBLIGATOIRE DU DÉJEUNER (Tableau 8) ==
RÈGLE ABSOLUE : le DÉJEUNER de CHAQUE jour DOIT contenir une source de protéine animale clairement identifiée et chiffrée. ⚠️ L'ŒUF EST INTERDIT AU DÉJEUNER : l'œuf/l'omelette ne se met QU'AU PETIT-DÉJEUNER.
Le déjeuner DOIT contenir TOUS ces éléments, CHAQUE jour (aucun omis) :
1. Assiette de légumes cuits ou crus, à volonté, UNIQUEMENT parmi la liste autorisée du document de référence : ${LEGUMES_AUTORISES.join(", ")}. AUCUN autre légume (pas de petits pois, pas de maïs, pas de potiron, pas de patate douce).
2. Source protéique OBLIGATOIRE, 150 g, clairement listée dans les ingrédients avec sa quantité, parmi : ${DEJEUNER_PROTEINES_AUTORISEES.join(", ")}. PAS d'œuf au déjeuner (l'œuf est réservé au petit-déjeuner).
3. UN SEUL féculent, OBLIGATOIRE, au choix : un petit morceau de pain complet (50 g ou 2 toasts) OU 100 g de riz/pâtes/pomme de terre. JAMAIS de boulgour. JAMAIS les deux en même temps (pas de pain + riz). Liste-le explicitement avec sa quantité (ex. « Pain complet : 50 g » ou « Riz : 100 g »).
4. 1 fruit en dessert (cf. règle ci-dessous).
5. Huile d'olive : UNE SEULE ligne « Huile d'olive » avec UNE SEULE quantité totale (ex. « Huile d'olive : 10 g »), qui couvre à la fois la cuisson ET l'assaisonnement. INTERDIT d'ajouter une 2e ligne d'huile (huile de colza, ou une 2e ligne « Huile d'olive » séparée). Sel limité.
PAS de produit laitier au déjeuner (ni yaourt, ni fromage) — le modèle du médecin n'en contient pas.

== STRUCTURE OBLIGATOIRE DU DÎNER — BANQUE FERMÉE (DINER_OPTIONS) ==
Le dîner DOIT être EXACTEMENT L'UNE des 7 OPTIONS SUIVANTES (choisis-en une, varie d'un jour à l'autre, AUCUNE autre composition n'est autorisée) :
${DINER_OPTIONS.map((o, i) => `${i + 1}. ${o}`).join("\n")}
Reformule l'option choisie en ingrédients chiffrés (ex. « Soupe de légumes 300 g, Blanc de poulet 150 g »), mais N'AJOUTE RIEN D'AUTRE : PAS de pain, PAS de fromage, PAS de yaourt, PAS de produit laitier, PAS de féculent supplémentaire, PAS d'huile listée séparément. Le dîner se limite STRICTEMENT aux deux composants de l'option choisie. L'ŒUF au dîner n'existe QUE via l'option « Soupe de légumes + 2 œufs durs » (jamais d'omelette ni d'œuf au plat au dîner) ; le POISSON au dîner n'existe QUE via l'option « Soupe de poisson + légumes sautés ». AUCUN fruit, AUCUN dessert au dîner.

== RÈGLES SPÉCIFIQUES SUPPLÉMENTAIRES ==
- DÉJEUNER = repas PRINCIPAL de la journée (le plus complet et copieux). RÈGLE ABSOLUE : le déjeuner DOIT contenir EXACTEMENT 1 portion de fruit en dessert (ni 0, ni 2). C'est le SEUL repas de la journée qui contient un fruit ou un dessert.
- DÎNER : RÈGLE ABSOLUE — AUCUN fruit, AUCUNE compote, AUCUN dessert, AUCUN laitage sucré. Le dîner se termine sur la protéine + légumes/féculent, sans rien de sucré après.
- PETIT-DÉJEUNER : RÈGLE ABSOLUE — AUCUN fruit, AUCUNE compote, AUCUN dessert, AUCUN yaourt aux fruits ni laitage sucré (cf. section dédiée ci-dessus).
- RÈGLE CALORIQUE ABSOLUE ET NON NÉGOCIABLE : les calories du DÉJEUNER doivent TOUJOURS être SUPÉRIEURES à celles du DÎNER (déjeuner > dîner), CHAQUE jour, sans exception. Le déjeuner est le repas le plus calorique de la journée, le dîner reste plus léger. Avant de répondre, vérifie pour chaque jour que calories(déjeuner) > calories(dîner) ; si ce n'est pas le cas, ajuste les portions pour que le déjeuner repasse au-dessus du dîner.
- POISSON (l7out) : EXACTEMENT 2 DÉJEUNERS/semaine. JAMAIS de poisson au petit-déjeuner. Au dîner, le poisson n'apparaît QUE via l'option « Soupe de poisson + légumes sautés » de la banque DINER_OPTIONS (elle ne compte PAS dans le quota des 2 déjeuners poisson).
- LENTILLES (l3dess) : 1 à 2 fois/semaine MAXIMUM, et UNIQUEMENT en ACCOMPAGNEMENT (jamais comme plat principal). Le plat principal protéique doit être une viande/volaille/poisson/œufs, pas les lentilles.
- Les autres repas alternent des protéines variées et riches : poulet, dinde, escalope de poulet, viande maigre, œufs, thon. Programme RICHE EN PROTÉINES toute la semaine.
- ŒUFS : au PETIT-DÉJEUNER (selon l'option PETIT_DEJ_OPTIONS choisie), et au DÎNER UNIQUEMENT via l'option « Soupe de légumes + 2 œufs durs » de la banque. RÈGLE STRICTE : JAMAIS d'œuf au DÉJEUNER, et JAMAIS d'omelette/œuf au plat/œufs brouillés au dîner (au dîner, seuls les œufs DURS de l'option dédiée sont autorisés).
- Ne JAMAIS utiliser de quinoa. L'avoine est autorisée UNIQUEMENT dans l'option petit-déjeuner « belboula d'orge ou avoine » (jamais au déjeuner ni au dîner).

RÈGLE D'AFFICHAGE : pour CHAQUE repas, la source de protéine et le féculent DOIVENT apparaître explicitement dans la liste des ingrédients avec leur quantité en grammes. Le petit-déjeuner suit STRICTEMENT l'option PETIT_DEJ_OPTIONS choisie (œuf/avocat/belboula + pain complet 50 g), SANS fruit ni dessert ni laitage. N'utilise JAMAIS de quinoa.

== REPÈRES PNNS (Tableau 6) ==
- Fruits et légumes : au moins 5 portions/jour.
- Pains, céréales, féculents : privilégier les complets.
- Produits laitiers : NE PAS en ajouter aux repas — le modèle du médecin n'en contient aucun (pas de yaourt, pas de fromage dans les menus).
- Viandes/volailles/poisson/œuf : 1 à 2 fois/jour en quantité inférieure à l'accompagnement ; poisson au moins 2 fois/semaine.
- Matières grasses ajoutées, produits sucrés, sel : à limiter. Eau : à volonté.

== ÉQUIVALENCES PORTIONS (Tableau 7, repère de la main) ==
- Produits laitiers : lait (1 bol) / yaourt (2 pots) / fromage (30 g) ≈ 120 kcal.
- Viande et équivalents : viande (125 g) / poisson (150 g) / jambon (2 tr.) / 2 œufs ≈ 180 kcal.
- Féculents : pain (50 g) / biscottes (4) / riz-pâtes (1 assiette) / pomme de terre (1 portion) ≈ 120 kcal.

== ORGANISATION HEBDOMADAIRE (programme sur une semaine) ==
PROTÉINES :
- Poisson : EXACTEMENT 2 fois/semaine (ni 0, ni 1, ni 3+), gras (sardines/maquereau) ou blanc, UNIQUEMENT au DÉJEUNER — JAMAIS au petit-déjeuner ni au dîner.
- Viande rouge : 2 repas/semaine MAX, de préférence au DÉJEUNER, à éviter au dîner.
- Les autres jours : privilégier volaille (poulet, dinde), œufs, légumineuses, thon — la MAJORITÉ des repas protéiques.
- Alterner les protéines : jamais le même type deux jours de suite.

DÎNERS :
- Soupes ≈ 2 fois/semaine au dîner (soupe de légumes, harira légère), toujours accompagnées d'une protéine.

ANTI-RÉPÉTITION (RÈGLE ABSOLUE) :
- AUCUN petit-déjeuner identique à celui de la VEILLE (change d'option de la banque chaque jour).
- AUCUN déjeuner identique à celui de la VEILLE (change la protéine et/ou le féculent).
- AUCUN dîner identique à celui de la VEILLE (change d'option de la banque chaque jour).
- Exemple INTERDIT : lundi « légumes + œuf + pain complet » puis mardi « légumes + œuf + pain complet » → REFUSÉ, choisis automatiquement une autre option.

RYTHME PROFESSIONNEL :
- TOUS LES JOURS de la semaine (y compris week-end) : menus SIMPLES et RAPIDES, format constant — salade/légumes + protéine (150 g) + petit féculent + pain complet (+ fruit au déjeuner). Pas de plats à cuisson prolongée ni de recettes à étapes multiples.
- Le programme doit ressembler à une ordonnance nutritionnelle (liste d'aliments et de portions), pas à une carte de restaurant.

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
✓ AUCUN produit laitier ajouté aux repas (pas de yaourt, pas de fromage)
✓ Poisson EXACTEMENT 2 DÉJEUNERS/semaine (ni 0, ni 1, ni 3+)
✓ Petit-déjeuner = EXACTEMENT une option de PETIT_DEJ_OPTIONS (SANS fruit ni dessert)
✓ Déjeuner complet : légumes + protéine 150 g + UN SEUL féculent (pain complet 50 g OU 100 g riz/pâtes/pomme de terre, JAMAIS boulgour, jamais les deux) + 1 fruit
✓ Dîner complet (les éléments de l'option DINER_OPTIONS choisie, rien d'autre)
✓ Calories de chaque repas cohérentes avec les quantités
✓ Calories du DÉJEUNER strictement SUPÉRIEURES à celles du DÎNER (déjeuner > dîner) CHAQUE jour
✓ AUCUN œuf au déjeuner ; œuf au dîner UNIQUEMENT via l'option « 2 œufs durs » ; poisson au dîner UNIQUEMENT via l'option « Soupe de poisson »
✓ AUCUN fruit au petit-déjeuner
✓ AUCUN dessert au petit-déjeuner (compote, salade de fruits, yaourt aux fruits, laitage sucré)
✓ AUCUN fruit au dîner
✓ AUCUN dessert au dîner
✓ EXACTEMENT 1 portion de fruit au déjeuner (ni 0, ni 2)
✓ Macros cohérentes (P 11-15 %, G 50-55 %, L 35-40 %)
✓ Formulation simple type ordonnance (pas de noms de recettes élaborés, pas d'effet "restaurant")
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
    : `"type" parmi : "Petit-déjeuner", "Déjeuner", "Dîner" (EXACTEMENT 3 repas/jour, AUCUNE collation)`;

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
- Déjeuner : doit suivre la structure EXACTE du modèle : assiette de légumes cuits ou crus + 150 g de protéine (viande/poisson/volaille) + UN SEUL féculent au choix (petit morceau de pain complet 50 g OU 100 g de riz/pâtes/pomme de terre — JAMAIS de boulgour, jamais les deux) + 1 fruit en dessert. PAS de produit laitier.
- Dîner : EXCLUSIVEMENT l'une des 7 options de la banque DINER_OPTIONS (RIEN d'autre — pas de pain, pas de produit laitier).
- ⚠️ ŒUF : au PETIT-DÉJEUNER (selon l'option choisie) et au DÎNER UNIQUEMENT via l'option « Soupe de légumes + 2 œufs durs ». JAMAIS d'œuf au déjeuner. Poisson au dîner UNIQUEMENT via l'option « Soupe de poisson + légumes sautés ».
- OBLIGATOIRE pour CHAQUE déjeuner : lister explicitement dans les ingrédients le FÉCULENT choisi avec sa quantité (ex. « Pain complet : 50 g » ou « Riz : 100 g ») ET une SOURCE DE PROTÉINE 150 g avec quantité. Ne les oublie jamais.
- Au moins 5 portions de fruits/légumes sur la journée, féculents complets, poisson EXACTEMENT 2 déjeuners dans la semaine. AUCUN produit laitier dans les repas.
- Huile d'olive : UNE SEULE ligne « Huile d'olive » par repas avec UNE SEULE quantité totale (cuisson + assaisonnement réunis). JAMAIS deux lignes d'huile (pas de 2e ligne huile de colza). Sel limité, eau à volonté, sucres simples limités.${form.objectif === "perte_poids" ? "\n- Profil en perte de poids : régime hypocalorique MODÉRÉ (~700 kcal/repas femme, ~830 kcal/repas homme), jamais agressif." : ""}${duration > 1 ? `\n- VARIÉTÉ OBLIGATOIRE : ne répète pas les mêmes plats d'un jour à l'autre ; alterne poisson, légumineuses, volaille et varie les légumes et féculents sur les ${duration} jours.\n- ANTI-RÉPÉTITION ABSOLUE : deux jours CONSÉCUTIFS ne doivent JAMAIS avoir le même petit-déjeuner, le même déjeuner ou le même dîner. Change d'option de banque chaque jour (ex. si lundi = œuf au petit-déjeuner, mardi = avocat ou belboula ; si lundi = soupe + poulet au dîner, mardi = une autre option).` : ""}

BANQUE DE RÉFÉRENCE (inspire-toi de ces modèles, MAIS VARIE — deux patients ne doivent jamais avoir le même programme) :
• Petit-déjeuner (SANS fruit) : ${PETIT_DEJ_OPTIONS.slice(0, 4).join(" | ")}.
• Déjeuner : assiette de légumes + 150 g de protéine (${DEJEUNER_PROTEINES_AUTORISEES.join(", ")}) + UN féculent au choix (${FECULENTS_AUTORISES.join(", ")}) + 1 fruit en dessert.
• Dîner (banque fermée, une option par jour) : ${DINER_OPTIONS.join(" | ")}.
• Légumes autorisés : ${LEGUMES_AUTORISES.join(", ")}.

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

const JOURS_SEMAINE = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"];

/** Jours où le déjeuner peut être du poisson (vendredi = couscous fixe, exclu). */
const JOURS_NON_VENDREDI = ["lundi", "mardi", "mercredi", "jeudi", "samedi", "dimanche"];

/** Catégorie de la protéine du déjeuner d'un jour déjà généré (fallback "autre" si absent). */
export function categorieDejeuner(jour: DailyMealPlan): ProteineCategorie {
  const dejeuner = jour.repas.find(
    (r) => r.type.toLowerCase().includes("déjeuner") && !r.type.toLowerCase().includes("petit"),
  );
  return dejeuner?.categorieProteine ?? "autre";
}

/**
 * Contraintes d'un jour. La PROTÉINE du déjeuner est choisie SERVEUR-SIDE dans un
 * POOL autorisé, filtré par les quotas hebdomadaires déjà consommés (déduits du
 * contenu RÉEL des déjeuners déjà générés via `compterPoissonReel`) :
 * poisson EXACTEMENT 2/sem (jamais 0, jamais 1, jamais 3+ — forcé en fin de
 * semaine si nécessaire, interdit une fois le quota atteint), viande rouge
 * ≤2/sem, vendredi = couscous fixe (règle absolue). `lunchCategorie` permet à
 * l'appelant (route.ts) de tague le repas généré sans dépendre de l'IA.
 * Le reste (dîner, féculent, petit-déj) est tiré ALÉATOIREMENT à chaque
 * génération → deux semaines/patients ne se ressemblent jamais.
 *
 * `motsInterdits` (allergies/intolérances du patient) : toute option de banque
 * fermée contenant un aliment interdit est EXCLUE des tirages — un patient
 * allergique aux fruits de mer ne peut jamais se voir IMPOSER l'option
 * « Légumes au four + fruits de mer ».
 */
export function dayRole(jourNom: string, historyJours: DailyMealPlan[] = [], motsInterdits: MotInterditPatient[] = []): {
  lunch: string;
  lunchCategorie: ProteineCategorie;
  dinner: string;
  breakfast: string;
  starch: string;
  pace: string;
} {
  const j = jourNom.toLowerCase();

  // ---- ANTI-RÉPÉTITION : repas de la VEILLE (dernier jour généré) ---------
  // Aucun petit-déjeuner / déjeuner / dîner ne peut être identique à celui de
  // la veille → les options utilisées hier sont EXCLUES des tirages du jour.
  const veille = historyJours.length > 0 ? historyJours[historyJours.length - 1] : null;
  const texteRepasVeille = (pred: (t: string) => boolean): string => {
    const r = veille?.repas.find((x) => pred(x.type.toLowerCase()));
    return r ? texteDuRepas(r) : "";
  };
  const pdVeille = texteRepasVeille((t) => t.includes("petit"));
  const dejVeille = texteRepasVeille((t) => (t.includes("déjeuner") || t.includes("dejeuner")) && !t.includes("petit"));
  const dinerVeille = texteRepasVeille((t) => t.includes("dîner") || t.includes("diner"));

  // Une option de banque/protéine est utilisable si elle ne contient AUCUN
  // aliment interdit pour ce patient (allergie/intolérance).
  const sansInterdit = (texte: string): boolean => !texteContientInterdit(texte, motsInterdits);

  let lunchProteine: string;
  let lunchCategorie: ProteineCategorie;

  // Vendredi = couscous fixe (règle absolue)... SAUF si le couscous/la semoule
  // est interdit pour ce patient (ex. intolérance au gluten) → jour normal.
  const couscousAutorise = sansInterdit("couscous (semoule de blé)");

  if (j === "vendredi" && couscousAutorise) {
    lunchProteine = "couscous marocain (vendredi)";
    lunchCategorie = "couscous";
  } else {
    const categories = historyJours.map(categorieDejeuner);
    const viandeRougeUtilisee = categories.filter((c) => c === "viande_rouge").length;

    // Quota poisson EXACT (2/semaine, ni plus ni moins) calculé sur le contenu
    // RÉEL des déjeuners déjà générés (pas seulement categorieProteine, qui
    // peut diverger si l'IA ajoute du poisson hors plan — cf. validation.ts).
    const poissonUtilise = compterPoissonReel(historyJours);
    const POISSON_OBJECTIF = 2;
    const manquant = POISSON_OBJECTIF - poissonUtilise;

    const positionAujourdhui = JOURS_NON_VENDREDI.indexOf(j); // 0..5 (vendredi exclu)
    const restantsApresAujourdhui = JOURS_NON_VENDREDI.length - 1 - positionAujourdhui;

    // Pool de protéines autorisées pour le déjeuner, filtré par quotas restants
    // ET par les aliments interdits du patient (un allergique au poisson ne se
    // verra jamais imposer le quota poisson).
    let pool: { label: string; categorie: ProteineCategorie }[] = [
      { label: "volaille (poulet, grillé ou au four)", categorie: "volaille" },
      { label: "volaille (dinde ou escalope de dinde, grillée)", categorie: "volaille" },
      { label: "escalope de poulet grillée", categorie: "volaille" },
    ];
    if (manquant > 0) {
      pool.push({ label: "poisson (sardines, maquereau, thon, merlan, saumon ou cabillaud)", categorie: "poisson" });
    }
    if (viandeRougeUtilisee < 2) {
      pool.push({ label: "viande rouge maigre (steak, viande hachée ou brochettes)", categorie: "viande_rouge" });
    }
    const poolCompatible = pool.filter((p) => sansInterdit(p.label));
    if (poolCompatible.length > 0) pool = poolCompatible;

    // Anti-répétition : la famille de protéine utilisée la VEILLE au déjeuner
    // est exclue du tirage du jour (sauf poisson FORCÉ par le quota, qui prime).
    const familleVeille = dejVeille ? familleProteineDejeuner(dejVeille) : null;
    const sansFamilleVeille = (arr: typeof pool): typeof pool => {
      if (!familleVeille) return arr;
      const filtre = arr.filter((p) => {
        if (familleVeille === "poulet") return !p.label.includes("poulet");
        if (familleVeille === "dinde") return !p.label.includes("dinde");
        if (familleVeille === "poisson") return p.categorie !== "poisson";
        if (familleVeille === "viande_rouge") return p.categorie !== "viande_rouge";
        return true;
      });
      return filtre.length > 0 ? filtre : arr;
    };

    const poissonDispo = pool.find((p) => p.categorie === "poisson");
    // Poisson FORCÉ : s'il manque autant (ou plus) de poisson que de jours
    // restants, aujourd'hui DOIT être un repas poisson pour garantir EXACTEMENT
    // 2/semaine (le quota prime sur l'anti-répétition ; le prompt impose alors
    // un poisson/une préparation différents de la veille).
    if (manquant > 0 && manquant >= restantsApresAujourdhui + 1 && poissonDispo) {
      lunchProteine = `${poissonDispo.label} — OBLIGATOIRE aujourd'hui pour atteindre EXACTEMENT 2 repas poisson cette semaine${familleVeille === "poisson" ? " (choisis un poisson et une préparation DIFFÉRENTS de la veille)" : ""}`;
      lunchCategorie = "poisson";
    } else if (manquant <= 0) {
      // Quota déjà atteint : poisson INTERDIT le reste de la semaine.
      const choix = pick(sansFamilleVeille(pool.filter((p) => p.categorie !== "poisson")));
      lunchProteine = choix.label;
      lunchCategorie = choix.categorie;
    } else {
      const choix = pick(sansFamilleVeille(pool));
      lunchProteine = choix.label;
      lunchCategorie = choix.categorie;
    }
  }

  // Petit-déjeuner : tiré parmi les 4 options de référence (sans fruit), en
  // EXCLUANT l'option utilisée la veille (jamais deux jours de suite identiques)
  // et toute option contenant un aliment interdit pour ce patient.
  const pdVeilleIdx = pdVeille ? indexOptionPetitDej(pdVeille) : -1;
  let breakfastPool = PETIT_DEJ_OPTIONS.filter((o, i) => i !== pdVeilleIdx && sansInterdit(o));
  if (breakfastPool.length === 0) breakfastPool = PETIT_DEJ_OPTIONS.filter((o) => sansInterdit(o));
  // Cas extrême (ex. gluten : toutes les options mentionnent le pain complet) :
  // on garde la rotation normale, le prompt + le garde-fou bloquant imposeront
  // la version adaptée (pain sans gluten).
  if (breakfastPool.length === 0) breakfastPool = PETIT_DEJ_OPTIONS.filter((_, i) => i !== pdVeilleIdx);
  const breakfast = pick(breakfastPool);

  // Dîner : tiré parmi les 7 options FERMÉES du modèle du médecin (œuf
  // uniquement via « 2 œufs durs », poisson uniquement via « soupe de
  // poisson »), en EXCLUANT l'option utilisée la veille et toute option
  // contenant un aliment interdit (allergie fruits de mer → jamais l'option 3).
  const dinerVeilleIdx = dinerVeille ? indexOptionDiner(dinerVeille) : -1;
  let dinnerPool = DINER_OPTIONS.filter((o, i) => i !== dinerVeilleIdx && sansInterdit(o));
  if (dinnerPool.length === 0) dinnerPool = DINER_OPTIONS.filter((o) => sansInterdit(o));
  if (dinnerPool.length === 0) dinnerPool = DINER_OPTIONS.filter((_, i) => i !== dinerVeilleIdx);
  const dinner = pick(dinnerPool);

  // Féculent du déjeuner : UN SEUL (pain complet 50 g OU 100 g riz/pâtes/
  // pomme de terre), en EXCLUANT le type de féculent utilisé la veille et les
  // féculents interdits (gluten → ni pain ni pâtes, reste riz/pomme de terre).
  // Vendredi : la semoule du couscous EST le féculent du jour (si autorisée).
  const fecVeille = dejVeille ? feculentPrincipalDejeuner(dejVeille) : null;
  const feculentsCompatibles = FECULENTS_AUTORISES.filter((s) => sansInterdit(s));
  const baseFeculents = feculentsCompatibles.length > 0 ? feculentsCompatibles : FECULENTS_AUTORISES;
  const starchPool = fecVeille && fecVeille !== "semoule"
    ? baseFeculents.filter((s) => !s.toLowerCase().includes(fecVeille))
    : baseFeculents;
  const starch = j === "vendredi" && couscousAutorise
    ? "AUCUN féculent supplémentaire : la semoule du couscous est le féculent du vendredi (pas de pain, pas de riz en plus)"
    : pick(starchPool.length > 0 ? starchPool : baseFeculents);

  const role = {
    breakfast: `${breakfast} (sans fruit)`,
    lunch: `${lunchProteine} + 1 fruit en dessert`,
    lunchCategorie,
    dinner,
    starch,
  };
  const weekend = j === "samedi" || j === "dimanche";
  const pace = weekend
    ? "C'est le WEEK-END : garde la même formule simple (salade + protéine + féculent + fruit)."
    : "C'est un jour de SEMAINE (travail) : le déjeuner doit être RAPIDE et simple (salade + protéine + féculent + fruit).";
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
  role: ReturnType<typeof dayRole> | null = null,
): string {
  const repasStruct = form.modeRamadan
    ? `"type" parmi : "Ftour", "Collation après Tarawih", "Shour"`
    : `"type" parmi : "Petit-déjeuner", "Déjeuner", "Dîner" (EXACTEMENT 3 repas/jour, AUCUNE collation)`;

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

    const poissonCount = compterPoissonReel(historyJours);
    const viandeRougeCount = historyJours.filter((j) => categorieDejeuner(j) === "viande_rouge").length;

    const lentillesCount = historyJours.filter((j) =>
      j.repas.some((r) => r.ingredients?.some((i) => i.nom.toLowerCase().includes("lentille")))
    ).length;

    memoireBlock = `

MÉMOIRE DE LA SEMAINE (jours déjà générés — NE PAS RÉPÉTER les mêmes plats) :
Déjeuners déjà utilisés (protéines) : ${proteinesUsees.join(" | ") || "aucun"}
Petits-déjeuners déjà utilisés : ${petitDejUsees.join(" | ") || "aucun"}
Dîners déjà utilisés : ${dinerUsees.join(" | ") || "aucun"}
Poisson utilisé : ${poissonCount}/2 fois cette semaine (objectif EXACT : 2, ni plus ni moins)${poissonCount >= 2 ? " → INTERDIT d'utiliser du poisson ce jour" : " → encore autorisé/obligatoire si le rôle du jour l'indique"}.
Viande rouge utilisée : ${viandeRougeCount}/2 fois cette semaine.
Lentilles utilisées : ${lentillesCount}/2 fois cette semaine${lentillesCount >= 2 ? " → INTERDIT d'utiliser des lentilles ce jour" : ""}.

RÈGLE ABSOLUE : le menu de « ${jourNom} » doit être ENTIÈREMENT DIFFÉRENT de tous les jours ci-dessus (aucun plat, aucun petit-déjeuner, aucun dîner identique). EN PARTICULIER, aucun repas ne doit être identique à celui de la VEILLE (dernier jour listé) — toute répétition sera REFUSÉE et régénérée.`;
  }

  const eviter =
    autresJours.length > 0 && historyJours.length === 0
      ? `\nVARIÉTÉ STRICTE : chaque jour de la semaine doit être TOTALEMENT DIFFÉRENT des autres (${autresJours.join(", ")}). Ne répète AUCUN plat — ni le même petit-déjeuner, ni le même déjeuner, ni le même dîner. Varie les protéines, les féculents, les légumes et les modes de cuisson.`
      : ``;

  // Contraintes du jour (type de protéine + rythme), SANS imposer les plats exacts
  // → laisse à l'IA la liberté de varier réellement à chaque génération.
  // `role` est calculé UNE SEULE FOIS par l'appelant (route.ts) et réutilisé
  // pour le stamping de categorieProteine → cohérence garantie.
  const roleGuidance = role
    ? `\n\nCONTRAINTES DE CE JOUR (à respecter, mais COMPOSE librement les plats — varie le style, les recettes, les légumes, les modes de cuisson) :
- Petit-déjeuner : DOIT être EXACTEMENT « ${role.breakfast} » (cette option de la banque PETIT_DEJ_OPTIONS imposée pour aujourd'hui), reformulée en ingrédients chiffrés. NE CHANGE PAS la composition de cette option.
- Déjeuner : ${role.lunch} (tu peux choisir une recette marocaine différente avec cette protéine).
- Dîner : DOIT être EXACTEMENT « ${role.dinner} » (cette option de la banque DINER_OPTIONS imposée), reformulée en ingrédients chiffrés (ex. « Soupe de légumes 300 g, Blanc de poulet 150 g »). RIEN D'AUTRE : pas de pain, pas de fromage, pas de yaourt, pas de féculent, pas d'huile listée séparément.
- Féculent du déjeuner (UN SEUL, aucun autre féculent en plus) : ${role.starch}.
- ${role.pace}`
    : ``;

  // Tirage pseudo-aléatoire pour forcer la diversité d'une génération à l'autre.
  const seed = Math.floor(Math.random() * 100000);
  const legumesSample = [...LEGUMES_AUTORISES].sort(() => Math.random() - 0.5).slice(0, 8);
  const feculentsSample = [...FECULENTS_AUTORISES].sort(() => Math.random() - 0.5).slice(0, 4);

  // Banque de référence (modèles du médecin) — l'IA s'en inspire et VARIE.
  const banque = `\n\nVARIANTE #${seed} — compose un menu ORIGINAL et différent de toute version précédente.

STRUCTURE DU DÉJEUNER (varie les légumes, la protéine et les cuissons, jamais la structure) :
• Déjeuner : assiette de légumes/crudités + 150 g de protéine + UN SEUL féculent (pain complet 50 g OU 100 g riz/pâtes/pomme de terre) + 1 fruit en dessert. PAS de produit laitier.
• Légumes (cuits ou crus, à volonté), exemples : ${legumesSample.join(", ")}, etc.
• Féculent du déjeuner, exemples : ${feculentsSample.join(", ")}.
Pour le PETIT-DÉJEUNER et le DÎNER, voir les BANQUES FERMÉES imposées plus haut (PETIT_DEJ_OPTIONS et DINER_OPTIONS — aucun ajout).
IMPORTANT : pioche et combine différemment le déjeuner à chaque jour et à chaque patient pour que deux programmes ne soient jamais identiques (le petit-déjeuner et le dîner restent dans les options imposées).`;

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

Pour CHAQUE ingrédient, indique son mode de préparation dans "preparation" avec un terme SIMPLE et COURT (1-2 mots) : « cru », « cuit à la vapeur », « grillé », « au four », « bouilli », « sauté », « dur », « complet », etc. Reste minimaliste, façon ordonnance nutritionnelle — pas de description de recette.

Macros OBLIGATOIRES : Protéines 11-15 %, Glucides 50-55 %, Lipides 35-40 %.
RÈGLE CALORIQUE ABSOLUE : les calories du DÉJEUNER doivent être SUPÉRIEURES à celles du DÎNER (déjeuner > dîner). Le déjeuner est le repas le plus copieux, le dîner reste plus léger. Vérifie ce point avant de répondre et ajuste les portions si besoin.
OBLIGATOIRE : au déjeuner, liste explicitement (1) le FÉCULENT choisi avec sa quantité (UN SEUL : pain complet 50 g OU 100 g de riz/pâtes/pomme de terre — JAMAIS de boulgour, jamais deux féculents) et (2) une SOURCE DE PROTÉINE 150 g avec sa quantité (viande/poisson/volaille). PAS de produit laitier au déjeuner. Le DÎNER NE contient QUE les composants de l'option DINER_OPTIONS choisie — AUCUN pain, AUCUN fromage, AUCUN yaourt, AUCUN féculent supplémentaire au dîner.
RAPPELS : le DÉJEUNER est le repas principal et se termine TOUJOURS par 1 fruit frais (le SEUL fruit de la journée). ⚠️ L'ŒUF : au petit-déjeuner (selon l'option), JAMAIS au déjeuner, et au dîner UNIQUEMENT via l'option « Soupe de légumes + 2 œufs durs ». Le poisson au dîner UNIQUEMENT via l'option « Soupe de poisson + légumes sautés ». PAS de quinoa.`;
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
