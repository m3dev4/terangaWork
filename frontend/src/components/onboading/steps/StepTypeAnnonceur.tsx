import React, { useState } from "react";
import {
  Building2,
  UserCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
} from "lucide-react";

interface StepTypeAnnonceurProps {
  initialType?: string;
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (typeAnnonceur: "Entreprise" | "Particulier") => void;
  isLoading?: boolean;
}

export const StepTypeAnnonceur: React.FC<StepTypeAnnonceurProps> = ({
  initialType,
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  // Le type "Entreprise / Agence" est désactivé pour le moment :
  // seul "Particulier" peut être choisi.
  const ENTREPRISE_DISPONIBLE = false;

  const [selectedType, setSelectedType] = useState<
    "Entreprise" | "Particulier"
  >(
    ENTREPRISE_DISPONIBLE && initialType === "Entreprise"
      ? "Entreprise"
      : "Particulier",
  );

  React.useEffect(() => {
    if (initialType === "Particulier") setSelectedType("Particulier");
    if (initialType === "Entreprise" && ENTREPRISE_DISPONIBLE)
      setSelectedType("Entreprise");
  }, [initialType, ENTREPRISE_DISPONIBLE]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(selectedType);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
      <div className="mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-orange-50 text-brand-violet border border-orange-100">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-brand-ink tracking-tight mb-2">
        Quel type d'annonceur êtes-vous ?
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base mb-8">
        Précisez si vous recrutez au nom d'une structure ou pour un besoin
        personnel.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Entreprise */}
        <div
          onClick={() => ENTREPRISE_DISPONIBLE && setSelectedType("Entreprise")}
          aria-disabled={!ENTREPRISE_DISPONIBLE}
          className={`w-full p-5 rounded-2xl flex items-center justify-between transition-all duration-200 ${
            !ENTREPRISE_DISPONIBLE
              ? "border border-border bg-neutral-50 opacity-60 cursor-not-allowed"
              : selectedType === "Entreprise"
                ? "border-2 border-brand-violet bg-brand-canvas shadow-xs cursor-pointer"
                : "border border-border bg-white hover:border-neutral-300 cursor-pointer"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectedType === "Entreprise"
                  ? "bg-white text-brand-ink shadow-xs"
                  : "bg-neutral-100 text-muted-foreground"
              }`}
            >
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-brand-ink text-base mb-0.5 flex items-center gap-2">
                Entreprise / Agence
                {!ENTREPRISE_DISPONIBLE && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-neutral-200 text-muted-foreground">
                    Bientôt disponible
                  </span>
                )}
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                PME, startup, grande entreprise ou agence.
              </p>
            </div>
          </div>

          <div className="shrink-0 ml-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                selectedType === "Entreprise"
                  ? "border-brand-violet"
                  : "border-neutral-300 bg-transparent"
              }`}
            >
              {selectedType === "Entreprise" && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
              )}
            </div>
          </div>
        </div>

        {/* Particulier */}
        <div
          onClick={() => setSelectedType("Particulier")}
          className={`w-full p-5 rounded-2xl cursor-pointer flex items-center justify-between transition-all duration-200 ${
            selectedType === "Particulier"
              ? "border-2 border-brand-violet bg-brand-canvas shadow-xs"
              : "border border-border bg-white hover:border-neutral-300"
          }`}
        >
          <div className="flex items-center gap-4">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${
                selectedType === "Particulier"
                  ? "bg-white text-brand-ink shadow-xs"
                  : "bg-neutral-100 text-muted-foreground"
              }`}
            >
              <UserCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-brand-ink text-base mb-0.5">
                Particulier
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground">
                Projet personnel, indépendant ou porteur de projet.
              </p>
            </div>
          </div>

          <div className="shrink-0 ml-3">
            <div
              className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all ${
                selectedType === "Particulier"
                  ? "border-brand-violet"
                  : "border-neutral-300 bg-transparent"
              }`}
            >
              {selectedType === "Particulier" && (
                <div className="w-2.5 h-2.5 rounded-full bg-brand-green" />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between pt-6">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-white text-brand-ink font-medium hover:bg-brand-canvas transition-colors cursor-pointer text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Retour</span>
          </button>

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-ink font-medium shadow-sm transition-all duration-150 disabled:opacity-50 cursor-pointer text-sm"
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
          </button>
        </div>
      </form>
    </div>
  );
};
