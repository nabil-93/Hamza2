/** Base d'aliments locale pour le multi-sélecteur de préférences. */

export interface FoodItem {
  fr: string;
  ar: string;
}

export interface FoodCategory {
  key: "legumes" | "fruits" | "proteines" | "feculents";
  labelFr: string;
  labelAr: string;
  items: FoodItem[];
}

export const FOOD_DATABASE: FoodCategory[] = [
  {
    key: "legumes",
    labelFr: "Légumes",
    labelAr: "خضروات",
    items: [
      { fr: "Tomate", ar: "طماطم" },
      { fr: "Concombre", ar: "خيار" },
      { fr: "Carotte", ar: "جزر" },
      { fr: "Courgette", ar: "كوسة" },
      { fr: "Aubergine", ar: "باذنجان" },
      { fr: "Brocoli", ar: "بروكلي" },
      { fr: "Épinard", ar: "سبانخ" },
      { fr: "Laitue", ar: "خس" },
      { fr: "Chou-fleur", ar: "قرنبيط" },
      { fr: "Haricots verts", ar: "لوبيا خضراء" },
      { fr: "Poivron", ar: "فلفل" },
      { fr: "Oignon", ar: "بصل" },
      { fr: "Navet", ar: "لفت" },
      { fr: "Betterave", ar: "شمندر" },
      { fr: "Fenouil", ar: "بسباس" },
    ],
  },
  {
    key: "fruits",
    labelFr: "Fruits",
    labelAr: "فواكه",
    items: [
      { fr: "Pomme", ar: "تفاح" },
      { fr: "Orange", ar: "برتقال" },
      { fr: "Banane", ar: "موز" },
      { fr: "Poire", ar: "إجاص" },
      { fr: "Kiwi", ar: "كيوي" },
      { fr: "Fraise", ar: "فراولة" },
      { fr: "Pêche", ar: "خوخ" },
      { fr: "Abricot", ar: "مشمش" },
      { fr: "Pastèque", ar: "دلاح" },
      { fr: "Melon", ar: "شمام" },
      { fr: "Prune", ar: "برقوق" },
      { fr: "Mandarine", ar: "يوسفي" },
    ],
  },
  {
    key: "proteines",
    labelFr: "Protéines",
    labelAr: "بروتينات",
    items: [
      { fr: "Poulet", ar: "دجاج" },
      { fr: "Dinde", ar: "ديك رومي" },
      { fr: "Sardine", ar: "سردين" },
      { fr: "Thon", ar: "تونة" },
      { fr: "Merlan", ar: "مرلان" },
      { fr: "Saumon", ar: "سلمون" },
      { fr: "Maquereau", ar: "ماكريل" },
      { fr: "Œufs", ar: "بيض" },
      { fr: "Viande rouge maigre", ar: "لحم أحمر قليل الدهن" },
      { fr: "Lentilles", ar: "عدس" },
      { fr: "Pois chiches", ar: "حمص" },
      { fr: "Haricots blancs", ar: "لوبيا بيضاء" },
    ],
  },
  {
    key: "feculents",
    labelFr: "Féculents",
    labelAr: "نشويات",
    items: [
      { fr: "Riz complet", ar: "أرز كامل" },
      { fr: "Riz blanc", ar: "أرز أبيض" },
      { fr: "Pâtes complètes", ar: "معكرونة كاملة" },
      { fr: "Pâtes classiques", ar: "معكرونة عادية" },
      { fr: "Pain complet", ar: "خبز كامل" },
      { fr: "Pain d'orge", ar: "خبز الشعير" },
      { fr: "Flocons d'avoine", ar: "شوفان" },
      { fr: "Quinoa", ar: "كينوا" },
      { fr: "Patate douce", ar: "بطاطا حلوة" },
      { fr: "Pomme de terre", ar: "بطاطس" },
    ],
  },
];
