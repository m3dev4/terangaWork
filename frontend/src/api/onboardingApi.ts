import { instance } from "./axios";

export interface OnboardingStepInfo {
  name: string;
  index: number;
  status: "pending" | "current" | "completed";
  is_skippable: boolean;
  is_mandatory: boolean;
}

export interface OnboardingStatusResponse {
  onboarding_completed: boolean;
  onboarding_step: string;
  role: "freelance" | "annonceur" | null;
  steps: OnboardingStepInfo[];
  completed_data: Record<string, any>;
}

export interface OnboardingSubmitResponse {
  message: string;
  next_step?: string;
  onboarding_completed: boolean;
  current_step: string;
  data?: Record<string, any>;
}

export const getOnboardingStatus =
  async (): Promise<OnboardingStatusResponse> => {
    const response =
      await instance.get<OnboardingStatusResponse>("onboarding/status/");
    return response.data;
  };

export const submitOnboardingStep = async ({
  stepName,
  data,
}: {
  stepName: string;
  data: Record<string, any> | FormData;
}): Promise<OnboardingSubmitResponse> => {
  const isFormData = data instanceof FormData;
  const response = await instance.post<OnboardingSubmitResponse>(
    `onboarding/${stepName}/`,
    data,
    isFormData
      ? {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      : undefined
  );
  return response.data;
};

export const backOnboardingStep = async (stepName: string): Promise<any> => {
  const response = await instance.post(`onboarding/back/${stepName}/`);
  return response.data;
};

export const skipOnboardingStep = async (stepName: string): Promise<any> => {
  const response = await instance.post(`onboarding/skip/${stepName}/`);
  return response.data;
};

export const getServices = async (): Promise<
  { id: number; name: string; description?: string }[]
> => {
  const response = await instance.get("services/");
  return response.data;
};

export const getTechnologies = async (): Promise<
  { id: number; name: string }[]
> => {
  const response = await instance.get("technologies/");
  return response.data;
};
