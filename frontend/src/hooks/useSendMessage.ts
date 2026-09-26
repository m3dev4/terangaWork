import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sendMessage } from "../api/message";

export const useSendMessage = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendMessage,

    onSuccess: (newMessage) => {
      queryClient.invalidateQueries({
        queryKey: ["messages", newMessage.mission],
      });

      queryClient.invalidateQueries({
        queryKey: ["conversations"],
      });
    },
  });
};
