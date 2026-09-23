import { useQuery } from "@tanstack/react-query";
import { getConversation, type Conversation } from "../api/message";

export const useConversions = () => {
  return useQuery<Conversation[], Error>({
    queryKey: ["conversations"],
    queryFn: getConversation,
    staleTime: 2000,
    refetchInterval: 4000, // Rafraîchissement automatique de la liste des conversations
  });
};
