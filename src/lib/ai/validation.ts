import type { DailyMealPlan, Meal, MealIngredient, PatientForm } from "@/types";
import { PETIT_DEJ_OPTIONS, DINER_OPTIONS } from "@/data/meal-bank";

/** Mots-clés de fruits (frais, séchés, jus, compotes...). */
const MOTS_FRUIT = [
  "pomme", "orange", "banane", "poire", "fraise", "pêche", "peche", "raisin", "kiwi",
  "mandarine", "clémentine", "clementine", "abricot", "prune", "datte", "figue",
  "pastèque", "pasteque", "melon", "ananas", "mangue", "fruit",
];

/** Mots-clés de desserts / laitages sucrés. */
const MOTS_DESSERT = [
  "compote", "salade de fruits", "dessert", "yaourt aux fruits", "yaourt sucré", "yaourt sucre",
  "crème dessert", "creme dessert", "flan", "pâtisserie", "patisserie", "gâteau", "gateau",
];

const MOTS_OEUF = ["œuf", "oeuf"];

/** Œuf dur — seule forme d'œuf autorisée au dîner (option « 2 œufs durs »). */
const OEUF_DUR_RE = /(?:œ|oe)ufs?\s+durs?/;

/** Soupe de poisson — seule forme de poisson autorisée au dîner (option dédiée). */
const SOUPE_POISSON_RE = /soupe\s+de\s+poisson/;

/**
 * Mots-clés d'aliments INTERDITS au dîner par la banque fermée DINER_OPTIONS
 * (composants de l'option choisie UNIQUEMENT — aucun ajout de pain, laitage, féculent...).
 */
const MOTS_HORS_BANQUE_DINER = [
  "fromage", "yaourt", "yahourt", "pain", "riz", "pâtes", "pates", "semoule",
  "boulgour", "pomme de terre", "huile",
];

/**
 * Mots-clés POISSON au sens strict (toute mention, même en garniture).
 * Les fruits de mer (crevette, moules, calamar...) sont autorisés au dîner
 * (cf. DINER_OPTIONS « Légumes au four + fruits de mer ») et NE comptent PAS
 * dans le quota poisson — voir aussi `texteSansFauxFruits`.
 */
const MOTS_POISSON = [
  "poisson", "sardine", "maquereau", "thon", "merlan", "saumon", "cabillaud", "sole", "lotte", "dorade",
];

/** Mots-clés COUSCOUS — réservé EXCLUSIVEMENT au déjeuner du vendredi. */
const MOTS_COUSCOUS = ["couscous"];

/** Boulgour — INTERDIT partout, ne doit JAMAIS être généré. */
const MOTS_BOULGOUR = ["boulgour", "boulghour", "bulgur"];

/**
 * Féculents — sert à vérifier la règle « UN SEUL féculent au déjeuner »
 * (50 g pain complet OU 100 g riz/pâtes/pomme de terre, jamais deux).
 */
const MOTS_FECULENT = [
  "pain", "riz", "pâtes", "pates", "pomme de terre", "semoule", "couscous",
  "boulgour", "vermicelle",
];

/** Protéines attendues au déjeuner (150 g obligatoires). */
const MOTS_PROTEINE_DEJEUNER = [
  "poulet", "dinde", "volaille", "escalope", "steak", "viande", "brochette",
  "bœuf", "boeuf", "agneau", "crevette", "fruits de mer", "calamar", "moule",
  ...MOTS_POISSON,
];

/**
 * Légumes HORS liste autorisée du document Word (féculents/sucrés déguisés en
 * légumes). La liste autorisée est LEGUMES_AUTORISES (meal-bank.ts) ; on
 * blackliste ici les intrus les plus courants que l'IA pourrait glisser.
 */
const MOTS_LEGUMES_NON_AUTORISES = [
  "petit pois", "petits pois", "maïs", "potiron", "citrouille", "patate douce",
  "panais", "topinambour", "butternut",
];

/* ------------------------------------------------------------------------ */
/* Allergies & aliments interdits du patient (garde-fou BLOQUANT)            */
/* ------------------------------------------------------------------------ */

/**
 * Mot interdit pour CE patient (allergie, intolérance, refus), avec une
 * éventuelle exemption : si la ligne contient ce texte, elle reste autorisée
 * (ex. mot « pain » issu du gluten, exemption « sans gluten » → « pain sans
 * gluten » est accepté).
 */
export interface MotInterditPatient {
  mot: string;
  exemption?: string;
}

/** Minuscule + sans accents ni ligatures — comparaison tolérante (œuf/oeuf, blé/ble...). */
function normaliser(texte: string): string {
  const decompose = texte.toLowerCase().replace(/œ/g, "oe").replace(/æ/g, "ae").normalize("NFD");
  let resultat = "";
  for (const ch of decompose) {
    const code = ch.codePointAt(0) ?? 0;
    // Ignore les diacritiques combinants (U+0300..U+036F) issus de la décomposition NFD.
    if (code < 0x0300 || code > 0x036f) resultat += ch;
  }
  return resultat;
}

function echapperRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Vrai si `mot` apparaît comme MOT ENTIER (singulier ou pluriel) dans `texte`.
 * Évite les faux positifs par inclusion brute : « lait » ne matche pas
 * « laitue », « blé » ne matche pas « comestible ».
 */
function motEntierPresent(texte: string, mot: string): boolean {
  const t = normaliser(texte);
  const m = echapperRegExp(normaliser(mot).replace(/s$/, ""));
  return new RegExp(`(^|[^a-z0-9])${m}s?([^a-z0-9]|$)`).test(t);
}

/**
 * Familles d'allergènes connues : si l'une des clés apparaît dans les champs
 * du patient (alimentsInterdits OU commentaire pathologies), TOUS les mots de
 * la famille deviennent interdits — « fruits de mer » couvre crevettes,
 * calamars, moules... ; « gluten »/« cœliaque » couvre blé, pain, semoule,
 * couscous, orge, belboula... (sauf versions « sans gluten »).
 */
const FAMILLES_ALLERGENES: { cles: string[]; mots: string[]; exemption?: string }[] = [
  {
    cles: ["fruits de mer", "fruit de mer", "crustacé", "crustace", "coquillage"],
    mots: [
      "fruits de mer", "fruit de mer", "crevette", "gambas", "calamar", "calmar",
      "moule", "huître", "huitre", "poulpe", "seiche", "langoustine", "crabe",
      "homard", "coquillage", "palourde",
    ],
  },
  {
    cles: ["gluten", "cœliaque", "coeliaque", "céliaque", "celiaque"],
    mots: [
      "gluten", "blé", "pain", "semoule", "couscous", "pâtes", "vermicelle",
      "orge", "belboula", "boulgour", "avoine", "farine de blé",
    ],
    exemption: "sans gluten",
  },
  { cles: ["œuf", "oeuf"], mots: ["œuf", "omelette"] },
  {
    cles: ["lactose", "produit laitier", "produits laitiers", "laitage", "lait"],
    mots: ["lait", "yaourt", "yahourt", "fromage", "laitage", "beurre", "crème fraîche", "petit-lait", "lben", "raib"],
    exemption: "sans lactose",
  },
  { cles: ["poisson"], mots: ["poisson", "sardine", "maquereau", "thon", "merlan", "saumon", "cabillaud", "sole", "lotte", "dorade", "anchois"] },
  { cles: ["arachide", "cacahuète", "cacahuete"], mots: ["arachide", "cacahuète", "cacahuete"] },
  { cles: ["fruits à coque", "fruits a coque"], mots: ["noix", "amande", "noisette", "pistache", "cajou", "pignon"] },
];

/** Tokens génériques du texte libre qui ne sont PAS des aliments. */
const TOKENS_IGNORES = new Set([
  "allergie", "allergies", "intolerance", "intolerances", "interdit", "interdits",
  "refus", "aucun", "aucune", "etc", "rien", "neant", "non", "ras", "patient",
  "totale", "total", "absolu", "absolue", "severe", "alimentaire", "alimentaires",
]);

/**
 * Construit la liste des mots interdits pour CE patient à partir de :
 * - `preferences.alimentsInterdits` (allergies, intolérances, refus — parsé
 *   littéralement, token par token) ;
 * - `commentairePathologies` (texte médical libre — seules les FAMILLES
 *   d'allergènes connues y sont détectées, ex. « maladie cœliaque »).
 */
export function motsInterditsPatient(form: PatientForm): MotInterditPatient[] {
  const interdits = form.preferences?.alimentsInterdits ?? "";
  const commentaire = form.commentairePathologies ?? "";
  const brut = `${interdits} ; ${commentaire}`;
  if (!brut.replace(/;/g, "").trim()) return [];

  const resultat = new Map<string, MotInterditPatient>();
  const ajouter = (mot: string, exemption?: string) => {
    const cle = normaliser(mot).trim();
    if (cle.length >= 3 && !resultat.has(cle)) resultat.set(cle, { mot: mot.trim(), exemption });
  };

  for (const famille of FAMILLES_ALLERGENES) {
    if (famille.cles.some((c) => motEntierPresent(brut, c))) {
      for (const m of famille.mots) ajouter(m, famille.exemption);
    }
  }

  for (const token of interdits.split(/[,;()/+\n]|\bet\b|\bou\b/)) {
    const mot = token
      .trim()
      .replace(/^(pas\s+de|pas\s+d'|sans|aucun|aucune|allergies?\s+aux?|allergique\s+aux?|intol[ée]rances?\s+aux?)\s+/i, "")
      .replace(/^(le|la|les|l'|du|de\s+la|des|de)\s+/i, "")
      .trim();
    if (mot.length >= 3 && !TOKENS_IGNORES.has(normaliser(mot))) ajouter(mot);
  }

  return [...resultat.values()];
}

/**
 * Vrai si un texte libre (option de banque, label de protéine, nom de
 * féculent...) contient un aliment interdit — sert à FILTRER les banques
 * fermées dans dayRole() et les prompts.
 */
export function texteContientInterdit(texte: string, motsInterdits: MotInterditPatient[]): boolean {
  return motsInterdits.some(
    ({ mot, exemption }) =>
      motEntierPresent(texte, mot) && !(exemption && normaliser(texte).includes(normaliser(exemption))),
  );
}

/**
 * Lignes d'un repas (nom du plat + chaque ingrédient) contenant un aliment
 * interdit pour ce patient. Liste vide = repas conforme.
 */
export function lignesInterditesRepas(repas: Meal, motsInterdits: MotInterditPatient[]): { ligne: string; mot: string }[] {
  if (motsInterdits.length === 0) return [];
  const violations: { ligne: string; mot: string }[] = [];
  const lignes = [repas.nom, ...(repas.ingredients ?? []).map((i) => `${i.nom} ${i.preparation ?? ""}`)];
  for (const ligne of lignes) {
    for (const { mot, exemption } of motsInterdits) {
      if (motEntierPresent(ligne, mot) && !(exemption && normaliser(ligne).includes(normaliser(exemption)))) {
        violations.push({ ligne: ligne.trim(), mot });
        break;
      }
    }
  }
  return violations;
}

/**
 * Neutralise les faux positifs « fruit » : « fruits de mer » et « pomme de
 * terre » contiennent les mots « fruit »/« pomme » sans être des fruits.
 */
function texteSansFauxFruits(texte: string): string {
  return texte.replace(/fruits?\s*de\s*mer/g, "").replace(/pommes?\s*de\s*terre/g, "");
}

function texteRepas(repas: Meal): string {
  const ingr = (repas.ingredients ?? []).map((i) => i.nom).join(" ");
  return `${repas.nom} ${ingr}`.toLowerCase();
}

/** Texte normalisé (nom + ingrédients) d'un repas — exporté pour dayRole(). */
export function texteDuRepas(repas: Meal): string {
  return texteRepas(repas);
}

function contient(texte: string, mots: string[]): boolean {
  return mots.some((m) => texte.includes(m));
}

function estPetitDejeuner(type: string): boolean {
  return type.includes("petit");
}

function estDejeuner(type: string): boolean {
  return (type.includes("déjeuner") || type.includes("dejeuner")) && !type.includes("petit");
}

function estDiner(type: string): boolean {
  return type.includes("dîner") || type.includes("diner");
}

/* ------------------------------------------------------------------------ */
/* Classification des repas sur les banques fermées (anti-répétition veille) */
/* ------------------------------------------------------------------------ */

/**
 * Identifie l'option PETIT_DEJ_OPTIONS correspondant au texte d'un
 * petit-déjeuner (-1 si non reconnue) :
 * 0 = œuf, 1 = ½ avocat, 2 = ¼ avocat + œuf dur, 3 = belboula/avoine.
 */
export function indexOptionPetitDej(texte: string): number {
  const t = texte.toLowerCase();
  if (/belboula|avoine|orge/.test(t)) return 3;
  const avocat = t.includes("avocat");
  const oeuf = /(?:œ|oe)uf/.test(t);
  if (avocat && oeuf) return 2;
  if (avocat) return 1;
  if (oeuf) return 0;
  return -1;
}

/**
 * Identifie l'option DINER_OPTIONS correspondant au texte d'un dîner
 * (-1 si non reconnue). L'ordre des tests reflète les marqueurs distinctifs :
 * 0 = soupe légumes + poulet, 1 = soupe + viande hachée, 2 = four + fruits de
 * mer, 3 = four + poulet, 4 = soupe de poisson, 5 = 2 œufs durs, 6 = sautés + poulet.
 */
export function indexOptionDiner(texte: string): number {
  const t = texte.toLowerCase();
  if (SOUPE_POISSON_RE.test(t)) return 4;
  if (/(?:œ|oe)uf/.test(t)) return 5;
  if (/fruits?\s*de\s*mer/.test(t)) return 2;
  if (/hach/.test(t)) return 1;
  if (/four/.test(t)) return 3;
  if (/saut/.test(t)) return 6;
  if (/soupe/.test(t)) return 0;
  return -1;
}

/** Protéine principale d'un déjeuner (mot-clé le plus spécifique), null si absente. */
export function proteinePrincipaleDejeuner(texte: string): string | null {
  const t = texte.toLowerCase();
  const ordre = [
    "poulet", "dinde", "brochette", "steak", "viande hachée", "viande hachee",
    ...MOTS_POISSON, "escalope", "viande", "bœuf", "boeuf", "agneau",
  ];
  for (const mot of ordre) {
    if (t.includes(mot)) return mot === "viande hachee" ? "viande hachée" : mot;
  }
  return null;
}

/**
 * Famille de la protéine d'un déjeuner — sert à `dayRole()` pour exclure la
 * famille utilisée la veille (anti-répétition serveur-side).
 */
export function familleProteineDejeuner(texte: string): "poulet" | "dinde" | "poisson" | "viande_rouge" | null {
  const t = texte.toLowerCase();
  if (contient(t, MOTS_POISSON)) return "poisson";
  if (t.includes("poulet")) return "poulet";
  if (t.includes("dinde")) return "dinde";
  if (/(steak|hach|brochette|viande|bœuf|boeuf|agneau)/.test(t)) return "viande_rouge";
  return null;
}

/** Type de féculent d'un déjeuner (pain/riz/pâtes/pomme de terre/semoule), null si absent. */
export function feculentPrincipalDejeuner(texte: string): string | null {
  const t = texte.toLowerCase();
  if (t.includes("pomme de terre")) return "pomme de terre";
  if (t.includes("pain")) return "pain";
  if (t.includes("riz")) return "riz";
  if (t.includes("pâtes") || t.includes("pates")) return "pâtes";
  if (t.includes("semoule") || t.includes("couscous")) return "semoule";
  return null;
}

export interface AnomalieRepas {
  mealIndex: number;
  raisons: string[];
}

/**
 * Compte le nombre de jours (déjà générés cette semaine) dont le déjeuner
 * contient RÉELLEMENT du poisson — détection par mots-clés sur le texte du
 * plat, indépendante de `categorieProteine` (qui n'est qu'un label de
 * planification et n'empêche pas l'IA d'ajouter du poisson en garniture).
 */
export function compterPoissonReel(historyJours: DailyMealPlan[]): number {
  return historyJours.filter((jour) => {
    const dej = jour.repas.find((r) => estDejeuner(r.type.toLowerCase()));
    return dej ? contient(texteRepas(dej), MOTS_POISSON) : false;
  }).length;
}

/** Quota hebdomadaire EXACT de poisson (déjeuner uniquement). */
export const POISSON_OBJECTIF_HEBDO = 2;

/**
 * Détecte les anomalies BLOQUANTES sur un jour généré :
 * - fruit ou dessert au dîner
 * - œuf au déjeuner
 * - œuf au dîner sous une autre forme que « œuf dur » (option « 2 œufs durs »)
 * - poisson au petit-déjeuner
 * - poisson au dîner hors option « Soupe de poisson »
 * - poisson au déjeuner au-delà du quota hebdomadaire EXACT de 2
 * - dernier jour de la semaine : quota poisson PAS ENCORE ATTEINT (jamais 0, jamais 1)
 * - dîner contenant un ingrédient hors banque fermée DINER_OPTIONS (pain,
 *   fromage, yaourt, féculent, huile listée séparément...)
 * - couscous présent un jour autre que le déjeuner du vendredi
 * - BOULGOUR n'importe où (interdit, ne doit jamais être généré)
 * - légume hors liste autorisée du document Word (petits pois, maïs...)
 * - déjeuner : féculent manquant, DEUX féculents (un seul autorisé), protéine manquante
 * - repas IDENTIQUE à celui de la VEILLE (petit-déjeuner, déjeuner ou dîner)
 *
 * @param poissonDejaUtilise Nombre de jours PRÉCÉDENTS de la semaine où du
 *   poisson a déjà été détecté au déjeuner (cf. `compterPoissonReel`).
 * @param dernierJourSemaine `true` si `jour` est le dernier jour non-vendredi
 *   de la semaine (dimanche) — déclenche la vérification "quota atteint".
 * @param jourNom Nom du jour (ex. "Lundi", "Vendredi") — sert à autoriser le
 *   couscous UNIQUEMENT le vendredi.
 * @param jourVeille Jour généré la VEILLE (null si premier jour) — sert à
 *   refuser tout repas identique à celui de la veille.
 * @param motsInterdits Aliments interdits pour CE patient (allergies,
 *   intolérances, refus — cf. `motsInterditsPatient`) : toute présence dans
 *   n'importe quel repas est une anomalie BLOQUANTE.
 */
export function detecterAnomaliesJour(
  jour: DailyMealPlan,
  poissonDejaUtilise = 0,
  dernierJourSemaine = false,
  jourNom = "",
  jourVeille: DailyMealPlan | null = null,
  motsInterdits: MotInterditPatient[] = [],
): AnomalieRepas[] {
  const anomalies: AnomalieRepas[] = [];
  const estVendredi = jourNom.toLowerCase() === "vendredi";

  const veillePetitDej = jourVeille?.repas.find((r) => estPetitDejeuner(r.type.toLowerCase()));
  const veilleDejeuner = jourVeille?.repas.find((r) => estDejeuner(r.type.toLowerCase()));
  const veilleDiner = jourVeille?.repas.find((r) => estDiner(r.type.toLowerCase()));

  jour.repas.forEach((repas, mealIndex) => {
    const type = repas.type.toLowerCase();
    const texte = texteRepas(repas);
    const raisons: string[] = [];
    const poissonIci = contient(texte, MOTS_POISSON);
    const couscousIci = contient(texte, MOTS_COUSCOUS);

    // -- Règles valables pour TOUS les repas --------------------------------
    // GARDE-FOU ALLERGIES : aucun aliment interdit pour ce patient, dans
    // AUCUN repas (nom du plat ou ingrédient) — anomalie BLOQUANTE.
    const lignesInterdites = lignesInterditesRepas(repas, motsInterdits);
    if (lignesInterdites.length > 0) {
      raisons.push(
        `aliment INTERDIT pour ce patient (allergie/intolérance) : ${lignesInterdites
          .map((v) => `« ${v.ligne} » (${v.mot})`)
          .join(", ")}`,
      );
    }
    if (contient(texte, MOTS_BOULGOUR)) {
      raisons.push("boulgour (interdit, ne doit JAMAIS être généré)");
    }
    const legumesHorsListe = (repas.ingredients ?? []).filter((ing) =>
      contient(ing.nom.toLowerCase(), MOTS_LEGUMES_NON_AUTORISES),
    );
    if (legumesHorsListe.length > 0) {
      raisons.push(
        `légume hors liste autorisée (${legumesHorsListe.map((i) => i.nom).join(", ")})`,
      );
    }

    if (estPetitDejeuner(type)) {
      if (poissonIci) raisons.push("poisson au petit-déjeuner");
      if (couscousIci) raisons.push("couscous au petit-déjeuner (réservé au déjeuner du vendredi)");
      // Anti-répétition : même option de la banque que la veille → refusé.
      if (veillePetitDej) {
        const optAujourdhui = indexOptionPetitDej(texte);
        const optVeille = indexOptionPetitDej(texteRepas(veillePetitDej));
        if (optAujourdhui !== -1 && optAujourdhui === optVeille) {
          raisons.push("petit-déjeuner identique à la veille (choisir une AUTRE option de la banque)");
        }
      }
    }

    if (estDiner(type)) {
      // « fruits de mer » et « pomme de terre » ne sont PAS des fruits.
      if (contient(texteSansFauxFruits(texte), MOTS_FRUIT)) raisons.push("fruit au dîner");
      if (contient(texte, MOTS_DESSERT)) raisons.push("dessert au dîner");
      // Œuf au dîner autorisé UNIQUEMENT sous forme « œuf dur » (option de la
      // banque « Soupe de légumes + 2 œufs durs »).
      if (contient(texte, MOTS_OEUF) && !OEUF_DUR_RE.test(texte)) {
        raisons.push("œuf au dîner (autorisé uniquement en « œufs durs », option de la banque)");
      }
      // Poisson au dîner autorisé UNIQUEMENT via l'option « Soupe de poisson ».
      if (poissonIci && !SOUPE_POISSON_RE.test(texte)) {
        raisons.push("poisson au dîner (autorisé uniquement en « soupe de poisson », option de la banque)");
      }
      if (couscousIci) raisons.push("couscous au dîner (réservé au déjeuner du vendredi)");
      const ingredientsHorsBanque = (repas.ingredients ?? []).filter((ing) =>
        contient(ing.nom.toLowerCase(), MOTS_HORS_BANQUE_DINER),
      );
      if (ingredientsHorsBanque.length > 0) {
        raisons.push(
          `ingrédient hors banque DINER_OPTIONS au dîner (${ingredientsHorsBanque.map((i) => i.nom).join(", ")})`,
        );
      }
      // Anti-répétition : même option de la banque que la veille → refusé.
      if (veilleDiner) {
        const optAujourdhui = indexOptionDiner(texte);
        const optVeille = indexOptionDiner(texteRepas(veilleDiner));
        if (optAujourdhui !== -1 && optAujourdhui === optVeille) {
          raisons.push("dîner identique à la veille (choisir une AUTRE option de la banque)");
        }
      }
    }

    if (estDejeuner(type)) {
      if (contient(texte, MOTS_OEUF)) raisons.push("œuf au déjeuner");
      if (couscousIci && !estVendredi) {
        raisons.push("couscous au déjeuner un jour autre que vendredi (réservé au vendredi)");
      }
      if (poissonIci && poissonDejaUtilise >= POISSON_OBJECTIF_HEBDO) {
        raisons.push(`poisson au déjeuner au-delà du quota hebdomadaire (${POISSON_OBJECTIF_HEBDO} exactement)`);
      }
      if (!poissonIci && dernierJourSemaine && poissonDejaUtilise + (poissonIci ? 1 : 0) < POISSON_OBJECTIF_HEBDO) {
        raisons.push(`poisson manquant pour atteindre le quota hebdomadaire (${POISSON_OBJECTIF_HEBDO} exactement)`);
      }

      // Structure stricte : UN SEUL féculent (50 g pain complet OU 100 g
      // riz/pâtes/pomme de terre) et une protéine 150 g. Les lignes de légumes
      // qui MENTIONNENT un féculent (ex. « légumes du couscous ») ne comptent pas.
      const lignesFeculents = (repas.ingredients ?? []).filter((ing) => {
        const n = ing.nom.toLowerCase();
        return contient(n, MOTS_FECULENT) && !n.includes("légume") && !n.includes("legume");
      });
      if (lignesFeculents.length >= 2) {
        raisons.push(
          `deux féculents au déjeuner (${lignesFeculents.map((i) => i.nom).join(", ")}) — UN SEUL autorisé`,
        );
      }
      if (lignesFeculents.length === 0) {
        raisons.push("féculent manquant au déjeuner (50 g pain complet OU 100 g riz/pâtes/pomme de terre)");
      }
      if (!contient(texte, MOTS_PROTEINE_DEJEUNER)) {
        raisons.push("protéine manquante au déjeuner (150 g obligatoires)");
      }

      // Anti-répétition : même protéine ET même féculent que la veille → refusé.
      if (veilleDejeuner) {
        const protA = proteinePrincipaleDejeuner(texte);
        const protB = proteinePrincipaleDejeuner(texteRepas(veilleDejeuner));
        const fecA = feculentPrincipalDejeuner(texte);
        const fecB = feculentPrincipalDejeuner(texteRepas(veilleDejeuner));
        if (protA !== null && protA === protB && fecA !== null && fecA === fecB) {
          raisons.push("déjeuner identique à la veille (changer la protéine ou le féculent)");
        }
      }
    }

    if (raisons.length > 0) {
      anomalies.push({ mealIndex, raisons });
    }
  });

  return anomalies;
}

/* ------------------------------------------------------------------------ */
/* Corrections déterministes de dernier recours                              */
/* ------------------------------------------------------------------------ */

/** Ingrédients « ordonnance » pour chaque option PETIT_DEJ_OPTIONS (même index). */
const PETIT_DEJ_TEMPLATES: MealIngredient[][] = [
  [
    { nom: "Concombre", quantite: "50 g", preparation: "cru" },
    { nom: "Tomate", quantite: "50 g", preparation: "crue" },
    { nom: "Laitue", quantite: "30 g", preparation: "crue" },
    { nom: "Œuf", quantite: "1", preparation: "au plat ou dur" },
    { nom: "Pain complet", quantite: "50 g", preparation: "—" },
    { nom: "Huile d'olive", quantite: "5 g", preparation: "—" },
    { nom: "Thé sans sucre", quantite: "1 tasse", preparation: "—" },
  ],
  [
    { nom: "Concombre", quantite: "50 g", preparation: "cru" },
    { nom: "Tomate", quantite: "50 g", preparation: "crue" },
    { nom: "Laitue", quantite: "30 g", preparation: "crue" },
    { nom: "Avocat", quantite: "1/2", preparation: "cru" },
    { nom: "Pain complet", quantite: "50 g", preparation: "—" },
    { nom: "Café sans sucre", quantite: "1 tasse", preparation: "—" },
  ],
  [
    { nom: "Concombre", quantite: "50 g", preparation: "cru" },
    { nom: "Tomate", quantite: "50 g", preparation: "crue" },
    { nom: "Laitue", quantite: "30 g", preparation: "crue" },
    { nom: "Avocat", quantite: "1/4", preparation: "cru" },
    { nom: "Œuf", quantite: "1", preparation: "dur" },
    { nom: "Pain complet", quantite: "50 g", preparation: "—" },
    { nom: "Thé sans sucre", quantite: "1 tasse", preparation: "—" },
  ],
  [
    { nom: "Belboula d'orge", quantite: "60 g (poids sec)", preparation: "cuite dans l'eau, sans sucre" },
    { nom: "Pain complet", quantite: "50 g", preparation: "—" },
    { nom: "Huile d'olive", quantite: "5 g", preparation: "—" },
    { nom: "Café sans sucre", quantite: "1 tasse", preparation: "—" },
  ],
];

/** Ingrédients « ordonnance » pour chaque option DINER_OPTIONS (même index). */
const DINER_TEMPLATES: MealIngredient[][] = [
  [
    { nom: "Soupe de légumes", quantite: "300 g", preparation: "maison" },
    { nom: "Blanc de poulet", quantite: "150 g", preparation: "grillé" },
  ],
  [
    { nom: "Soupe de légumes", quantite: "300 g", preparation: "maison" },
    { nom: "Viande hachée sans graisse", quantite: "150 g", preparation: "cuite" },
  ],
  [
    { nom: "Légumes au four", quantite: "250 g", preparation: "au four" },
    { nom: "Fruits de mer", quantite: "150 g", preparation: "cuits" },
  ],
  [
    { nom: "Légumes au four", quantite: "250 g", preparation: "au four" },
    { nom: "Blanc de poulet", quantite: "150 g", preparation: "au four" },
  ],
  [
    { nom: "Soupe de poisson", quantite: "300 g", preparation: "maison" },
    { nom: "Légumes sautés", quantite: "200 g", preparation: "sautés" },
  ],
  [
    { nom: "Soupe de légumes", quantite: "300 g", preparation: "maison" },
    { nom: "Œufs durs", quantite: "2", preparation: "durs" },
  ],
  [
    { nom: "Légumes sautés", quantite: "250 g", preparation: "sautés" },
    { nom: "Blanc de poulet", quantite: "150 g", preparation: "grillé" },
  ],
];

/**
 * Reconstruit un repas depuis UNE AUTRE option de la banque fermée (différente
 * de l'option actuelle) — correction déterministe « identique à la veille »
 * ou « aliment interdit ». Les options contenant un aliment interdit pour le
 * patient sont écartées ; s'il n'en reste aucune (ex. gluten au petit-déjeuner,
 * toutes les options contiennent du pain), les lignes fautives sont retirées
 * du template et le pain est remplacé par sa version sans gluten.
 */
export function reconstruireDepuisBanque(
  repas: Meal,
  banque: "petit_dejeuner" | "diner",
  motsInterdits: MotInterditPatient[] = [],
): Meal {
  const options = banque === "diner" ? DINER_OPTIONS : PETIT_DEJ_OPTIONS;
  const templates = banque === "diner" ? DINER_TEMPLATES : PETIT_DEJ_TEMPLATES;
  const idxActuel = banque === "diner" ? indexOptionDiner(texteRepas(repas)) : indexOptionPetitDej(texteRepas(repas));
  let candidats = options.map((_, i) => i).filter((i) => i !== idxActuel);
  if (motsInterdits.length > 0) {
    const compatibles = candidats.filter((i) => {
      const texteOption = `${options[i]} ${templates[i].map((t) => t.nom).join(" ")}`;
      return !texteContientInterdit(texteOption, motsInterdits);
    });
    if (compatibles.length > 0) candidats = compatibles;
  }
  const idx = candidats[Math.floor(Math.random() * candidats.length)];

  let ingredients = templates[idx].map((ing) => ({ ...ing }));
  let nom = options[idx];
  if (motsInterdits.length > 0) {
    // Dernier filet : retire toute ligne interdite résiduelle du template.
    let painSansGluten = false;
    ingredients = ingredients.filter((ing) => {
      const ligne = `${ing.nom} ${ing.preparation ?? ""}`;
      const fautif = motsInterdits.find(
        (m) => texteContientInterdit(ligne, [m]),
      );
      if (!fautif) return true;
      if (fautif.exemption === "sans gluten" && normaliser(ing.nom).includes("pain")) painSansGluten = true;
      return false;
    });
    if (painSansGluten) ingredients.push({ nom: "Pain sans gluten", quantite: "50 g", preparation: "—" });
    const parts = nom
      .split("+")
      .map((p) => p.trim())
      .filter((p) => !texteContientInterdit(p, motsInterdits));
    if (painSansGluten) parts.push("50 g de pain sans gluten");
    nom = parts.join(" + ") || nom;
  }

  return { ...repas, nom, ingredients };
}

/** Banque des féculents du déjeuner pour la permutation déterministe. */
const FECULENTS_PERMUTATION: { cle: string; nom: string; quantite: string }[] = [
  { cle: "pain", nom: "Pain complet", quantite: "50 g" },
  { cle: "riz", nom: "Riz complet", quantite: "100 g" },
  { cle: "pâtes", nom: "Pâtes complètes", quantite: "100 g" },
  { cle: "pomme de terre", nom: "Pomme de terre", quantite: "100 g" },
];

/**
 * Remplace le féculent du déjeuner par un féculent d'un AUTRE type — correction
 * déterministe « déjeuner identique à la veille » (changer le féculent suffit
 * à différencier le repas).
 */
export function permuterFeculentDejeuner(repas: Meal): Meal {
  const actuel = feculentPrincipalDejeuner(texteRepas(repas));
  const candidats = FECULENTS_PERMUTATION.filter((f) => f.cle !== actuel);
  const remplacant = candidats[Math.floor(Math.random() * candidats.length)];

  const ingredients = repas.ingredients.filter((ing) => !contient(ing.nom.toLowerCase(), MOTS_FECULENT));
  ingredients.push({ nom: remplacant.nom, quantite: remplacant.quantite, preparation: "cuit" });

  const nom = repas.nom
    .split(/[+,]/)
    .map((part) => part.trim())
    .filter((part) => !contient(part.toLowerCase(), MOTS_FECULENT))
    .concat(remplacant.nom)
    .join(" + ");

  return { ...repas, nom: nom || repas.nom, ingredients };
}

/**
 * Correction déterministe de dernier recours, appliquée si la régénération IA
 * échoue toujours après plusieurs tentatives. Retire les ingrédients incriminés
 * (fruit/dessert/œuf/poisson/boulgour/légume hors liste/féculent en trop) et
 * les remplace par un complément neutre conforme. Pour un repas « identique à
 * la veille », rebascule sur une AUTRE option de la banque fermée.
 */
export function corrigerRepasFallback(repas: Meal, raisons: string[], motsInterdits: MotInterditPatient[] = []): Meal {
  const type = repas.type.toLowerCase();

  // Aliment INTERDIT (allergie/intolérance) → reconstruction sur une option de
  // la banque COMPATIBLE (petit-déj/dîner) ou retrait + complément (déjeuner).
  if (motsInterdits.length > 0 && raisons.some((r) => r.includes("aliment INTERDIT"))) {
    if (estPetitDejeuner(type)) return reconstruireDepuisBanque(repas, "petit_dejeuner", motsInterdits);
    if (estDiner(type)) return reconstruireDepuisBanque(repas, "diner", motsInterdits);
    if (estDejeuner(type)) {
      let ingredients = repas.ingredients.filter(
        (ing) => !texteContientInterdit(`${ing.nom} ${ing.preparation ?? ""}`, motsInterdits),
      );
      // Si la protéine ou le féculent a sauté avec le retrait, on complète
      // avec un équivalent lui-même compatible avec les interdits.
      const proteinesSures = ["Blanc de poulet", "Escalope de dinde", "Viande hachée sans graisse"]
        .filter((p) => !texteContientInterdit(p, motsInterdits));
      if (!ingredients.some((ing) => contient(ing.nom.toLowerCase(), MOTS_PROTEINE_DEJEUNER)) && proteinesSures.length > 0) {
        ingredients.push({ nom: proteinesSures[0], quantite: "150 g", preparation: "grillé" });
      }
      const feculentsSurs = FECULENTS_PERMUTATION.filter((f) => !texteContientInterdit(f.nom, motsInterdits));
      if (!ingredients.some((ing) => contient(ing.nom.toLowerCase(), MOTS_FECULENT)) && feculentsSurs.length > 0) {
        ingredients.push({ nom: feculentsSurs[0].nom, quantite: feculentsSurs[0].quantite, preparation: "cuit" });
      }
      const nom = repas.nom
        .split(/[+,]/)
        .map((p) => p.trim())
        .filter((p) => p.length > 0 && !texteContientInterdit(p, motsInterdits))
        .join(" + ");
      return { ...repas, nom: nom || "Déjeuner adapté (allergie respectée)", ingredients };
    }
  }

  // Repas identique à la veille → choisir automatiquement une autre option.
  if (raisons.some((r) => r.includes("identique à la veille"))) {
    if (estPetitDejeuner(type)) return reconstruireDepuisBanque(repas, "petit_dejeuner", motsInterdits);
    if (estDiner(type)) return reconstruireDepuisBanque(repas, "diner", motsInterdits);
    if (estDejeuner(type)) return permuterFeculentDejeuner(repas);
  }

  const motsAExclure = [
    ...(raisons.some((r) => r.includes("fruit")) ? MOTS_FRUIT : []),
    ...(raisons.some((r) => r.includes("dessert")) ? MOTS_DESSERT : []),
    ...(raisons.some((r) => r.includes("œuf")) ? MOTS_OEUF : []),
    ...(raisons.some((r) => r.includes("poisson")) ? MOTS_POISSON : []),
    ...(raisons.some((r) => r.includes("hors banque")) ? MOTS_HORS_BANQUE_DINER : []),
    ...(raisons.some((r) => r.includes("couscous")) ? MOTS_COUSCOUS : []),
    ...(raisons.some((r) => r.includes("boulgour")) ? MOTS_BOULGOUR : []),
    ...(raisons.some((r) => r.includes("légume hors liste")) ? MOTS_LEGUMES_NON_AUTORISES : []),
  ];

  // « fruits de mer » / « pomme de terre » ne doivent pas être retirés par les
  // mots-clés fruit → normalisation avant filtrage.
  let ingredients = repas.ingredients.filter(
    (ing) => !contient(texteSansFauxFruits(ing.nom.toLowerCase()), motsAExclure),
  );

  // Deux féculents au déjeuner → ne garder que le PREMIER féculent listé.
  if (raisons.some((r) => r.includes("deux féculents"))) {
    let premierGarde = false;
    ingredients = ingredients.filter((ing) => {
      if (!contient(ing.nom.toLowerCase(), MOTS_FECULENT)) return true;
      if (!premierGarde) {
        premierGarde = true;
        return true;
      }
      return false;
    });
  }

  // Si l'œuf ou le poisson retiré était la protéine principale, on ajoute un
  // remplacement conforme au rôle du repas (déjeuner/dîner = volaille).
  const proteineRetiree = raisons.some((r) => r.includes("œuf") || r.includes("poisson"));
  if (proteineRetiree && (estDejeuner(type) || estDiner(type))) {
    ingredients.push({ nom: "Blanc de poulet", quantite: "150 g", preparation: "grillé" });
  }

  // Protéine manquante au déjeuner → ajout d'une protéine conforme (150 g).
  if (raisons.some((r) => r.includes("protéine manquante"))) {
    ingredients.push({ nom: "Blanc de poulet", quantite: "150 g", preparation: "grillé" });
  }

  // Si le couscous/boulgour retiré faisait office de féculent au déjeuner, ou si
  // le féculent manque, on ajoute UN féculent autorisé.
  const feculentARemplacer = raisons.some((r) => r.includes("couscous") || r.includes("boulgour"));
  const feculentManquant = raisons.some((r) => r.includes("féculent manquant"));
  if (estDejeuner(type) && (feculentManquant || (feculentARemplacer && !ingredients.some((ing) => contient(ing.nom.toLowerCase(), MOTS_FECULENT))))) {
    ingredients.push({ nom: "Riz complet", quantite: "100 g", preparation: "cuit" });
  }

  const ajouts = [
    proteineRetiree || raisons.some((r) => r.includes("protéine manquante")) ? "Blanc de poulet" : null,
    ingredients.some((ing) => ing.nom === "Riz complet") && (feculentManquant || feculentARemplacer) ? "Riz complet" : null,
  ].filter((x): x is string => x !== null);

  const nom = repas.nom
    .split(/[+,]/)
    .map((part) => part.trim())
    .filter((part) => !contient(texteSansFauxFruits(part.toLowerCase()), motsAExclure))
    .concat(ajouts)
    .join(" + ");

  return {
    ...repas,
    nom: nom || repas.nom,
    ingredients: ingredients.length > 0 ? ingredients : repas.ingredients,
  };
}

/**
 * Correction déterministe de dernier recours : impose du poisson au déjeuner
 * (remplace la protéine actuelle) pour garantir le quota hebdomadaire EXACT
 * de 2 repas poisson, quand on arrive au dernier jour de la semaine sans
 * l'avoir atteint.
 */
export function corrigerRepasImposerPoisson(repas: Meal): Meal {
  // Retire toute mention de protéine "classique" pour éviter le doublon
  // (volaille/viande rouge/œuf), garde le reste (légumes, féculent, pain).
  const motsProteineNonPoisson = [
    "poulet", "dinde", "escalope", "volaille", "steak", "viande hachée", "viande maigre",
    "brochette", "bœuf", "boeuf", ...MOTS_OEUF,
  ];
  const ingredients = repas.ingredients.filter((ing) => !contient(ing.nom.toLowerCase(), motsProteineNonPoisson));
  ingredients.push({ nom: "Sardines grillées", quantite: "150 g", preparation: "grillé" });

  const nom = repas.nom
    .split(/[+,]/)
    .map((part) => part.trim())
    .filter((part) => !contient(part.toLowerCase(), motsProteineNonPoisson))
    .concat("Sardines grillées")
    .join(" + ");

  return {
    ...repas,
    nom: nom || repas.nom,
    ingredients,
  };
}

/**
 * Fusionne toutes les lignes d'huile (huile d'olive, huile de colza...) d'un
 * repas en UNE SEULE ligne « Huile d'olive », en additionnant les quantités
 * exprimées en grammes (ml traités comme g). Si les quantités ne sont pas
 * parsables, conserve la première trouvée.
 */
export function fusionnerHuiles(repas: Meal): Meal {
  const huiles = repas.ingredients.filter((ing) => ing.nom.toLowerCase().includes("huile"));
  if (huiles.length <= 1) return repas;

  let total = 0;
  let toutesParsables = true;
  for (const huile of huiles) {
    const match = huile.quantite.match(/(\d+(?:[.,]\d+)?)/);
    if (match) {
      total += parseFloat(match[1].replace(",", "."));
    } else {
      toutesParsables = false;
    }
  }

  const quantiteFusionnee = toutesParsables ? `${Math.round(total)} g` : huiles[0].quantite;
  const autresIngredients = repas.ingredients.filter((ing) => !ing.nom.toLowerCase().includes("huile"));

  return {
    ...repas,
    ingredients: [...autresIngredients, { nom: "Huile d'olive", quantite: quantiteFusionnee, preparation: huiles[0].preparation }],
  };
}
