"use client";

import Link from "next/link";
import { Stethoscope, ArrowLeft } from "lucide-react";
import { useI18n } from "@/locales";
import { WizardProvider } from "@/components/wizard/wizard-context";
import { Wizard } from "@/components/wizard/wizard";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function GenerateurPage() {
  const { t, dir } = useI18n();
  const BackIcon = ArrowLeft;

  return (
    <WizardProvider>
      <div className="min-h-screen">
        <header className="sticky top-0 z-10 border-b border-border bg-white/85 backdrop-blur-sm no-print">
          <div className="container flex items-center justify-between py-3">
            <Link href="/" className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
              <BackIcon className={`h-4 w-4 ${dir === "rtl" ? "rotate-180" : ""}`} />
              {t("common.back")}
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg medical-gradient text-white">
                <Stethoscope className="h-4 w-4" />
              </div>
              <span className="hidden font-semibold text-foreground sm:inline">HQ</span>
            </div>
            <LanguageSwitcher />
          </div>
        </header>

        <main className="container py-8">
          <div className="mx-auto max-w-5xl">
            <Wizard />
          </div>
        </main>
      </div>
    </WizardProvider>
  );
}
