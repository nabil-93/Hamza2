"use client";

import * as React from "react";
import { Utensils, ChefHat, ShoppingCart, Dumbbell, ClipboardList } from "lucide-react";
import { useI18n } from "@/locales";
import { Tabs } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MacrosChart } from "@/components/charts/macros-chart";
import type { GeneratedProgram } from "@/types";

type TabId = "nutrition" | "recipes" | "shopping" | "sport" | "reco";

interface Props {
  program: GeneratedProgram;
  /** Si fourni, affiche uniquement ces onglets. */
  tabs?: TabId[];
}

const ALL_TABS: TabId[] = ["nutrition", "recipes", "shopping", "sport", "reco"];

export function ProgramResult({ program, tabs: allowedTabs }: Props) {
  const { t } = useI18n();
  const visibleIds = allowedTabs ?? ALL_TABS;
  const [tab, setTab] = React.useState<TabId>(visibleIds[0] ?? "nutrition");

  const allTabs = [
    { id: "nutrition" as TabId, label: t("result.nutrition"), icon: <Utensils className="h-4 w-4" /> },
    { id: "recipes" as TabId, label: t("result.recipes"), icon: <ChefHat className="h-4 w-4" /> },
    { id: "shopping" as TabId, label: t("result.shopping"), icon: <ShoppingCart className="h-4 w-4" /> },
    { id: "sport" as TabId, label: t("result.sport"), icon: <Dumbbell className="h-4 w-4" /> },
    { id: "reco" as TabId, label: t("result.recommendations"), icon: <ClipboardList className="h-4 w-4" /> },
  ].filter((t) => visibleIds.includes(t.id));

  return (
    <div className="space-y-5">
      <Tabs tabs={allTabs} active={tab} onChange={(v) => setTab(v as TabId)} />

      {tab === "nutrition" && <NutritionTab program={program} />}
      {tab === "recipes" && <RecipesTab program={program} />}
      {tab === "shopping" && <ShoppingTab program={program} />}
      {tab === "sport" && <SportTab program={program} />}
      {tab === "reco" && <RecoTab program={program} />}
    </div>
  );
}

function NutritionTab({ program }: Props) {
  const { t } = useI18n();
  const plans = program.nutrition.plans;
  // Macros affichées = moyenne sur tous les jours (1 jour = ce jour-là).
  const macrosMoy = {
    proteines: Math.round(plans.reduce((a, p) => a + p.macros.proteines, 0) / plans.length),
    glucides: Math.round(plans.reduce((a, p) => a + p.macros.glucides, 0) / plans.length),
    lipides: Math.round(plans.reduce((a, p) => a + p.macros.lipides, 0) / plans.length),
  };

  return (
    <div className="space-y-4">
      <p className="rounded-md bg-primary-50 p-4 text-sm text-primary-700">
        {program.nutrition.resumeNutritionnel}
      </p>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {plans.map((plan, d) => (
            <Card key={d}>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base">{plan.jour}</CardTitle>
                <Badge variant="success">
                  {plan.caloriesTotales} {t("common.kcal")}
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                {plan.repas.map((repas, i) => (
                  <div key={i} className="rounded-md border border-border p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <p className="text-sm font-semibold text-foreground">
                        <span className="text-primary">{repas.type}</span> — {repas.nom}
                      </p>
                      <Badge variant="neutral">{repas.calories} {t("common.kcal")}</Badge>
                    </div>
                    <ul className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                      {repas.ingredients.map((ing, j) => (
                        <li key={j} className="flex justify-between gap-2">
                          <span>{ing.nom}</span>
                          <span className="font-medium text-foreground">{ing.quantite}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">
              {t("chart.macros")}
              {plans.length > 1 && <span className="text-xs font-normal text-muted-foreground"> ({t("result.dailyAvg")})</span>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <MacrosChart
              macros={macrosMoy}
              labels={{
                proteines: t("result.proteines"),
                glucides: t("result.glucides"),
                lipides: t("result.lipides"),
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function RecipesTab({ program }: Props) {
  const { t } = useI18n();
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {program.nutrition.recettes.map((r, i) => (
        <Card key={i}>
          <CardHeader>
            <CardTitle className="text-base">{r.nom}</CardTitle>
            <div className="flex flex-wrap gap-2 pt-1">
              <Badge variant="success">{r.calories} {t("common.kcal")}</Badge>
              <Badge variant="neutral">{t("result.cookTime")}: {r.tempsCuisson}</Badge>
              <Badge>P {r.macros.proteines}g · G {r.macros.glucides}g · L {r.macros.lipides}g</Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("result.ingredients")}</p>
              <ul className="space-y-0.5 text-sm">
                {r.ingredients.map((ing, j) => (
                  <li key={j} className="flex justify-between">
                    <span>{ing.nom}</span>
                    <span className="font-medium">{ing.quantite}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{t("result.steps")}</p>
              <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
                {r.etapes.map((e, j) => <li key={j}>{e}</li>)}
              </ol>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ShoppingTab({ program }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {program.nutrition.listeCourses.map((cat, i) => (
        <Card key={i}>
          <CardHeader><CardTitle className="text-base">{cat.categorie}</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-1.5 text-sm">
              {cat.items.map((it, j) => (
                <li key={j} className="flex justify-between border-b border-dashed border-border pb-1">
                  <span>{it.nom}</span>
                  <span className="font-semibold text-secondary">{it.quantite}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SportTab({ program }: Props) {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <p className="rounded-md bg-secondary-50 p-4 text-sm text-secondary-700">{program.sport.resume}</p>
      {program.sport.semaines.map((sem) => (
        <Card key={sem.semaine}>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Semaine {sem.semaine}</CardTitle>
            <Badge>{sem.objectif}</Badge>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {sem.jours.map((jour, i) => (
              <div key={i} className="rounded-md border border-border p-3">
                <p className="text-sm font-semibold text-foreground">{jour.jour} · <span className="text-secondary">{jour.focus}</span></p>
                <p className="mt-1 text-xs text-muted-foreground"><b>Échauffement :</b> {jour.echauffement}</p>
                {jour.cardio && <p className="text-xs text-muted-foreground"><b>Cardio :</b> {jour.cardio}</p>}
                <ul className="mt-2 space-y-1 text-xs">
                  {jour.exercices.map((ex, j) => (
                    <li key={j} className="flex justify-between gap-2">
                      <span>{ex.nom}</span>
                      <span className="font-medium text-foreground">
                        {[ex.series && `${ex.series}×`, ex.repetitions, ex.duree].filter(Boolean).join(" ")}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
      {program.sport.consignesSecurite.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Consignes de sécurité</CardTitle></CardHeader>
          <CardContent>
            <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
              {program.sport.consignesSecurite.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RecoTab({ program }: Props) {
  const { t } = useI18n();
  const a = program.analyse;
  const blocks = [
    { title: t("analysis.profil"), text: a.resumeProfil },
    { title: t("analysis.risques"), text: a.risquesPoids },
    { title: t("analysis.diabete"), text: a.analyseDiabete },
    { title: t("analysis.nutrition"), text: a.analyseNutritionnelle },
    { title: t("analysis.activite"), text: a.analyseActivite },
  ];
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        {blocks.map((b, i) => (
          <Card key={i}>
            <CardHeader><CardTitle className="text-base">{b.title}</CardTitle></CardHeader>
            <CardContent><p className="text-sm leading-relaxed text-muted-foreground">{b.text}</p></CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">{t("analysis.recommandations")}</CardTitle></CardHeader>
        <CardContent>
          <ul className="list-inside list-disc space-y-1.5 text-sm text-muted-foreground">
            {a.recommandationsGenerales.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
