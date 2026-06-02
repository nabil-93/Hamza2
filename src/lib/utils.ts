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
