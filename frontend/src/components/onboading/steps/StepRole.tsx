import React, { useState } from "react";
import {
  User,
  Briefcase,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { Button } from "../../ui/button";

interface StepRoleProps {
  initialRole?: string;
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (role: "freelance" | "annonceur") => void;
  isLoading?: boolean;
}

export const StepRole: React.FC<StepRoleProps> = ({
  initialRole,
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  const [selectedRole, setSelectedRole] = useState<"freelance" | "annonceur">(
    (initialRole as "freelance" | "annonceur") || "freelance"
  );

  React.useEffect(() => {
    if (initialRole === "freelance" || initialRole === "annonceur") {
      setSelectedRole(initialRole);
    }
  }, [initialRole]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole) {
      onSubmit(selectedRole);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
      {/* Badge d'étape */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F3EBDD] text-[#111118]/70">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      {/* En-tête */}
      <h1 className="text-2xl sm:text-3xl font-bold text-[#111118] tracking-tight mb-2">
        Quel est votre profil ?
      </h1>
      <p className="text-[#111118]/50 text-sm sm:text-base mb-8">
        Choisissez le rôle qui correspond à votre activité sur TerangaWork.
      </p>

      {/* Sélection du rôle */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Option Freelance */}
        <div
          onClick={() => setSelectedRole("freelance")}
          className={`w-full p-5 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-200 ${
            selectedRole === "freelance"
              ? "border-2 border-[#111118] bg-[#F3EBDD]/50"
              : "border border-[#111118]/12 bg-white hover:border-[#111118]/25"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectedRole === "freelance"
                  ? "bg-white text-[#D95C38]"
                  : "bg-[#F3EBDD]/60 text-[#111118]/40"
              }`}
            >
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#111118] text-base mb-0.5">
                Freelance
              </h3>
              <p className="text-xs sm:text-sm text-[#111118]/50">
                Je propose mes services et mon expertise aux annonceurs.
              </p>
            </div>
          </div>

          <div className="shrink-0 ml-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                selectedRole === "freelance"
                  ? "border-[#111118]"
                  : "border-[#111118]/20 bg-transparent"
              }`}
            >
              {selectedRole === "freelance" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#D95C38]" />
              )}
            </div>
          </div>
        </div>

        {/* Option Annonceur */}
        <div
          onClick={() => setSelectedRole("annonceur")}
          className={`w-full p-5 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-200 ${
            selectedRole === "annonceur"
              ? "border-2 border-[#111118] bg-[#F3EBDD]/50"
              : "border border-[#111118]/12 bg-white hover:border-[#111118]/25"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectedRole === "annonceur"
                  ? "bg-white text-[#D95C38]"
                  : "bg-[#F3EBDD]/60 text-[#111118]/40"
              }`}
            >
              <Briefcase className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-[#111118] text-base mb-0.5">
                Annonceur
              </h3>
              <p className="text-xs sm:text-sm text-[#111118]/50">
                Je recherche des talents pour réaliser mes projets.
              </p>
            </div>
          </div>

          <div className="shrink-0 ml-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                selectedRole === "annonceur"
                  ? "border-[#111118]"
                  : "border-[#111118]/20 bg-transparent"
              }`}
            >
              {selectedRole === "annonceur" && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#D95C38]" />
              )}
            </div>
          </div>
        </div>

        {/* Boutons de navigation */}
        <div className="flex items-center justify-between pt-6">
          <Button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#111118]/12 bg-white text-[#111118]/70 font-medium hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </Button>

          <Button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#D95C38] hover:bg-[#c14f2f] text-white font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Chargement...</span>
              </>
            ) : (
              <>
                <span>Continuer</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </div>

        {/* Encart d'aide */}
        <div className="mt-8 p-4 rounded-2xl bg-[#F3EBDD]/50 border border-[#111118]/8 flex items-center gap-3.5">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-[#D95C38] shrink-0">
            <HelpCircle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-[#111118]">
              Besoin d'aide ?
            </h4>
            <p className="text-xs text-[#111118]/50">
              Consultez notre guide pour choisir le profil qui vous convient le
              mieux.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
};
