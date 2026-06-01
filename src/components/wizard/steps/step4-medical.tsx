"use client";

import { Controller } from "react-hook-form";
import { useWizard } from "../wizard-context";
import { useI18n, type TranslationKey } from "@/locales";
import { Field } from "../field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxCard } from "@/components/ui/checkbox-card";
import { PATHOLOGY_OPTIONS } from "@/lib/constants";

export function Step4Medical() {
  const { form } = useWizard();
  const { t } = useI18n();
  const { register, control } = form;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">{t("step.4")}</p>
        <Controller
          control={control}
          name="pathologies"
          render={({ field }) => (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {PATHOLOGY_OPTIONS.map((opt) => {
                const checked = field.value?.includes(opt.value) ?? false;
                return (
                  <CheckboxCard
                    key={opt.value}
                    label={t(opt.labelKey as TranslationKey)}
                    checked={checked}
                    onCheckedChange={(c) =>
                      field.onChange(
                        c
                          ? [...(field.value ?? []), opt.value]
                          : (field.value ?? []).filter((v: string) => v !== opt.value),
                      )
                    }
                  />
                );
              })}
            </div>
          )}
        />
      </div>

      <Field label={t("field.commentaire")} optional={t("common.optional")}>
        <Textarea {...register("commentairePathologies")} placeholder="…" />
      </Field>

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-4 text-sm font-semibold text-foreground">Données diabétiques</p>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label={t("field.hba1c")} optional={t("common.optional")}>
            <Input type="number" step="0.1" {...register("diabete.hba1c", { valueAsNumber: true })} />
          </Field>
          <Field label={t("field.glycemieJeun")} optional={t("common.optional")}>
            <Input type="number" step="0.01" {...register("diabete.glycemieJeun", { valueAsNumber: true })} />
          </Field>
          <Field label={t("field.glycemiePostPrandiale")} optional={t("common.optional")}>
            <Input type="number" step="0.01" {...register("diabete.glycemiePostPrandiale", { valueAsNumber: true })} />
          </Field>
        </div>
      </div>
    </div>
  );
}
