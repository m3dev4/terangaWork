import { instance } from './axios';

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
  mission: number;
  montant_propose?: number;
  mission_title?: string;
  mission_budget?: number;
  mission_status?: string;
  freelance: number;
  freelance_info: FreelanceInfo;
  proposition_status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'DELIVERED';
  created_at: string;
  updated_at: string;
}

export interface PropositionPayload {
  lettre_motivation: string;
  date_livraison: string; // ISO date string (YYYY-MM-DD)
  mission: number;
}

export const getPropositions = async (missionId?: number): Promise<Proposition[]> => {
  const url = missionId ? `propositions/?mission=${missionId}` : 'propositions/';
  const response = await instance.get<Proposition[] | { results: Proposition[] }>(url);
  const data = response.data;
  return Array.isArray(data) ? data : data.results;
};

export const createProposition = async (
  payload: PropositionPayload
): Promise<Proposition> => {
  const response = await instance.post<Proposition>('propositions/', payload);
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