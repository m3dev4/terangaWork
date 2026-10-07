import { instance } from "./axios";

export type ChatRole = "utilisateur" | "assistant";

export interface ChatMessage {
  id: number;
  role: ChatRole;
  content: string;
  created_at: string;
}

export interface ChatConversation {
  id: number;
  title: string;
  created: string;
  updated: string;
  last_message?: string | ChatMessage | null;
  message_count: number;
}

export interface ChatConversationDetail extends ChatConversation {
  messages: ChatMessage[];
}

export interface SendChatMessagePayload {
  content: string;
}

export interface SendChatMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage | null;
  precision_demandee: boolean;
  detail?: string;
}

export const getConversations = async (): Promise<ChatConversation[]> => {
  const response = await instance.get("chat/conversations/");
  return response.data;
};

export const createConversation = async (): Promise<ChatConversation> => {
  const response = await instance.post("chat/conversations/", {});
  return response.data;
};

export const getConversationMessages = async (
  conversationId: number
): Promise<ChatConversationDetail> => {
  const response = await instance.get(
    `chat/conversations/${conversationId}/messages/`
  );
  return response.data;
};

export const sendChatMessage = async (
  conversationId: number,
  payload: SendChatMessagePayload
): Promise<SendChatMessageResponse> => {
  const response = await instance.post(
    `chat/conversations/${conversationId}/send/`,
    payload
  );
  return response.data;
};

export const deleteConversation = async (
  conversationId: number
): Promise<void> => {
  await instance.delete(`chat/conversations/${conversationId}/messages/`);
};
