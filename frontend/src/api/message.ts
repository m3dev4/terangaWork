import { instance } from "./axios";

export interface UserMinimal {
  id: number;
  first_name: string;
  last_name: string;
  profile_picture?: string | null;
}

export type MessageType = "TEXTE" | "VOCAL";

export interface Message {
  id: string;
  expediteur: number;
  expediteur_info: UserMinimal;
  destinataire: number;
  destinataire_info: UserMinimal;
  mission: string;
  type: MessageType;
  content: string;
  audio_url: string | null;
  date_envoi: string;
  est_lu: boolean;
}

export interface MessageLu {
  message: string;
  utilisateur: string;
  date_lecture: string;
}

export interface Conversation {
  mission_id: string;
  mission_titre: string;
  autre_utlisateur: UserMinimal;
  dernier_message: Message | null;
  nb_non_lus: number;
  date_dernier_message: string;
  is_linked?: boolean;
  mission_status?: string;
}

export interface MessagePayload {
  mission: string;
  destinataire?: number;
  type: MessageType;
  content: string;
  audio_url: string | null;
}

export const getConversation = async (): Promise<Conversation[]> => {
  const response = await instance.get("messages/");
  return response.data;
};

export const getMessage = async (missionId: string): Promise<Message[]> => {
  const response = await instance.get(
    "messages/conversation/" + missionId + "/"
  );
  const data = response.data;
  const rawList = Array.isArray(data) ? data : data.messages || [];
  return rawList.map((m: any) => ({
    ...m,
    content: m.content || m.contenu || "",
  }));
};

export const sendMessage = async (
  payload: MessagePayload
): Promise<Message> => {
  const body = {
    ...payload,
    contenu: payload.content,
  };
  const response = await instance.post("messages/", body);
  return {
    ...response.data,
    content: response.data.content || response.data.contenu || "",
  };
};

export const sendAudioMessage = async (
  payload: MessagePayload
): Promise<Message> => {
  const body = {
    ...payload,
    contenu: payload.content,
  };
  const response = await instance.post("messages/", body);
  return {
    ...response.data,
    content: response.data.content || response.data.contenu || "",
  };
};

export const mark_read = async (missionId: string): Promise<Message[]> => {
  const response = await instance.post(`messages/mark_all_read/${missionId}/`);
  return response.data;
};
