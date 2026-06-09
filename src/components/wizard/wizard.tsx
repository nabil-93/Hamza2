"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useWizard } from "./wizard-context";
import { useI18n } from "@/locales";
import { Stepper } from "./stepper";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { STEP_FIELDS, type PatientFormSchema } from "@/lib/schema";
import { TOTAL_STEPS } from "@/lib/constants";
import { cn } from "@/lib/utils";

import { Step1Info } from "./steps/step1-info";
import { Step2Measures } from "./steps/step2-measures";
import { Step3Goals } from "./steps/step3-goals";
import { Step4Medical } from "./steps/step4-medical";
import { Step5Limitations } from "./steps/step5-limitations";
import { Step6Preferences } from "./steps/step6-preferences";
import { Step7Review } from "./steps/step7-review";
import { Step8Generate } from "./steps/step8-generate";

export function Wizard() {
  const { step, next, prev, form, program, isGeneratingNutrition, isGeneratingSport } = useWizard();
  const isGenerating = isGeneratingNutrition || isGeneratingSport;
  const { t, dir } = useI18n();
  const [showBanner, setShowBanner] = React.useState(false);

  // Le bandeau d'erreur se masque dès qu'on change d'étape.
  React.useEffect(() => setShowBanner(false), [step]);

  const handleNext = async () => {
    const fields = STEP_FIELDS[step] as (keyof PatientFormSchema)[];
    const valid = fields.length === 0 ? true : await form.trigger(fields);
    if (valid) {
      setShowBanner(false);
      next();
      return;
    }
    // Validation échouée : bandeau + focus + scroll vers le premier champ en erreur.
    setShowBanner(true);
    const firstError = fields.find((f) => form.formState.errors[f]);
    if (firstError) {
      form.setFocus(firstError);
      if (typeof document !== "undefined") {
        const el = document.querySelector(`[name="${firstError}"]`);
        el?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  };

  const PrevIcon = dir === "rtl" ? ChevronRight : ChevronLeft;
  const NextIcon = dir === "rtl" ? ChevronLeft : ChevronRight;

  // Toutes les étapes exploitent la pleine largeur du conteneur (alignées sur le
  // stepper). Les formulaires répartissent leurs champs sur plusieurs colonnes
  // pour rester lisibles sans laisser de grands vides latéraux.
  const widthClass = "w-full max-w-full";

  return (
    <div className="space-y-6">
      <div className={widthClass}>
        <Stepper />
      </div>

      {showBanner && (
        <div className={widthClass}>
          <Alert variant="danger" title={t("alert.aggressiveTitle")}>
            {t("validation.incomplete")}
          </Alert>
        </div>
      )}

      <Card className={widthClass}>
        <CardContent className="p-6 animate-fade-in lg:p-8">
          {/* Étapes 1-7 : contenu centré pour des champs lisibles ; étape 8 pleine largeur. */}
          <div className={step === 8 ? "" : "mx-auto w-full max-w-6xl"}>
            {step === 1 && <Step1Info />}
            {step === 2 && <Step2Measures />}
            {step === 3 && <Step3Goals />}
            {step === 4 && <Step4Medical />}
            {step === 5 && <Step5Limitations />}
            {step === 6 && <Step6Preferences />}
            {step === 7 && <Step7Review />}
            {step === 8 && <Step8Generate />}
          </div>
        </CardContent>
      </Card>

      {/* Navigation — masquée une fois le programme généré */}
      {!(step === 8 && program) && (
        <div className={cn("flex items-center justify-between no-print", widthClass)}>
          <Button variant="outline" onClick={prev} disabled={step === 1 || isGenerating}>
            <PrevIcon className="h-4 w-4" />
            {t("common.previous")}
          </Button>

          {step < TOTAL_STEPS && (
            <Button onClick={handleNext}>
              {t("common.next")}
              <NextIcon className="h-4 w-4" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
