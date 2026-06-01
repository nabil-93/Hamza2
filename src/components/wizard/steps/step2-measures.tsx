"use client";

import { Controller } from "react-hook-form";
import { useWizard } from "../wizard-context";
import { useI18n } from "@/locales";
import { Field } from "../field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";
import { ACTIVITY_OPTIONS } from "@/lib/constants";
import type { TranslationKey } from "@/locales";

export function Step2Measures() {
  const { form } = useWizard();
  const { t } = useI18n();
  const { register, control, formState: { errors } } = form;

  return (
    <div className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label={`${t("field.taille")} (${t("common.cm")})`} error={errors.taille?.message}>
          <Input type="number" step="0.5" {...register("taille", { valueAsNumber: true })} error={!!errors.taille} />
        </Field>
        <Field label={`${t("field.poidsActuel")} (${t("common.kg")})`} error={errors.poidsActuel?.message}>
          <Input type="number" step="0.1" {...register("poidsActuel", { valueAsNumber: true })} error={!!errors.poidsActuel} />
        </Field>
      </div>
      <Field label={t("field.niveauActivite")} error={errors.niveauActivite?.message}>
        <Controller
          control={control}
          name="niveauActivite"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onChange={field.onChange}
              columns={2}
              options={ACTIVITY_OPTIONS.map((o) => ({
                value: o.value,
                label: t(o.labelKey as TranslationKey),
              }))}
            />
          )}
        />
      </Field>
    </div>
  );
}
