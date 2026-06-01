"use client";

import { Controller, useWatch } from "react-hook-form";
import { useWizard } from "../wizard-context";
import { useI18n, type TranslationKey } from "@/locales";
import { Field } from "../field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { Alert } from "@/components/ui/alert";
import { GOAL_OPTIONS, FITNESS_OPTIONS } from "@/lib/constants";
import { computeProjection } from "@/lib/calculations";

export function Step3Goals() {
  const { form } = useWizard();
  const { t } = useI18n();
  const { register, control, formState: { errors } } = form;

  const poidsActuel = useWatch({ control, name: "poidsActuel" });
  const poidsCible = useWatch({ control, name: "poidsCible" });
  const objectif = useWatch({ control, name: "objectif" });

  // Incohérence objectif ↔ poids cible (live, indépendamment du submit).
  let mismatchKey: TranslationKey | null = null;
  if (poidsActuel && poidsCible) {
    if (objectif === "perte_poids" && poidsCible >= poidsActuel)
      mismatchKey = "alert.targetLossInvalid";
    else if (objectif === "prise_poids" && poidsCible <= poidsActuel)
      mismatchKey = "alert.targetGainInvalid";
  }

  const { projection, agressif, variationHebdo, dureeEstimeeMois } =
    poidsActuel && poidsCible && !mismatchKey
      ? computeProjection(poidsActuel, poidsCible, objectif)
      : { projection: [], agressif: false, variationHebdo: 0, dureeEstimeeMois: 0 };

  // L'erreur Zod renvoie une clé i18n : on la traduit si elle existe.
  const cibleError = errors.poidsCible?.message;
  const cibleErrorText = cibleError
    ? t(cibleError as TranslationKey)
    : undefined;

  return (
    <div className="space-y-5">
      <Field label={t("field.objectif")} error={errors.objectif?.message}>
        <Controller
          control={control}
          name="objectif"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onChange={field.onChange}
              columns={3}
              options={GOAL_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as TranslationKey) }))}
            />
          )}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={`${t("field.poidsCible")} (${t("common.kg")})`} error={cibleErrorText}>
          <Input type="number" step="0.1" {...register("poidsCible", { valueAsNumber: true })} error={!!cibleErrorText} />
        </Field>
        <Field label={t("field.niveauSportif")} error={errors.niveauSportif?.message}>
          <Controller
            control={control}
            name="niveauSportif"
            render={({ field }) => (
              <RadioGroup
                value={field.value}
                onChange={field.onChange}
                columns={3}
                options={FITNESS_OPTIONS.map((o) => ({ value: o.value, label: t(o.labelKey as TranslationKey) }))}
              />
            )}
          />
        </Field>
      </div>

      {mismatchKey && (
        <Alert variant="danger" title={t("alert.targetMismatchTitle")}>{t(mismatchKey)}</Alert>
      )}

      {agressif && (
        <Alert variant="warning" title={t("alert.aggressiveTitle")}>{t("projection.noteAggressif")}</Alert>
      )}

      {projection.length > 0 && objectif !== "maintien" && (
        <div className="rounded-lg border border-border bg-muted/30 p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold text-foreground">{t("analysis.projection")}</p>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700">
                {t("projection.duree")}: {dureeEstimeeMois} {t("projection.mois")}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-secondary-50 px-3 py-1 text-xs font-medium text-secondary-700">
                {t("projection.rythme")}: {Math.abs(variationHebdo)} {t("projection.parSemaine")}
              </span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3 text-center">
            {projection.map((p) => (
              <div key={p.mois} className="rounded-md bg-white p-3 shadow-sm">
                <p className="text-xs text-muted-foreground">
                  {p.mois === 0 ? t("dashboard.poidsActuel") : `${p.mois} ${t("projection.mois")}`}
                </p>
                <p className="mt-1 text-lg font-bold text-primary">{p.poids}</p>
                <p className="text-[10px] text-muted-foreground">{t("common.kg")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
