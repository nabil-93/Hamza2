import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * Répartition des macronutriments en pourcentage de l'énergie.
 * Protéines et glucides = 4 kcal/g, lipides = 9 kcal/g.
 */
export function macroPercents(macros: { proteines: number; glucides: number; lipides: number }) {
  const kP = macros.proteines * 4;
  const kG = macros.glucides * 4;
  const kL = macros.lipides * 9;
  const total = Math.max(1, kP + kG + kL);
  return {
    proteines: Math.round((kP / total) * 100),
    glucides: Math.round((kG / total) * 100),
    lipides: Math.round((kL / total) * 100),
    kcal: Math.round(total),
  };
}

/** Fourchettes cibles (réf. EMC, Tableau 3), avec une tolérance d'arrondi. */
export const MACRO_TARGETS = {
  proteines: { min: 11, max: 15 },
  glucides: { min: 50, max: 55 },
  lipides: { min: 35, max: 40 },
} as const;
const MACRO_TOL = 1; // ±1 % pour absorber les arrondis

/** Vrai si la répartition d'un jour respecte les fourchettes EMC (à la tolérance près). */
export function macrosInRange(macros: { proteines: number; glucides: number; lipides: number }): boolean {
  const p = macroPercents(macros);
  const ok = (v: number, t: { min: number; max: number }) => v >= t.min - MACRO_TOL && v <= t.max + MACRO_TOL;
  return (
    ok(p.proteines, MACRO_TARGETS.proteines) &&
    ok(p.glucides, MACRO_TARGETS.glucides) &&
    ok(p.lipides, MACRO_TARGETS.lipides)
  );
}
