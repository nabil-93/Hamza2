"use client";

import Link from "next/link";
import {
  Stethoscope,
  Salad,
  Dumbbell,
  ShoppingCart,
  FileText,
  Languages,
  ArrowRight,
  HeartPulse,
} from "lucide-react";
import { useI18n } from "@/locales";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/components/language-switcher";

export default function HomePage() {
  const { t } = useI18n();

  const features = [
    { icon: <Salad className="h-6 w-6" />, title: t("result.nutrition"), desc: "Régime méditerranéen & cuisine marocaine adaptée." },
    { icon: <Dumbbell className="h-6 w-6" />, title: t("result.sport"), desc: "Programme 4 semaines selon pathologies & limitations." },
    { icon: <ShoppingCart className="h-6 w-6" />, title: t("result.shopping"), desc: "Liste hebdomadaire regroupée par catégorie." },
    { icon: <FileText className="h-6 w-6" />, title: t("export.title"), desc: "Rapport professionnel exportable en PDF & Word." },
    { icon: <HeartPulse className="h-6 w-6" />, title: t("analysis.title"), desc: "Analyse diabète, IMC, risques & recommandations." },
    { icon: <Languages className="h-6 w-6" />, title: t("app.langLabel"), desc: "Interface Français / Arabe avec support RTL complet." },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-border bg-white/80 backdrop-blur-sm">
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg medical-gradient text-white">
              <Stethoscope className="h-5 w-5" />
            </div>
            <span className="font-semibold text-foreground">NutriMed</span>
          </div>
          <LanguageSwitcher />
        </div>
      </header>

      <section className="container py-16 text-center md:py-24">
        <div className="mx-auto max-w-3xl space-y-6">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary-100 bg-primary-50 px-4 py-1.5 text-sm font-medium text-primary-700">
            <HeartPulse className="h-4 w-4" />
            {t("app.subtitle")}
          </span>
          <h1 className="text-3xl font-bold leading-tight text-foreground md:text-5xl">
            {t("app.title")}
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-muted-foreground">
            {t("generate.intro")}
          </p>
          <div className="flex justify-center pt-2">
            <Link href="/generateur">
              <Button size="lg" className="text-base">
                {t("app.cta")}
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="container pb-24">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <div
              key={i}
              className="rounded-lg border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary-50 text-primary">
                {f.icon}
              </div>
              <h3 className="mb-1 font-semibold text-foreground">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border bg-white py-6">
        <div className="container text-center text-sm text-muted-foreground">
          NutriMed — {t("app.subtitle")}
        </div>
      </footer>
    </div>
  );
}
