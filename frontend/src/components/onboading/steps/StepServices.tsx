import React, { useState, useEffect } from "react";
import { Layers, Star, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import { useServices } from "../../../hooks/useOnboarding";
import { Button } from "../../ui/button";


interface StepServicesProps {
  initialServiceId?: number;
  stepNumber: number;
  totalSteps: number;
  onBack: () => void;
  onSubmit: (serviceId: number) => void;
  isLoading?: boolean;
}

export const StepServices: React.FC<StepServicesProps> = ({
  initialServiceId,
  stepNumber,
  totalSteps,
  onBack,
  onSubmit,
  isLoading = false,
}) => {
  const { data: rawServices, isLoading: isServicesLoading } = useServices();
  const [selectedId, setSelectedId] = useState<number | null>(
    initialServiceId || null
  );
  const [error, setError] = useState("");

  const servicesList = React.useMemo(() => {
    if (!rawServices) return [];
    if (Array.isArray(rawServices)) return rawServices;
    if (
      typeof rawServices === "object" &&
      "results" in rawServices &&
      Array.isArray((rawServices as any).results)
    ) {
      return (rawServices as any).results;
    }
    return [];
  }, [rawServices]);

  useEffect(() => {
    if (initialServiceId) {
      setSelectedId(initialServiceId);
    } else if (servicesList.length > 0 && selectedId === null) {
      setSelectedId(servicesList[0].id);
    }
  }, [initialServiceId, servicesList, selectedId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) {
      setError("Veuillez sélectionner un service parmi ceux disponibles.");
      return;
    }
    setError("");
    onSubmit(selectedId);
  };

  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col justify-center">
      {/* Badge d'étape */}
      <div className="mb-3">
        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-brand-sand text-muted-foreground">
          Étape {stepNumber} sur {totalSteps}
        </span>
      </div>

      {/* En-tête */}
      <h1 className="text-2xl sm:text-3xl font-bold text-brand-ink tracking-tight mb-2">
        Quel service proposez-vous ?
      </h1>
      <p className="text-muted-foreground text-sm sm:text-base mb-6">
        Sélectionnez le service principal qui correspond à votre expertise dans
        notre catalogue.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-xl bg-brand-green/10 border border-brand-green/25 text-brand-violet text-sm">
          {error}
        </div>
      )}

      {isServicesLoading ? (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-muted-foreground">
          <Loader2 className="w-8 h-8 animate-spin text-brand-violet" />
          <span className="text-xs">
            Chargement des services depuis la base de données...
          </span>
        </div>
      ) : servicesList.length === 0 ? (
        <div className="p-6 rounded-2xl bg-brand-sand/40 border border-brand-ink/8 text-center text-muted-foreground text-sm">
          Aucun service configuré dans le catalogue pour le moment.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Grille des services */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 max-h-[300px] overflow-y-auto p-1">
            {servicesList.map(
              (service: { id: number; name: string; description?: string }) => {
                const isSelected = selectedId === service.id;

                return (
                  <div
                    key={service.id}
                    onClick={() => setSelectedId(service.id)}
                    className={`relative p-4 rounded-2xl cursor-pointer flex flex-col items-start justify-between min-h-[95px] transition-all duration-150 ${
                      isSelected
                        ? "border-2 border-brand-ink bg-brand-sand/50"
                        : "border border-brand-ink/12 bg-white hover:border-brand-ink/25"
                    }`}
                  >
                    {isSelected && (
                      <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-brand-green" />
                    )}

                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center mb-3 ${
                        isSelected
                          ? "bg-white text-brand-violet"
                          : "bg-brand-sand/60 text-muted-foreground"
                      }`}
                    >
                      <Layers className="w-4.5 h-4.5" />
                    </div>

                    <div>
                      <span className="font-semibold text-xs sm:text-sm text-brand-ink tracking-tight block">
                        {service.name}
                      </span>
                      {service.description && (
                        <span className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5 block">
                          {service.description}
                        </span>
                      )}
                    </div>
                  </div>
                );
              }
            )}
          </div>

          {/* Boutons de navigation */}
          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-brand-ink/12 bg-white text-muted-foreground font-medium hover:bg-brand-sand/60 transition-colors cursor-pointer text-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Retour</span>
            </Button>

            <Button
              type="submit"
              disabled={isLoading || !selectedId}
              className="inline-flex items-center gap-2 px-7 py-3 rounded-xl bg-brand-green hover:bg-brand-green-hover text-brand-ink font-medium transition-all duration-150 disabled:opacity-50 cursor-pointer text-sm"
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

          {/* Conseil de visibilité */}
          <div className="p-4 rounded-2xl bg-brand-sand/50 border border-brand-ink/8 flex items-center gap-3.5">
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center text-brand-violet shrink-0">
              <Star className="w-5 h-5 fill-brand-peach text-brand-green" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-brand-ink">
                Conseil de visibilité
              </h4>
              <p className="text-xs text-muted-foreground">
                Sélectionnez votre service principal pour un positionnement
                clair auprès des clients.
              </p>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};
