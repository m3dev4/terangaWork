import React, { useState, useEffect } from "react";
import { ArrowRight, ArrowLeft, Loader2, Code2, Check } from "lucide-react";
import { useTechnologies } from "../../../hooks/useOnboarding";
import { Button } from "../../ui/button";


interface StepTechnologiesProps {
  initialTechIds?: number[];
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (techIds: number[]) => void;
  isLoading?: boolean;
}

export const StepTechnologies: React.FC<StepTechnologiesProps> = ({
  initialTechIds = [],
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  const { data: rawTech, isLoading: isTechLoading } = useTechnologies();
  const [selectedIds, setSelectedIds] = useState<number[]>(initialTechIds);
  const [error, setError] = useState("");

  const techList = React.useMemo(() => {
    if (!rawTech) return [];
    if (Array.isArray(rawTech)) return rawTech;
    if (
      typeof rawTech === "object" &&
      "results" in rawTech &&
      Array.isArray((rawTech as any).results)
    ) {
      return (rawTech as any).results;
    }
    return [];
  }, [rawTech]);

  useEffect(() => {
    if (initialTechIds.length > 0) {
      setSelectedIds(initialTechIds);
    }
  }, [initialTechIds]);

  const toggleTech = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedIds.length === 0) {
      setError(
        "Veuillez sélectionner au moins une technologie dans le catalogue."
      );
      return;
    }
    setError("");
    onSubmit(selectedIds);
  };

  return (
    <div className="w-full max-w-xl mx-auto flex flex-col justify-center">
      {/* Badge d'étape */}
      <div className="mb-4">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-[#F3EBDD] text-[#111118]/70">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      <h1 className="text-2xl sm:text-3xl font-bold text-[#111118] tracking-tight mb-2">
        Quelles technologies maîtrisez-vous ?
      </h1>
      <p className="text-[#111118]/50 text-sm sm:text-base mb-6">
        Sélectionnez dans le catalogue les outils et frameworks que vous
        maîtrisez (sélection multiple).
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-[#D95C38]/10 border border-[#D95C38]/25 text-[#c14f2f] text-sm">
          {error}
        </div>
      )}

      {isTechLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-[#111118]/40">
          <Loader2 className="w-8 h-8 animate-spin text-[#D95C38]" />
          <span className="text-xs">
            Chargement des technologies depuis la base de données...
          </span>
        </div>
      ) : techList.length === 0 ? (
        <div className="p-6 rounded-2xl bg-[#F3EBDD]/40 border border-[#111118]/8 text-center text-[#111118]/50 text-sm">
          Aucune technologie disponible dans le catalogue pour le moment.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[290px] overflow-y-auto p-1">
            {techList.map(
              (tech: { id: number; name: string; imgUrl?: string }) => {
                const isSelected = selectedIds.includes(tech.id);
                return (
                  <div
                    key={tech.id}
                    onClick={() => toggleTech(tech.id)}
                    className={`p-3 rounded-2xl cursor-pointer flex items-center gap-3 transition-all duration-150 select-none ${
                      isSelected
                        ? "border-2 border-[#111118] bg-[#F3EBDD]/50"
                        : "border border-[#111118]/12 bg-white hover:border-[#111118]/25"
                    }`}
                  >
                    {/* Logo / icône technologie */}
                    <div className="w-8 h-8 rounded-lg bg-[#F3EBDD]/60 flex items-center justify-center shrink-0 overflow-hidden">
                      {tech.imgUrl ? (
                        <img
                          src={tech.imgUrl}
                          alt={tech.name}
                          className="w-full h-full object-contain p-1"
                          onError={(e) => {
                            (e.currentTarget as HTMLElement).style.display =
                              "none";
                          }}
                        />
                      ) : (
                        <Code2 className="w-4 h-4 text-[#111118]/40" />
                      )}
                    </div>

                    <span
                      className={`text-xs sm:text-sm tracking-tight flex-1 truncate ${
                        isSelected
                          ? "font-bold text-[#111118]"
                          : "font-medium text-[#111118]/70"
                      }`}
                    >
                      {tech.name}
                    </span>

                    {isSelected && (
                      <div className="w-4 h-4 rounded-full bg-[#111118] text-[#E7B84B] flex items-center justify-center shrink-0">
                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                    )}
                  </div>
                );
              }
            )}
          </div>

          <div className="flex items-center justify-between pt-4">
            <Button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[#111118]/12 bg-white text-[#111118]/70 font-medium hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </Button>

            <Button
              type="submit"
              disabled={isLoading || selectedIds.length === 0}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-[#D95C38] hover:bg-[#c14f2f] text-white font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer text-sm"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Chargement...</span>
                </>
              ) : (
                <>
                  <span>Continuer ({selectedIds.length})</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
};
