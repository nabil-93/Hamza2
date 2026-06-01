"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { Locale } from "@/types";
import { fr, type TranslationKey } from "./fr";
import { ar } from "./ar";

const DICTS: Record<Locale, Record<string, string>> = { fr, ar };

interface I18nContextValue {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (l: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("fr");

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    if (typeof document !== "undefined") {
      document.documentElement.lang = l;
      document.documentElement.dir = l === "ar" ? "rtl" : "ltr";
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey) => DICTS[locale][key] ?? DICTS.fr[key] ?? key,
    [locale],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ locale, dir: locale === "ar" ? "rtl" : "ltr", setLocale, t }),
    [locale, setLocale, t],
  );

  return React.createElement(I18nContext.Provider, { value }, children);
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n doit être utilisé dans I18nProvider");
  return ctx;
}

export type { TranslationKey };
