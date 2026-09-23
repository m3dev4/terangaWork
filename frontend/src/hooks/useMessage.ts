import { useQuery } from "@tanstack/react-query";
import { getMessage } from "../api/message";

export const useMessage = (missionId: string) => {
  return useQuery({
    queryKey: ["messages", missionId],
    queryFn: () => getMessage(missionId),
    enabled: !!missionId,
    staleTime: 1000,
    refetchInterval: 3000, // Polling automatique en temps réel toutes les 3 secondes
  });
};
