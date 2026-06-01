"use client";

import { Controller } from "react-hook-form";
import { useWizard } from "../wizard-context";
import { useI18n } from "@/locales";
import { Field } from "../field";
import { Input } from "@/components/ui/input";
import { RadioGroup } from "@/components/ui/radio-group";

export function Step1Info() {
  const { form } = useWizard();
  const { t } = useI18n();
  const { register, control, formState: { errors } } = form;

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label={t("field.nom")} error={errors.nom?.message}>
        <Input {...register("nom")} placeholder={t("field.nom")} error={!!errors.nom} />
      </Field>
      <Field label={t("field.prenom")} error={errors.prenom?.message}>
        <Input {...register("prenom")} placeholder={t("field.prenom")} error={!!errors.prenom} />
      </Field>
      <Field label={t("field.dateNaissance")} error={errors.dateNaissance?.message}>
        <Input type="date" {...register("dateNaissance")} error={!!errors.dateNaissance} />
      </Field>
      <Field label={t("field.sexe")} error={errors.sexe?.message}>
        <Controller
          control={control}
          name="sexe"
          render={({ field }) => (
            <RadioGroup
              value={field.value}
              onChange={field.onChange}
              options={[
                { value: "homme", label: t("sex.homme") },
                { value: "femme", label: t("sex.femme") },
              ]}
            />
          )}
        />
      </Field>
    </div>
  );
}
