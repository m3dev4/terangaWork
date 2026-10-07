import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { createProposition } from "../api/propositionsApi";
import { toast } from "../components/ui/toast";

export const useCreateProposition = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createProposition,
    onSuccess: (data, variables) => {
      // Invalidate mission queries to refetch if needed
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      queryClient.invalidateQueries({
        queryKey: ["mission", variables.mission],
      });

      toast.add({
        title: "Proposition envoyée",
        description:
          "Votre proposition a été envoyée avec succès à l'annonceur.",
        type: "success",
      });
    },
    onError: (error) => {
      toast.add({
        title: "Erreur lors de l'envoi",
        description:
          "Une erreur est survenue lors de l'envoi de votre proposition.",
        type: "error",
      });
      console.error("Failed to create proposition:", error);
    },
  });
};
