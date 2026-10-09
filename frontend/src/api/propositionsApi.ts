import { instance } from "./axios";
import type { FreelanceProfileData } from "./freelanceApi";

export interface FreelanceInfo {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  title: string;
  ville: string | null;
  technologies: { id: number; name: string }[];
}

export interface Proposition {
  id: number;
  lettre_motivation: string;
  date_livraison: string; // ISO date string
  currentDate: boolean;
  mission: number;
  montant_propose?: number;
  mission_title?: string;
  mission_budget?: number;
  mission_status?: string;
  mission_operateur?: "OM" | "WAVE";
  numero_paiement_confirme?: boolean;
  numero_paiement?: string | null;
  freelance: number;
  freelance_info: FreelanceInfo;
  proposition_status: "PENDING" | "ACCEPTED" | "REJECTED" | "DELIVERED";
  created_at: string;
  updated_at: string;

  has_paiement?: boolean;
  paiement_statut_collecte?: "EN_ATTENTE" | "REUSSI" | "ECHOUE" | null;
  paiement_statut_decaissement?:
    "NON_DECLENCHE" | "EN_ATTENTE" | "REUSSI" | "ECHOUE" | null;
  paiement_montant_brut?: number | null;
  paiement_montant_net?: number | null;
  paiement_date_collecte?: string | null;
  paiement_date_decaissement?: string | null;
}

export type PropositionPayload = {
  lettre_motivation: string;
  mission: number;
} & (
  | { currentDate: true; date_livraison?: never }
  | { currentDate: false; date_livraison: string }
);

export interface CandidateFreelanceProfile extends FreelanceProfileData {
  first_name: string;
  last_name: string;
  profile_picture: string | null;
  ville: string | null;
}

export const getCandidateFreelanceProfile = async (
  propositionId: number
): Promise<CandidateFreelanceProfile> => {
  const response = await instance.get<CandidateFreelanceProfile>(
    `propositions/${propositionId}/profil-freelance/`
  );
  return response.data;
};

export const getPropositions = async (
  missionId?: number
): Promise<Proposition[]> => {
  const url = missionId
    ? `propositions/?mission=${missionId}`
    : "propositions/";
  const response = await instance.get<
    Proposition[] | { results: Proposition[] }
  >(url);
  const data = response.data;
  return Array.isArray(data) ? data : data.results;
};

export const createProposition = async (
  payload: PropositionPayload
): Promise<Proposition> => {
  const response = await instance.post<Proposition>("propositions/", payload);
  return response.data;
};

export const checkUserHasApplied = async (
  missionId: number
): Promise<boolean> => {
  const response = await instance.get<Proposition[]>(
    `propositions/?mission=${missionId}`
  );
  return response.data.length > 0;
};
