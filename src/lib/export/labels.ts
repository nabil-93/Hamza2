import type { Locale } from "@/types";

/** Libellés statiques des rapports exportés (PDF / DOCX), bilingues. */
export interface ReportLabels {
  coverTitle: string;
  reportTitle: string;
  years: string;
  s1: string;
  s2: string;
  s3: string;
  s4: string;
  s5: string;
  s6: string;
  s7: string;
  s8: string;
  fullName: string;
  age: string;
  sex: string;
  height: string;
  weightCurrentTarget: string;
  bmi: string;
  bmr: string;
  tdee: string;
  targetCalories: string;
  hydration: string;
  weightRisks: string;
  diabetes: string;
  nutrition: string;
  activity: string;
  totalCalories: string;
  ingredients: string;
  preparation: string;
  warmup: string;
  cardio: string;
  series: string;
  week: string;
  signature: string;
  stamp: string;
  doctorPrefix: string;
  reportFooter: string;
  page: string;
}

const FR: ReportLabels = {
  coverTitle: "Rapport Nutritionnel\n& Sportif Personnalisé",
  reportTitle: "Rapport Nutritionnel & Sportif",
  years: "ans",
  s1: "1. Informations patient",
  s2: "2. Analyse corporelle",
  s3: "3. Analyse médicale",
  s4: "4. Programme alimentaire",
  s5: "5. Recettes détaillées",
  s6: "6. Liste de courses",
  s7: "7. Programme sportif",
  s8: "8. Recommandations générales",
  fullName: "Nom complet",
  age: "Âge",
  sex: "Sexe",
  height: "Taille",
  weightCurrentTarget: "Poids actuel / cible",
  bmi: "IMC",
  bmr: "BMR",
  tdee: "TDEE (maintenance)",
  targetCalories: "Calories objectif",
  hydration: "Hydratation",
  weightRisks: "Risques liés au poids",
  diabetes: "Diabète",
  nutrition: "Nutrition",
  activity: "Activité physique",
  totalCalories: "Calories totales",
  ingredients: "Ingrédients",
  preparation: "Préparation",
  warmup: "Échauffement",
  cardio: "Cardio",
  series: "séries",
  week: "Semaine",
  signature: "Signature du médecin",
  stamp: "Cachet",
  doctorPrefix: "Dr.",
  reportFooter: "Rapport médical",
  page: "Page",
};

const AR: ReportLabels = {
  coverTitle: "تقرير التغذية\nوالبرنامج الرياضي المخصص",
  reportTitle: "تقرير التغذية والبرنامج الرياضي",
  years: "سنة",
  s1: "1. معلومات المريض",
  s2: "2. التحليل الجسدي",
  s3: "3. التحليل الطبي",
  s4: "4. البرنامج الغذائي",
  s5: "5. وصفات مفصلة",
  s6: "6. لائحة المشتريات",
  s7: "7. البرنامج الرياضي",
  s8: "8. توصيات عامة",
  fullName: "الاسم الكامل",
  age: "العمر",
  sex: "الجنس",
  height: "الطول",
  weightCurrentTarget: "الوزن الحالي / المستهدف",
  bmi: "مؤشر كتلة الجسم",
  bmr: "الأيض الأساسي",
  tdee: "الحفاظ (TDEE)",
  targetCalories: "السعرات المستهدفة",
  hydration: "الترطيب",
  weightRisks: "المخاطر المرتبطة بالوزن",
  diabetes: "السكري",
  nutrition: "التغذية",
  activity: "النشاط البدني",
  totalCalories: "إجمالي السعرات",
  ingredients: "المكونات",
  preparation: "طريقة التحضير",
  warmup: "الإحماء",
  cardio: "تمارين القلب",
  series: "مجموعات",
  week: "الأسبوع",
  signature: "توقيع الطبيب",
  stamp: "الخاتم",
  doctorPrefix: "د.",
  reportFooter: "تقرير طبي",
  page: "صفحة",
};

export function getReportLabels(locale: Locale): ReportLabels {
  return locale === "ar" ? AR : FR;
}
