import { z } from "zod";
import { getTodayDate } from "./missionValidation.ts";

export function getPropositionDateError(
  currentDate: boolean,
  proposedDate: string,
  deadline: string | null | undefined,
  today = getTodayDate()
): string | null {
  const deliveryDate = currentDate ? deadline : proposedDate;
  if (!deliveryDate) return "Veuillez choisir une date de livraison.";
  if (!z.iso.date().safeParse(deliveryDate).success) {
    return "Veuillez saisir une date de livraison valide.";
  }
  if (deliveryDate < today) {
    return "La date de livraison ne peut pas être antérieure à aujourd'hui.";
  }
  if (deadline && deliveryDate > deadline) {
    return "La date de livraison ne peut pas dépasser la date limite de la mission.";
  }
  return null;
}
