import { instance } from './axios';

export type PaymentOperator = 'OM' | 'WAVE';

export interface ServiceOption {
  id: number;
  name: string;
  description?: string;
}

export interface TechnologieOption {
  id: number;
  name: string;
  imgUrl: string;
}

export interface Mission {
  id: number;
  title: string;
  description: string;
  date_deadline: string | null;
  operateurMobileMoney: PaymentOperator;
  budget: number;
  service: number;
  service_detail?: ServiceOption;
  technologies?: number[];
  technologies_detail?: TechnologieOption[];
  annonceur: number;
  status?: 'OPEN' | 'IN_PROGRESS' | 'DELIVERED' | 'COMPLETED' | 'CLOSED';
  created_at: string;
  updated_at: string;
}

export interface MissionPayload {
  title: string;
  description: string;
  date_deadline: string;
  operateurMobileMoney: PaymentOperator;
  budget: number;
  service: number;
  technologies?: number[];
}

const unwrapList = <T>(data: T[] | { results: T[] }): T[] =>
  Array.isArray(data) ? data : data.results;

export const getMissions = async (): Promise<Mission[]> => {
  const response = await instance.get<Mission[] | { results: Mission[] }>('missions/');
  return unwrapList(response.data);
};

export const getMission = async (id: number): Promise<Mission> => {
  const response = await instance.get<Mission>(`missions/${id}/`);
  return response.data;
};

export const getMissionServices = async (): Promise<ServiceOption[]> => {
  const response = await instance.get<ServiceOption[] | { results: ServiceOption[] }>('services/');
  return unwrapList(response.data);
};

export const createMission = async (payload: MissionPayload): Promise<Mission> => {
  const response = await instance.post<Mission>('missions/', payload);
  return response.data;
};

export const updateMission = async ({
  id,
  payload,
}: {
  id: number;
  payload: Partial<MissionPayload>;
}): Promise<Mission> => {
  const response = await instance.patch<Mission>(`missions/${id}/`, payload);
  return response.data;
};

export const deleteMission = async (id: number): Promise<void> => {
  await instance.delete(`missions/${id}/`);
};