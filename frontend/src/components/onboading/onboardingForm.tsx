import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { TWLogo } from "../../assets/images";
import StepOnboarding from "./stepOnboarding";
import {
  FREELANCE_ONBOARDING_STEPS,
  ANNONCEUR_ONBOARDING_STEPS,
} from "../../constants/utils";
import {
  useOnboardingStatus,
  useSubmitStep,
  useBackStep,
  useSkipStep,
} from "../../hooks/useOnboarding";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { StepIdentite } from "./steps/StepIdentite";
import { StepRole } from "./steps/StepRole";
import { StepPresentation } from "./steps/StepPresentation";
import { StepServices } from "./steps/StepServices";
import { StepTechnologies } from "./steps/StepTechnologies";
import { StepExperience } from "./steps/StepExperience";
import { StepFormation } from "./steps/StepFormation";
import { StepRealisations } from "./steps/StepRealisations";
import { StepTypeAnnonceur } from "./steps/StepTypeAnnonceur";
import { StepInfosEntreprise } from "./steps/StepInfosEntreprise";
import { StepFinalisation } from "./steps/StepFinalisation";
import { Button } from "../ui/button";

export interface OnboardingStepConfig {
  key: string;
  label: string;
}

const OnboardingForm: React.FC = () => {
  const navigate = useNavigate();
  const { data: statusData, isLoading: isStatusLoading } =
    useOnboardingStatus();
  const submitStep = useSubmitStep();
  const backStep = useBackStep();
  const skipStep = useSkipStep();

  const [activeRole, setActiveRole] = useState<
    "freelance" | "annonceur" | null
  >(null);
  const [activeTypeAnnonceur, setActiveTypeAnnonceur] = useState<string | null>(
    null
  );
  const [currentStepKey, setCurrentStepKey] = useState<string>("identite");

  const steps = useMemo(() => {
    const role = activeRole || statusData?.role;
    if (role === "annonceur") {
      const typeAnn =
        activeTypeAnnonceur ||
        statusData?.completed_data?.type_annonceur?.typeAnnonceur;
      if (typeAnn === "Particulier") {
        return ANNONCEUR_ONBOARDING_STEPS.filter(
          (s) => s.key !== "infos_entreprise"
        );
      }
      return ANNONCEUR_ONBOARDING_STEPS;
    }
    return FREELANCE_ONBOARDING_STEPS;
  }, [
    activeRole,
    activeTypeAnnonceur,
    statusData?.role,
    statusData?.completed_data,
  ]);

  useEffect(() => {
    if (statusData) {
      if (statusData.onboarding_completed) {
        navigate("/");
        return;
      }
      if (statusData.role) {
        setActiveRole(statusData.role);
      }
      if (statusData.completed_data?.type_annonceur?.typeAnnonceur) {
        setActiveTypeAnnonceur(
          statusData.completed_data.type_annonceur.typeAnnonceur
        );
      }
      if (statusData.onboarding_step) {
        setCurrentStepKey(statusData.onboarding_step);
      }
    }
  }, [statusData, navigate]);

  const queryClient = useQueryClient();

  const activeStepIndex = useMemo(() => {
    const idx = steps.findIndex((s) => s.key === currentStepKey);
    return idx >= 0 ? idx : 0;
  }, [steps, currentStepKey]);

  const handleStepSubmit = async (data: Record<string, any> | FormData) => {
    try {
      const res = await submitStep.mutateAsync({
        stepName: currentStepKey,
        data,
      });

      if (
        currentStepKey === "role" &&
        typeof data === "object" &&
        "role" in data
      ) {
        setActiveRole(data.role as "freelance" | "annonceur");
      }

      if (res.onboarding_completed || currentStepKey === "finalisation") {
        await queryClient.invalidateQueries({ queryKey: ["currentUser"] });
        navigate("/espace", { replace: true });
      } else if (res.next_step) {
        setCurrentStepKey(res.next_step);
      } else {
        const nextIdx = activeStepIndex + 1;
        if (nextIdx < steps.length) {
          setCurrentStepKey(steps[nextIdx].key);
        }
      }
    } catch (err) {
      console.error("Erreur lors de l'enregistrement de l'étape :", err);
    }
  };

  const handleBack = async () => {
    if (activeStepIndex > 0) {
      const prevStepKey = steps[activeStepIndex - 1].key;
      try {
        await backStep.mutateAsync(prevStepKey);
      } catch {
        // Fallback local navigation
      }
      setCurrentStepKey(prevStepKey);
    }
  };

  const handleSkip = async () => {
    try {
      const res = await skipStep.mutateAsync(currentStepKey);
      if (res.next_step) {
        setCurrentStepKey(res.next_step);
      } else {
        const nextIdx = activeStepIndex + 1;
        if (nextIdx < steps.length) {
          setCurrentStepKey(steps[nextIdx].key);
        }
      }
    } catch (err) {
      console.error("Erreur lors du saut de l'étape :", err);
    }
  };

  const handleSidebarStepClick = async (targetIndex: number) => {
    if (targetIndex < activeStepIndex) {
      const targetKey = steps[targetIndex].key;
      try {
        await backStep.mutateAsync(targetKey);
      } catch {
        // Fallback
      }
      setCurrentStepKey(targetKey);
    }
  };

  if (isStatusLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F3EBDD]/40">
        <Loader2 className="w-10 h-10 animate-spin text-[#D95C38]" />
      </div>
    );
  }

  const completedData = statusData?.completed_data || {};

  const renderStepContent = () => {
    const isPending =
      submitStep.isPending || skipStep.isPending || backStep.isPending;
    const stepNum = activeStepIndex + 1;
    const total = steps.length;

    switch (currentStepKey) {
      case "identite":
        return (
          <StepIdentite
            initialData={completedData.identite}
            stepNumber={stepNum}
            totalSteps={total}
            onSubmit={handleStepSubmit}
            isLoading={isPending}
          />
        );

      case "role":
        return (
          <StepRole
            initialRole={activeRole || completedData.role?.role || "freelance"}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={(role) => {
              setActiveRole(role);
              handleStepSubmit({ role });
            }}
            isLoading={isPending}
          />
        );

      case "presentation":
        return (
          <StepPresentation
            initialData={completedData.presentation}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={handleStepSubmit}
            isLoading={isPending}
          />
        );

      case "service":
        return (
          <StepServices
            initialServiceId={completedData.service?.service_id}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={(serviceId) =>
              handleStepSubmit({ service_id: serviceId })
            }
            isLoading={isPending}
          />
        );

      case "technologies":
        return (
          <StepTechnologies
            initialTechIds={completedData.technologies?.technology_ids}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={(techIds) =>
              handleStepSubmit({ technology_ids: techIds })
            }
            isLoading={isPending}
          />
        );

      case "experience":
        return (
          <StepExperience
            initialData={completedData.experience}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSkip={handleSkip}
            onSubmit={handleStepSubmit}
            isLoading={isPending}
          />
        );

      case "formation":
        return (
          <StepFormation
            initialData={completedData.formation}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSkip={handleSkip}
            onSubmit={handleStepSubmit}
            isLoading={isPending}
          />
        );

      case "realisations":
        return (
          <StepRealisations
            initialData={completedData.realisations}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSkip={handleSkip}
            onSubmit={handleStepSubmit}
            isLoading={isPending}
          />
        );

      case "type_annonceur":
        return (
          <StepTypeAnnonceur
            initialType={
              activeTypeAnnonceur ||
              completedData.type_annonceur?.typeAnnonceur ||
              "Entreprise"
            }
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={(type) => {
              setActiveTypeAnnonceur(type);
              handleStepSubmit({ typeAnnonceur: type });
            }}
            isLoading={isPending}
          />
        );

      case "infos_entreprise":
        return (
          <StepInfosEntreprise
            initialData={completedData.infos_entreprise}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={handleStepSubmit}
            isLoading={isPending}
          />
        );

      case "finalisation":
        return (
          <StepFinalisation
            role={activeRole}
            initialData={completedData.finalisation}
            stepNumber={stepNum}
            totalSteps={total}
            onBack={handleBack}
            onSubmit={({ profile_picture, githubUrl }) => {
              if (profile_picture) {
                const formData = new FormData();
                formData.append("profile_picture", profile_picture);
                if (githubUrl) formData.append("githubUrl", githubUrl);
                handleStepSubmit(formData);
              } else {
                handleStepSubmit({ githubUrl: githubUrl || "" });
              }
            }}
            isLoading={isPending}
          />
        );

      default:
        return (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2 text-[#111118]">
              Étape en cours de chargement...
            </h2>
            <Button
              onClick={() => setCurrentStepKey("identite")}
              className="text-sm text-[#D95C38] underline"
            >
              Revenir au début
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="flex h-screen max-h-screen w-full bg-white overflow-hidden">
      <aside className="w-80 lg:w-84 shrink-0 h-full max-h-screen bg-[#F3EBDD]/50 border-r border-[#111118]/8 px-6 py-6 lg:py-8 flex flex-col justify-start overflow-hidden select-none">
        <div className="flex flex-col items-start mb-6">
          <img src={TWLogo} alt="TerangaWork" className="h-15 w-auto mb-4" />
          <h2 className="font-heading font-semibold text-xl lg:text-2xl text-[#111118] tracking-tight">
            Configurons votre profil{" "}
            {activeRole && (
              <span className="text-[#D95C38]">
                {activeRole === "freelance" ? "freelance" : "annonceur"}
              </span>
            )}
          </h2>
        </div>

        <div className="flex flex-col w-full flex-1 justify-between max-h-135">
          {steps.map((step, index) => (
            <StepOnboarding
              key={step.key}
              label={step.label}
              active={index === activeStepIndex}
              completed={index < activeStepIndex}
              isLast={index === steps.length - 1}
              onClick={() => handleSidebarStepClick(index)}
            />
          ))}
        </div>
      </aside>

      {/* ── Zone de formulaire ── */}
      <main className="flex-1 h-full overflow-y-auto bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-center items-center">
        <div className="w-full max-w-xl">{renderStepContent()}</div>
      </main>
    </div>
  );
};

export default OnboardingForm;
