import { useQuery } from "@tanstack/react-query";
import { getMessage } from "../api/message";

export const useMessage = (missionId: string) => {
  return useQuery({
    queryKey: ["messages", missionId],
    queryFn: () => getMessage(missionId),
    enabled: !!missionId,
    refetchOnWindowFocus: true,
  });
};
