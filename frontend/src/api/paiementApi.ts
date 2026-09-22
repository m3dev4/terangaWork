import { instance } from './axios';

export interface NumeroPaiement {
  id: number;
  freelance: number;
  operateur: 'OM' | 'WAVE';
  numero: string;
  date_confirmation: string;
}

export interface Paiement {
  id: number;
  proposition: number;
  mission_id: number;
  mission_title: string;
  freelance_nom: string;
  annonceur_nom: string;
  montant_brut: string;
  taux_commission: string;
  montant_commission: string;
  montant_net: string;
  statut_collecte: 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE';
  statut_decaissement: 'NON_DECLENCHE' | 'EN_ATTENTE' | 'REUSSI' | 'ECHOUE';
  reference_collecte: string | null;
  reference_decaissement: string | null;
  date_collecte: string | null;
  date_decaissement: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentInitiateResponse {
  message: string;
  token: string;
  payment_url: string;
  paiement: Paiement;
}

export const marquerMissionLivree = async (
  missionId: number
): Promise<{ message: string; status: string }> => {
  const response = await instance.post<{ message: string; status: string }>(
    `missions/${missionId}/marquer-livree/`
  );
  return response.data;
};

export const validerLivraisonMission = async (
  missionId: number
): Promise<{ message: string; status: string }> => {
  const response = await instance.post<{ message: string; status: string }>(
    `missions/${missionId}/valider-livraison/`
  );
  return response.data;
};

export const initierPaiementMission = async (
  missionId: number
): Promise<PaymentInitiateResponse> => {
  const response = await instance.post<PaymentInitiateResponse>(
    `missions/${missionId}/payer/`
  );
  return response.data;
};

export const getHistoriquePaiement = async (
  missionId: number
): Promise<Paiement> => {
  const response = await instance.get<Paiement>(
    `missions/${missionId}/historique-paiement/`
  );
  return response.data;
};

export const confirmerNumeroPaiement = async ({
  propositionId,
  numero,
}: {
  propositionId: number;
  numero?: string;
}): Promise<{ message: string; numero_paiement: NumeroPaiement }> => {
  const response = await instance.post<{
    message: string;
    numero_paiement: NumeroPaiement;
  }>(`propositions/${propositionId}/confirmer-numero-paiement/`, {
    numero,
  });
  return response.data;
};
