/**
 * Banque de référence pour la génération des menus, inspirée des deux modèles
 * de programmes fournis par le médecin (dossier /condition). L'IA doit s'appuyer
 * sur ces listes et VARIER à chaque génération (jamais le même rapport).
 */

/** Petit-déjeuner — propositions (1 au choix par jour), SANS fruit. */
export const PETIT_DEJ_OPTIONS = [
  "Assiette de légumes (concombre, tomate, laitue) + 1 œuf au plat ou dur + 50 g de pain complet (ou 2 toasts) + 1 c. à café d'huile d'olive",
  "Assiette de légumes (concombre, tomate, laitue) + ½ avocat + 50 g de pain complet (ou 2 toasts)",
  "Assiette de légumes (concombre, tomate, laitue) + ¼ d'avocat + 1 œuf dur + 50 g de pain complet (ou 2 toasts)",
  "1 bol de belboula d'orge cuite dans l'eau (ou avoine, sans sucre) + 50 g de pain complet + 1 c. à café d'huile d'olive",
];

/** Petit-déjeuner — boisson chaude (sans sucre). */
export const BOISSONS_CHAUDES = ["café sans sucre", "thé sans sucre", "chicorée sans sucre"];

/** Protéine principale du DÉJEUNER, planning par jour (modèle 1, à varier). */
export const DEJEUNER_PROTEINE_PAR_JOUR: Record<string, string> = {
  Lundi: "150 g de poulet (grillé ou au four)",
  Mardi: "150 g de steak de viande maigre",
  Mercredi: "150 g de poisson (sardines, maquereau, saumon ou thon)",
  Jeudi: "150 g de brochettes de poulet",
  Vendredi: "150 g de viande hachée maigre",
  Samedi: "150 g de poulet (ou tajine de poulet léger)",
  Dimanche: "150 g de poisson (cabillaud, sole, lotte) ou plat familial élaboré",
};

/** Protéines autorisées au déjeuner (150 g), toute la liste — sert de pool global. */
export const DEJEUNER_PROTEINES_AUTORISEES = [
  "poulet", "maquereaux", "saumon", "thon", "sole", "lotte", "sardines",
  "brochettes de poulet", "viande hachée", "steak de viande",
];

/**
 * DÎNER — banque d'options (à piocher en VARIANT, protéine toujours présente).
 * JAMAIS d'œuf ni de poisson au dîner (œuf = petit-déjeuner uniquement,
 * poisson = déjeuner uniquement).
 */
export const DINER_OPTIONS = [
  "Soupe de légumes + 150 g de poulet",
  "Soupe de légumes + 150 g de viande hachée maigre",
  "Légumes au four + 150 g de poulet",
  "Légumes au four + 150 g de fruits de mer",
  "Légumes sautés + 150 g de poulet",
  "Légumes sautés + 150 g de viande maigre",
  "Soupe de légumes + 150 g de dinde",
];

/** Légumes autorisés (consommés cuits ou crus). */
export const LEGUMES_AUTORISES = [
  "artichaut", "betterave", "carotte", "brocoli", "champignon", "poireau",
  "poivron (vert, jaune, rouge)", "laitue", "tomate", "aubergine",
  "chou (blanc, vert, rouge, frisé)", "chou-fleur", "chou de Bruxelles",
  "concombre", "courgette", "épinard", "fenouil", "haricot vert", "navet", "radis",
];

/** Féculents complets autorisés (petites portions). */
export const FECULENTS_AUTORISES = [
  "pain complet (50 g)", "riz complet (100 g)", "pâtes complètes (100 g)",
  "pomme de terre (100 g)", "semoule complète", "pain d'orge", "boulgour", "patate douce",
];

/** Aliments INTERDITS (à reproduire dans la section recommandations). */
export const ALIMENTS_INTERDITS = [
  "Aliments transformés / ultra-transformés",
  "Boissons gazeuses et sodas (même 0 % sucre)",
  "Beurre",
  "Biscuits, viennoiseries, pâtisseries (max 1 fois / 10 jours)",
  "Jus de fruits industriels et naturels (max 1 fois / semaine)",
  "Pizzas, hamburgers (max 1 fois / 10 jours)",
  "Fritures (frites, poissons frits, tout ce qui est frit)",
  "Pain blanc (uniquement du pain complet)",
  "Grignotage entre les repas",
];

/** Notes générales du programme. */
export const NOTES_PROGRAMME = [
  "Respecter le rythme des 3 repas par jour.",
  "Eau à volonté.",
  "Légumes (liste autorisée) à volonté, cuits ou crus.",
  "1 fruit par jour, UNIQUEMENT au déjeuner.",
];
