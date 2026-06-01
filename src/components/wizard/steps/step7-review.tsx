"use client";

import {
  Calendar,
  Activity,
  Flame,
  Droplet,
  Scale,
  Target,
  HeartPulse,
  Salad,
  Dumbbell,
  ShieldAlert,
} from "lucide-react";
import { useWizard } from "../wizard-context";
import { useI18n, type TranslationKey } from "@/locales";
import { StatCard } from "@/components/dashboard/stat-card";
import { AnalysisCard } from "@/components/dashboard/analysis-card";
import { WeightProjectionChart } from "@/components/charts/weight-projection-chart";
import { BmiGauge } from "@/components/charts/bmi-gauge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { formatNumber } from "@/lib/utils";

export function Step7Review() {
  const { calc, form } = useWizard();
  const { t } = useI18n();
  const values = form.getValues();

  if (!calc) return null;

  const bmiCat = t(`bmi.${calc.imcCategorie}` as TranslationKey);
  const hasDiabete = values.pathologies.some((p) => p.startsWith("diabete") || p === "prediabete");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-foreground">{t("review.title")}</h3>
        <p className="text-sm text-muted-foreground">{t("review.subtitle")}</p>
      </div>

      {/* Cartes de stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label={t("dashboard.age")} value={String(calc.age)} unit={t("dashboard.years")} icon={<Calendar className="h-5 w-5" />} accent="neutral" />
        <StatCard label={t("dashboard.imc")} value={formatNumber(calc.imc, 1)} icon={<Scale className="h-5 w-5" />} accent="primary" />
        <StatCard label={t("dashboard.bmr")} value={formatNumber(calc.bmr)} unit={t("common.kcal")} icon={<Flame className="h-5 w-5" />} accent="amber" />
        <StatCard label={t("dashboard.tdee")} value={formatNumber(calc.tdee)} unit={t("common.kcal")} icon={<Activity className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t("dashboard.calories")} value={formatNumber(calc.caloriesObjectif)} unit={t("common.kcal")} icon={<Target className="h-5 w-5" />} accent="primary" />
        <StatCard label={t("dashboard.eau")} value={formatNumber(calc.besoinHydrique, 1)} unit={t("dashboard.litres")} icon={<Droplet className="h-5 w-5" />} accent="secondary" />
        <StatCard label={t("dashboard.poidsActuel")} value={formatNumber(values.poidsActuel, 1)} unit={t("common.kg")} icon={<Scale className="h-5 w-5" />} accent="neutral" />
        <StatCard label={t("dashboard.poidsCible")} value={formatNumber(values.poidsCible, 1)} unit={t("common.kg")} icon={<Target className="h-5 w-5" />} accent="secondary" />
      </div>

      {calc.objectifAgressif && (
        <Alert variant="danger" title={t("alert.aggressiveTitle")}>{t("alert.aggressive")}</Alert>
      )}

      {/* Graphiques */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">{t("chart.projection")}</CardTitle></CardHeader>
          <CardContent>
            <WeightProjectionChart data={calc.projection} poidsCible={values.poidsCible} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">{t("dashboard.imcCategorie")}</CardTitle></CardHeader>
          <CardContent className="flex h-[260px] flex-col justify-center">
            <BmiGauge imc={calc.imc} category={bmiCat} />
          </CardContent>
        </Card>
      </div>

      {/* Cartes d'analyse */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnalysisCard
          icon={<Scale className="h-5 w-5" />}
          title={t("analysis.risques")}
          metric={[
            { label: t("dashboard.imc"), value: `${formatNumber(calc.imc, 1)}` },
            { label: t("dashboard.imcCategorie"), value: bmiCat },
          ]}
        >
          {analysisRisque(calc.imcCategorie)}
        </AnalysisCard>

        <AnalysisCard
          icon={<HeartPulse className="h-5 w-5" />}
          title={t("analysis.diabete")}
          metric={[
            { label: "HbA1c", value: values.diabete.hba1c ? `${values.diabete.hba1c}%` : "—" },
            { label: t("field.glycemieJeun").split(" (")[0], value: values.diabete.glycemieJeun ? `${values.diabete.glycemieJeun}` : "—" },
          ]}
        >
          {hasDiabete
            ? "Profil avec atteinte glycémique : le programme privilégiera un index glycémique bas et une répartition régulière des glucides."
            : "Aucune pathologie diabétique sélectionnée. Surveillance préventive recommandée selon les facteurs de risque."}
        </AnalysisCard>

        <AnalysisCard
          icon={<Salad className="h-5 w-5" />}
          title={t("analysis.nutrition")}
          metric={[
            { label: t("dashboard.calories"), value: `${formatNumber(calc.caloriesObjectif)} kcal` },
            { label: t("dashboard.eau"), value: `${formatNumber(calc.besoinHydrique, 1)} L` },
          ]}
        >
          Régime méditerranéen adapté à la cuisine marocaine, ciblé sur {formatNumber(calc.caloriesObjectif)} kcal/jour.
        </AnalysisCard>

        <AnalysisCard
          icon={<Dumbbell className="h-5 w-5" />}
          title={t("analysis.activite")}
          metric={[{ label: t("field.niveauSportif"), value: t(`fitness.${values.niveauSportif}` as TranslationKey) }]}
        >
          Programme sur 4 semaines adapté au niveau {t(`fitness.${values.niveauSportif}` as TranslationKey).toLowerCase()}
          {values.limitations.length > 0 ? ", avec adaptation des exercices selon les limitations déclarées." : "."}
        </AnalysisCard>

        <AnalysisCard
          icon={<Target className="h-5 w-5" />}
          title={t("analysis.projection")}
          metric={[
            { label: "6 mois", value: `${calc.projection[calc.projection.length - 1]?.poids} kg` },
            { label: "Rythme/sem", value: `${Math.abs(calc.variationHebdo)} kg` },
          ]}
        >
          Objectif atteint de façon progressive et sécurisée, sans perte hebdomadaire excessive.
        </AnalysisCard>

        <AnalysisCard
          icon={<ShieldAlert className="h-5 w-5" />}
          title={t("analysis.profil")}
          metric={[{ label: "Pathologies", value: String(values.pathologies.length) }, { label: "Limitations", value: String(values.limitations.length) }]}
        >
          {values.prenom} {values.nom}, {calc.age} ans. Profil pris en compte intégralement par le moteur IA.
        </AnalysisCard>
      </div>
    </div>
  );
}

function analysisRisque(cat: string): string {
  switch (cat) {
    case "insuffisance_ponderale":
      return "Insuffisance pondérale : surveiller les apports énergétiques et la masse maigre.";
    case "normal":
      return "Corpulence normale : objectif de stabilisation et d'optimisation de la composition corporelle.";
    case "surpoids":
      return "Surpoids : risque cardiométabolique modéré, perte de poids progressive bénéfique.";
    case "obesite_1":
      return "Obésité modérée : risque accru de diabète et d'hypertension, prise en charge nutritionnelle prioritaire.";
    case "obesite_2":
      return "Obésité sévère : risque cardiovasculaire élevé, suivi médical rapproché recommandé.";
    default:
      return "Obésité morbide : risque majeur, approche pluridisciplinaire et suivi médical étroit indispensables.";
  }
}
