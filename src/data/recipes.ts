/**
 * Bibliothèque de recettes marocaines saines.
 * Sert de référence à l'IA (cuisine méditerranéenne / marocaine adaptée diabète & obésité).
 */

export interface LibraryRecipe {
  nom: string;
  nomAr: string;
  categorie: "plat" | "soupe" | "salade" | "poisson" | "leger";
  description: string;
  caloriesApprox: number; // par portion
  adapteDiabete: boolean;
}

export const MOROCCAN_RECIPES: LibraryRecipe[] = [
  {
    nom: "Tajine de poulet aux légumes",
    nomAr: "طاجين الدجاج بالخضر",
    categorie: "plat",
    description:
      "Poulet mijoté avec courgettes, carottes, haricots verts, peu d'huile d'olive, épices douces.",
    caloriesApprox: 420,
    adapteDiabete: true,
  },
  {
    nom: "Tajine de poisson chermoula",
    nomAr: "طاجين السمك بالشرمولة",
    categorie: "poisson",
    description:
      "Poisson blanc mariné à la chermoula, tomates et poivrons, cuisson douce au tajine.",
    caloriesApprox: 380,
    adapteDiabete: true,
  },
  {
    nom: "Sardines grillées",
    nomAr: "سردين مشوي",
    categorie: "poisson",
    description: "Sardines fraîches grillées, citron, persil. Riche en oméga-3.",
    caloriesApprox: 290,
    adapteDiabete: true,
  },
  {
    nom: "Couscous équilibré aux légumes",
    nomAr: "كسكس متوازن بالخضر",
    categorie: "plat",
    description:
      "Semoule complète, sept légumes, pois chiches, portion de protéine maigre.",
    caloriesApprox: 450,
    adapteDiabete: true,
  },
  {
    nom: "Harira légère",
    nomAr: "حريرة خفيفة",
    categorie: "soupe",
    description:
      "Soupe de lentilles, pois chiches, tomate, peu de matière grasse. Index glycémique modéré.",
    caloriesApprox: 220,
    adapteDiabete: true,
  },
  {
    nom: "Loubia (haricots blancs)",
    nomAr: "لوبيا",
    categorie: "plat",
    description: "Haricots blancs mijotés à la tomate et aux épices, riches en fibres.",
    caloriesApprox: 310,
    adapteDiabete: true,
  },
  {
    nom: "Adass (lentilles)",
    nomAr: "عدس",
    categorie: "plat",
    description: "Lentilles mijotées, oignon, cumin. Excellente source de protéines végétales.",
    caloriesApprox: 280,
    adapteDiabete: true,
  },
  {
    nom: "Taktouka",
    nomAr: "تكتوكة",
    categorie: "salade",
    description: "Poivrons et tomates grillés à l'huile d'olive, ail et épices.",
    caloriesApprox: 150,
    adapteDiabete: true,
  },
  {
    nom: "Zaalouk",
    nomAr: "زعلوك",
    categorie: "salade",
    description: "Caviar d'aubergine à la tomate, ail et coriandre, peu d'huile.",
    caloriesApprox: 140,
    adapteDiabete: true,
  },
  {
    nom: "Salade marocaine",
    nomAr: "سلطة مغربية",
    categorie: "salade",
    description: "Tomate, concombre, oignon, persil, filet d'huile d'olive et citron.",
    caloriesApprox: 90,
    adapteDiabete: true,
  },
  {
    nom: "Soupe de légumes",
    nomAr: "شربة الخضر",
    categorie: "soupe",
    description: "Bouillon de légumes de saison mixés, sans crème, riche en fibres.",
    caloriesApprox: 120,
    adapteDiabete: true,
  },
];
