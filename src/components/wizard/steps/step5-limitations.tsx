"use client";

import { Controller } from "react-hook-form";
import { useWizard } from "../wizard-context";
import { useI18n, type TranslationKey } from "@/locales";
import { Field } from "../field";
import { Textarea } from "@/components/ui/textarea";
import { CheckboxCard } from "@/components/ui/checkbox-card";
import { LIMITATION_OPTIONS } from "@/lib/constants";

export function Step5Limitations() {
  const { form } = useWizard();
  const { t } = useI18n();
  const { register, control } = form;

  return (
    <div className="space-y-6">
      <div>
        <p className="mb-3 text-sm font-semibold text-foreground">{t("step.5")}</p>
        <Controller
          control={control}
          name="limitations"
          render={({ field }) => (
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
              {LIMITATION_OPTIONS.map((opt) => {
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
        <Textarea {...register("commentaireLimitations")} placeholder="…" />
      </Field>
    </div>
  );
}
