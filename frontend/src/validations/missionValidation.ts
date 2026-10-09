import { z } from "zod";

export const MIN_MISSION_BUDGET = 10000;

// Use the user's local calendar day, rather than a UTC date that may differ.
export const getTodayDate = () => {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
};

export const MissionTitleValidation = z
  .string()
  .trim()
  .min(1, "Le titre est obligatoire.")
  .max(100, "Le titre ne doit pas dépasser 100 caractères.");

export const MissionValidation = z.object({
  title: MissionTitleValidation,
  description: z
    .string()
    .trim()
    .min(1, "La description est obligatoire.")
    .max(1000, "La description ne doit pas dépasser 1000 caractères."),
  date_deadline: z.iso
    .date("Veuillez saisir une date limite valide.")
    .refine((value) => value >= getTodayDate(), {
      message: "La date limite ne peut pas être antérieure à aujourd'hui.",
    }),
  budget: z
    .number("Veuillez saisir un budget valide.")
    .int("Le budget doit être un nombre entier en FCFA.")
    .min(MIN_MISSION_BUDGET, "Le budget minimum est de 10 000 FCFA.")
    .max(2147483647, "Le budget dépasse le montant maximal autorisé."),
  service: z.number().int().positive("Veuillez sélectionner un service."),
  technologies: z.array(z.number().int().positive()).default([]),
  operateurMobileMoney: z.enum(["WAVE", "OM"], {
    error: "Veuillez sélectionner un mode de paiement valide.",
  }),
});

export type MissionFormErrors = Partial<
  Record<keyof z.infer<typeof MissionValidation>, string>
>;
