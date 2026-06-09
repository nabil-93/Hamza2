import { z } from "zod";

/** Schéma Zod du formulaire patient, aligné sur src/types/patient.ts. */

export const sexSchema = z.enum(["homme", "femme"]);
export const activitySchema = z.enum([
  "sedentaire",
  "faiblement_actif",
  "moderement_actif",
  "tres_actif",
]);
export const goalSchema = z.enum(["perte_poids", "maintien", "prise_poids"]);
export const fitnessSchema = z.enum(["debutant", "intermediaire", "avance"]);

export const pathologySchema = z.enum([
  "diabete_type_1",
  "diabete_type_2",
  "prediabete",
  "hypertension",
  "dyslipidemie",
  "maladie_cardiovasculaire",
  "hypothyroidie",
  "syndrome_metabolique",
  "autre",
]);

export const limitationSchema = z.enum([
  "douleur_genou",
  "douleur_hanche",
  "douleur_epaule",
  "douleur_dos",
  "douleur_cervicale",
  "essoufflement",
  "asthme",
  "arthrose",
  "hernie_discale",
  "autre",
]);

const optionalNumber = z
  .union([z.number(), z.nan()])
  .optional()
  .transform((v) => (typeof v === "number" && !Number.isNaN(v) ? v : undefined));

export const patientFormSchema = z.object({
  nom: z.string().min(1, "Le nom est requis"),
  prenom: z.string().min(1, "Le prénom est requis"),
  dateNaissance: z
    .string()
    .min(1, "La date de naissance est requise")
    .refine((d) => {
      const date = new Date(d);
      return !Number.isNaN(date.getTime()) && date < new Date();
    }, "Date de naissance invalide"),
  sexe: sexSchema,

  taille: z
    .number({ invalid_type_error: "La taille est requise" })
    .min(80, "Taille trop faible")
    .max(250, "Taille trop élevée"),
  poidsActuel: z
    .number({ invalid_type_error: "Le poids est requis" })
    .min(25, "Poids trop faible")
    .max(400, "Poids trop élevé"),
  niveauActivite: activitySchema,

  poidsCible: z
    .number({ invalid_type_error: "Le poids cible est requis" })
    .min(25, "Poids cible trop faible")
    .max(400, "Poids cible trop élevé"),
  objectif: goalSchema,
  niveauSportif: fitnessSchema,

  pathologies: z.array(pathologySchema).default([]),
  commentairePathologies: z.string().optional(),
  diabete: z.object({
    hba1c: optionalNumber,
    glycemieJeun: optionalNumber,
    glycemiePostPrandiale: optionalNumber,
  }),

  limitations: z.array(limitationSchema).default([]),
  commentaireLimitations: z.string().optional(),

  preferences: z.object({
    /** Texte libre : aliments aimés, habitudes, préférences culinaires. */
    commentaire: z.string().optional(),
    /** Texte libre : aliments interdits, allergies, intolérances. */
    alimentsInterdits: z.string().optional(),
  }),
  modeRamadan: z.boolean().default(false),

  branding: z.object({
    logo: z.string().optional(),
    signature: z.string().optional(),
    cachet: z.string().optional(),
    nomCabinet: z.string().optional(),
    nomMedecin: z.string().optional(),
  }),
}).superRefine((data, ctx) => {
  // Cohérence objectif ↔ poids cible (clés de message i18n).
  if (data.objectif === "perte_poids" && data.poidsCible >= data.poidsActuel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["poidsCible"],
      message: "alert.targetLossInvalid",
    });
  }
  if (data.objectif === "prise_poids" && data.poidsCible <= data.poidsActuel) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["poidsCible"],
      message: "alert.targetGainInvalid",
    });
  }
});

export type PatientFormSchema = z.infer<typeof patientFormSchema>;

/** Champs requis par étape — utilisé pour la validation pas-à-pas du wizard. */
export const STEP_FIELDS: Record<number, (keyof PatientFormSchema)[]> = {
  1: ["nom", "prenom", "dateNaissance", "sexe"],
  2: ["taille", "poidsActuel", "niveauActivite"],
  3: ["poidsCible", "objectif", "niveauSportif"],
  4: ["pathologies", "diabete"],
  5: ["limitations"],
  6: ["preferences", "modeRamadan"],
  7: [],
  8: [],
};
