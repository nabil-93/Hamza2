import type { Locale } from "@/types";

/** Identifiants des sections du rapport (ordre d'apparition). */
export type SectionKey =
  | "patient"
  | "corporelle"
  | "medicale"
  | "alimentaire"
  | "recettes"
  | "courses"
  | "sportif"
  | "recommandations"
  | "signature";

/**
 * Ordre canonique des sections dans le rapport.
 * « recettes » et « courses » sont volontairement exclus : ils ne figurent ni
 * dans les cases à cocher ni dans le document exporté.
 */
export const SECTION_ORDER: SectionKey[] = [
  "patient",
  "corporelle",
  "medicale",
  "alimentaire",
  "sportif",
  "recommandations",
  "signature",
];

/** Sections cochées par défaut. Recettes/courses désactivées (non exportées). */
export function defaultSections(): Record<SectionKey, boolean> {
  return {
    patient: true,
    corporelle: true,
    medicale: true,
    alimentaire: true,
    recettes: false,
    courses: false,
    sportif: true,
    recommandations: true,
    signature: true,
  };
}

/** Titres des sections (sans numéro), bilingues. */
const TITLES: Record<Locale, Record<SectionKey, string>> = {
  fr: {
    patient: "Informations patient",
    corporelle: "Analyse corporelle",
    medicale: "Analyse médicale",
    alimentaire: "Programme alimentaire",
    recettes: "Recettes détaillées",
    courses: "Liste de courses",
    sportif: "Programme sportif",
    recommandations: "Recommandations générales",
    signature: "Signature du professionnel",
  },
  ar: {
    patient: "معلومات المريض",
    corporelle: "التحليل الجسدي",
    medicale: "التحليل الطبي",
    alimentaire: "البرنامج الغذائي",
    recettes: "وصفات مفصلة",
    courses: "لائحة المشتريات",
    sportif: "البرنامج الرياضي",
    recommandations: "توصيات عامة",
    signature: "توقيع المختص",
  },
};

export function sectionTitle(key: SectionKey, locale: Locale): string {
  return TITLES[locale][key];
}

/**
 * Construit la liste ORDONNÉE et NUMÉROTÉE des sections actives.
 * La numérotation est continue (1, 2, 3…) sans trou, même si des
 * sections intermédiaires sont décochées.
 */
export interface ResolvedSection {
  key: SectionKey;
  /** Numéro affiché (1-based), continu. */
  num: number;
  /** Titre numéroté, ex: "3. Programme alimentaire". */
  title: string;
}

export function resolveSections(
  enabled: Record<SectionKey, boolean>,
  locale: Locale,
): ResolvedSection[] {
  let num = 0;
  return SECTION_ORDER.filter((k) => enabled[k]).map((key) => {
    num += 1;
    return { key, num, title: `${num}. ${sectionTitle(key, locale)}` };
  });
}

/** Vrai si la section est active (helper de lisibilité). */
export function has(enabled: Record<SectionKey, boolean>, key: SectionKey): boolean {
  return !!enabled[key];
}
