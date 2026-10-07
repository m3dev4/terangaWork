import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getConversations,
  createConversation,
  getConversationMessages,
  sendChatMessage,
  deleteConversation,
  type ChatConversation,
  type ChatConversationDetail,
  type SendChatMessagePayload,
  type SendChatMessageResponse,
} from "../api/chatApi";

export const useChatConversations = () => {
  return useQuery<ChatConversation[], Error>({
    queryKey: ["chatConversations"],
    queryFn: getConversations,
    refetchOnWindowFocus: true,
  });
};

export const useChatMessages = (conversationId: number | null) => {
  return useQuery<ChatConversationDetail, Error>({
    queryKey: ["chatMessages", conversationId],
    queryFn: () => {
      if (!conversationId) {
        return Promise.reject(new Error("No conversation selected"));
      }
      return getConversationMessages(conversationId);
    },
    enabled: !!conversationId,
    retry: false,
  });
};

export const useCreateChatConversation = () => {
  const queryClient = useQueryClient();
  return useMutation<ChatConversation, Error, void>({
    mutationFn: createConversation,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["chatConversations"],
      });
    },
  });
};

export const useDeleteChatConversation = () => {
  const queryClient = useQueryClient();
  return useMutation<void, Error, number>({
    mutationFn: deleteConversation,
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({
        queryKey: ["chatConversations"],
      });
      queryClient.removeQueries({
        queryKey: ["chatMessages", deletedId],
      });
    },
  });
};

export const useSendChatMessage = () => {
  const queryClient = useQueryClient();
  return useMutation<
    SendChatMessageResponse,
    Error,
    { conversationId: number; payload: SendChatMessagePayload }
  >({
    mutationFn: ({ conversationId, payload }) =>
      sendChatMessage(conversationId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["chatMessages", variables.conversationId],
      });
      queryClient.invalidateQueries({
        queryKey: ["chatConversations"],
      });
    },
  });
};
