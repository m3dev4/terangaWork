import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getOnboardingStatus,
  submitOnboardingStep,
  backOnboardingStep,
  skipOnboardingStep,
  getServices,
  getTechnologies,
} from "../api/onboardingApi";

export const useOnboardingStatus = () => {
  return useQuery({
    queryKey: ["onboardingStatus"],
    queryFn: getOnboardingStatus,
    staleTime: 1000 * 60, // 1 minute
    retry: 1,
  });
};

export const useSubmitStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: submitOnboardingStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
    },
  });
};

export const useBackStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: backOnboardingStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
    },
  });
};

export const useSkipStep = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: skipOnboardingStep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["onboardingStatus"] });
    },
  });
};

export const useServices = () => {
  return useQuery({
    queryKey: ["services"],
    queryFn: getServices,
    staleTime: 1000 * 60 * 10,
  });
};

export const useTechnologies = () => {
  return useQuery({
    queryKey: ["technologies"],
    queryFn: getTechnologies,
    staleTime: 1000 * 60 * 10,
  });
};
