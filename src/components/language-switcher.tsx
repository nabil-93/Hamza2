"use client";

import { Globe } from "lucide-react";
import { useI18n } from "@/locales";
import { cn } from "@/lib/utils";

export function LanguageSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-white p-1 shadow-sm">
      <Globe className="ms-2 h-4 w-4 text-muted-foreground" />
      {(["fr", "ar"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-full px-3 py-1 text-xs font-semibold uppercase transition-colors",
            locale === l ? "bg-primary text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l === "fr" ? "FR" : "ع"}
        </button>
      ))}
    </div>
  );
}
