import { instance } from './axios';

export interface MatchingCandidatResult {
  candidat_id: number;
  proposition_id: number;
  freelance_id: number;
  freelance_nom: string;
  freelance_titre: string;
  freelance_picture: string | null;
  lettre_motivation: string;
  date_livraison: string;
  score: number;
  score_technologies: number;
  score_service: number;
  score_experience: number | null;
  justification_ia: string | null;
}

export interface MatchingCandidatsResponse {
  resultats: MatchingCandidatResult[];
  etage_2_reussi: boolean;
}

export interface MatchingMissionResult {
  candidat_id: number;
  mission_id: number;
  mission_title: string;
  mission_description: string;
  mission_budget: number;
  mission_service: string;
  mission_technologies: string[];
  annonceur_nom: string;
  date_deadline: string | null;
  score: number;
  score_technologies: number;
  score_service: number;
  score_experience: number | null;
  justification_ia: string | null;
}

export interface MatchingMissionsResponse {
  resultats: MatchingMissionResult[];
  etage_2_reussi: boolean;
}

export const getCandidatsRecommandes = async (
  missionId: number
): Promise<MatchingCandidatsResponse> => {
  const response = await instance.post<MatchingCandidatsResponse>(
    `matching/candidats-recommandes/${missionId}/`
  );
  return response.data;
};

export const getMissionsRecommandees = async (): Promise<MatchingMissionsResponse> => {
  const response = await instance.post<MatchingMissionsResponse>(
    'matching/missions-recommandees/'
  );
  return response.data;
};
