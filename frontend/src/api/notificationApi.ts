import { instance } from "./axios";

export type NotificationType =
  | "NOUVEAU_MESSAGE"
  | "PROPOSITION_ACCEPTEE"
  | "PROPOSITION_REJETEE"
  | "MISSION_DEMARREE"
  | "MISSION_LIVREE"
  | "MISSION_COMPLETEE"
  | "MISSION_ANNULEE"
  | "MISSION_LITIGE"
  | "PAIEMENT_REUSSI"
  | "PAIEMENT_ECHOUE";

export interface Notification {
  id: string;
  utilisateur: number;
  type: NotificationType;
  titre: string;
  message: string;
  lue: boolean;
  date_creation: string;
  date_lecture: string | null;
  mission: number | string | null;
  mission_titre: string | null;
  proposition: string | null;
  proposition_id: string | null;
  paiement: string | null;
  message_obj: string | null;
}

export interface NotificationStats {
  total: number;
  non_lues: number;
  par_type: Record<string, number>;
}

export interface NotificationListResponse {
  total: number;
  page: number;
  page_size: number;
  notifications: Notification[];
}

export const getNotifications = async (params?: {
  lue?: boolean;
  type?: string;
  page_size?: number;
  page?: number;
}): Promise<NotificationListResponse> => {
  const response = await instance.get("notifications/", { params });
  return response.data;
};

export const getNotificationStats = async (): Promise<NotificationStats> => {
  const response = await instance.get("notifications/stats/");
  return response.data;
};

export const markNotificationRead = async (
  id: string
): Promise<Notification> => {
  const response = await instance.patch(`notifications/${id}/mark_read/`);
  return response.data;
};

export const markAllNotificationsRead = async (): Promise<{ message: string }> => {
  const response = await instance.post("notifications/mark_all_read/");
  return response.data;
};

export const deleteNotification = async (
  id: string
): Promise<{ message: string }> => {
  const response = await instance.delete(`notifications/${id}/`);
  return response.data;
};
