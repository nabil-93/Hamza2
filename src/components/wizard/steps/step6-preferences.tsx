"use client";

import { Controller } from "react-hook-form";
import { Moon } from "lucide-react";
import { useWizard } from "../wizard-context";
import { useI18n } from "@/locales";
import { MultiSelect } from "@/components/ui/multi-select";
import { ImageUpload } from "@/components/ui/image-upload";
import { Field } from "../field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FOOD_DATABASE } from "@/data/foods";
import { cn } from "@/lib/utils";

export function Step6Preferences() {
  const { form } = useWizard();
  const { t, locale } = useI18n();
  const { control, register } = form;

  return (
    <div className="space-y-6">
      {FOOD_DATABASE.map((cat) => (
        <div key={cat.key}>
          <p className="mb-2 text-sm font-semibold text-foreground">
            {locale === "ar" ? cat.labelAr : cat.labelFr}
          </p>
          <Controller
            control={control}
            name={`preferences.${cat.key}` as const}
            render={({ field }) => (
              <MultiSelect
                options={cat.items.map((i) => (locale === "ar" ? i.ar : i.fr))}
                selected={field.value ?? []}
                onChange={field.onChange}
                placeholder={t("common.search")}
                selectedLabel={t("common.selected")}
                addLabel={t("food.add")}
              />
            )}
          />
        </div>
      ))}

      {/* Commentaire libre : autres aliments, allergies, intolérances */}
      <Field label={t("food.commentLabel")} optional={t("common.optional")} hint={t("food.commentHint")}>
        <Textarea {...register("preferences.commentaire")} placeholder={t("food.notListed")} />
      </Field>

      <Controller
        control={control}
        name="modeRamadan"
        render={({ field }) => (
          <button
            type="button"
            onClick={() => field.onChange(!field.value)}
            className={cn(
              "flex w-full items-center gap-4 rounded-lg border p-4 text-start transition-all",
              field.value
                ? "border-primary bg-primary-50 ring-1 ring-primary"
                : "border-border bg-white hover:bg-muted",
            )}
          >
            <div
              className={cn(
                "flex h-11 w-11 items-center justify-center rounded-lg",
                field.value ? "bg-primary text-white" : "bg-muted text-muted-foreground",
              )}
            >
              <Moon className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{t("ramadan.label")}</p>
              <p className="text-xs text-muted-foreground">{t("ramadan.hint")}</p>
            </div>
            <span
              className={cn(
                "relative h-6 w-11 rounded-full transition-colors",
                field.value ? "bg-primary" : "bg-muted-foreground/30",
              )}
            >
              <span
                className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
                  field.value ? "start-[1.375rem]" : "start-0.5",
                )}
              />
            </span>
          </button>
        )}
      />

      <div className="rounded-lg border border-border bg-muted/30 p-4">
        <p className="mb-4 text-sm font-semibold text-foreground">{t("branding.title")}</p>
        <div className="mb-4 grid gap-4 sm:grid-cols-2">
          <Field label={t("field.nomCabinet")} optional={t("common.optional")}>
            <Input {...register("branding.nomCabinet")} />
          </Field>
          <Field label={t("field.nomMedecin")} optional={t("common.optional")}>
            <Input {...register("branding.nomMedecin")} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Controller
            control={control}
            name="branding.logo"
            render={({ field }) => (
              <ImageUpload label={t("branding.logo")} value={field.value} onChange={field.onChange} uploadLabel={t("branding.upload")} />
            )}
          />
          <Controller
            control={control}
            name="branding.signature"
            render={({ field }) => (
              <ImageUpload label={t("branding.signature")} value={field.value} onChange={field.onChange} uploadLabel={t("branding.upload")} />
            )}
          />
          <Controller
            control={control}
            name="branding.cachet"
            render={({ field }) => (
              <ImageUpload label={t("branding.cachet")} value={field.value} onChange={field.onChange} uploadLabel={t("branding.upload")} />
            )}
          />
        </div>
      </div>
    </div>
  );
}
