import React, { useState, useEffect } from "react";
import {
  Code2,
  Plus,
  X,
  Save,
  CheckCircle,
  Loader2,
  Sparkles,
  Briefcase,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchFreelanceProfile,
  updateFreelanceProfile,
  fetchServices,
  proposeService,
  fetchTechnologies,
  addTechnology,
  type ServiceData,
  type TechnologieData,
} from "../../api/freelanceApi";

interface ServicesTechTabProps {
  user?: any;
}

export const ServicesTechTab: React.FC<ServicesTechTabProps> = () => {
  const queryClient = useQueryClient();

  // ─── Real DB Queries ─────────────────────────
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["freelanceProfile"],
    queryFn: fetchFreelanceProfile,
  });

  const { data: availableServices = [], isLoading: isServicesLoading } =
    useQuery({
      queryKey: ["servicesList"],
      queryFn: fetchServices,
    });

  const { data: availableTechs = [], isLoading: isTechsLoading } = useQuery({
    queryKey: ["technologiesList"],
    queryFn: fetchTechnologies,
  });

  // ─── Local Form State initialized from DB ────
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>([]);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [customServiceName, setCustomServiceName] = useState("");
  const [customTechName, setCustomTechName] = useState("");
  const [showProposeService, setShowProposeService] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.services && profile.services.length > 0) {
        setSelectedServiceIds(profile.services);
      } else if (profile.service) {
        // Compatibilité ascendante
        setSelectedServiceIds([profile.service]);
      }
      if (profile.technologies) {
        setSelectedTechIds(profile.technologies);
      }
    }
  }, [profile]);

  // ─── Mutations ──────────────────────────────
  const saveMutation = useMutation({
    mutationFn: () =>
      updateFreelanceProfile({
        services: selectedServiceIds,
        technologies: selectedTechIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["freelanceProfile"] });
      queryClient.invalidateQueries({ queryKey: ["missions-compatibilite"] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const proposeServiceMutation = useMutation({
    mutationFn: (name: string) => proposeService({ name }),
    onSuccess: (newService: ServiceData) => {
      queryClient.invalidateQueries({ queryKey: ["servicesList"] });
      setSelectedServiceId(newService.id);
      setCustomServiceName("");
      setShowProposeService(false);
    },
  });

  const addTechMutation = useMutation({
    mutationFn: (name: string) => addTechnology({ name }),
    onSuccess: (newTech: TechnologieData) => {
      queryClient.invalidateQueries({ queryKey: ["technologiesList"] });
      if (!selectedTechIds.includes(newTech.id)) {
        setSelectedTechIds([...selectedTechIds, newTech.id]);
      }
      setCustomTechName("");
      setShowAddTech(false);
    },
  });

  const toggleTech = (techId: number) => {
    if (selectedTechIds.includes(techId)) {
      setSelectedTechIds(selectedTechIds.filter((id) => id !== techId));
    } else {
      setSelectedTechIds([...selectedTechIds, techId]);
    }
  };

  const handleProposeServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customServiceName.trim()) {
      proposeServiceMutation.mutate(customServiceName.trim());
    }
  };

  const handleAddTechSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTechName.trim()) {
      addTechMutation.mutate(customTechName.trim());
    }
  };

  if (isProfileLoading || isServicesLoading || isTechsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-ink dark:text-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-sand dark:border-border bg-white dark:bg-card p-6 sm:p-8 shadow-xs max-w-3xl space-y-6 text-[11px]">
      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          Service principal et technologies enregistrés dans votre profil avec
          succès !
        </div>
      )}

      {/* ─── Section 1: Predefined Services Selection ─── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-brand-ink dark:text-foreground" />{" "}
            Service Principal (Spécialité)
          </h3>
          <button
            type="button"
            onClick={() => setShowProposeService(!showProposeService)}
            className="text-[10px] font-semibold text-brand-ink dark:text-foreground hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Proposer un autre service
          </button>
        </div>
        <p className="text-muted-foreground mb-3">
          Sélectionnez le domaine de service géré par l'administration qui
          correspond le mieux à votre profil.
        </p>

        {showProposeService && (
          <form
            onSubmit={handleProposeServiceSubmit}
            className="flex gap-2 mb-3 bg-brand-canvas dark:bg-background p-3 rounded-xl border border-border"
          >
            <input
              type="text"
              value={customServiceName}
              onChange={(e) => setCustomServiceName(e.target.value)}
              placeholder="Nom du nouveau service à proposer (ex: IA & Machine Learning)..."
              className="flex-1 rounded-lg border border-border bg-white dark:bg-card px-3 py-1.5 text-[11px] outline-none focus:border-brand-violet dark:focus:border-violet-300"
            />
            <button
              type="submit"
              disabled={proposeServiceMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-violet px-3.5 py-1.5 font-semibold text-white hover:bg-brand-violet disabled:opacity-50"
            >
              {proposeServiceMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Ajouter au catalogue"
              )}
            </button>
          </form>
        )}

        <div className="mb-3">
          <div className="text-xs text-muted-foreground mb-2">
            {selectedServiceIds.length === 0 ? (
              <span className="text-orange-500">
                Sélectionnez entre 1 et 3 services
              </span>
            ) : (
              <span>{selectedServiceIds.length} / 3 services sélectionnés</span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableServices.map((service) => {
            const isSelected = selectedServiceIds.includes(service.id);
            const selectionIndex = isSelected
              ? selectedServiceIds.indexOf(service.id) + 1
              : 0;

            const handleServiceClick = () => {
              if (selectedServiceIds.includes(service.id)) {
                // Désélectionner
                setSelectedServiceIds(
                  selectedServiceIds.filter((id) => id !== service.id)
                );
              } else {
                // Vérifier la limite de 3 services
                if (selectedServiceIds.length >= 3) {
                  alert(
                    "Vous ne pouvez pas sélectionner plus de 3 services. Désélectionnez d'abord un service."
                  );
                  return;
                }
                // Sélectionner
                setSelectedServiceIds([...selectedServiceIds, service.id]);
              }
            };

            return (
              <button
                type="button"
                key={service.id}
                onClick={handleServiceClick}
                className={`flex items-center justify-between text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? "border-brand-violet dark:border-violet-300 bg-brand-sand dark:bg-muted text-brand-ink dark:text-foreground font-bold shadow-xs"
                    : "border-border bg-white dark:bg-card text-brand-ink dark:text-foreground hover:border-neutral-300 dark:hover:border-border"
                }`}
              >
                <div>
                  <div className="text-[11.5px]">{service.name}</div>
                  {service.description && (
                    <div className="text-[9.5px] text-muted-foreground font-normal line-clamp-1">
                      {service.description}
                    </div>
                  )}
                </div>
                {isSelected && (
                  <div className="flex items-center gap-1">
                    <span className="w-5 h-5 rounded-full bg-brand-violet text-white text-[10px] flex items-center justify-center">
                      {selectionIndex}
                    </span>
                    <CheckCircle className="h-4 w-4 text-brand-ink dark:text-foreground shrink-0" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Section 2: Technologies Catalogue Selection ─── */}
      <div className="border-t border-brand-sand dark:border-border pt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" />{" "}
            Technologies & Outils du Catalogue
          </h3>
          <button
            type="button"
            onClick={() => setShowAddTech(!showAddTech)}
            className="text-[10px] font-semibold text-brand-ink dark:text-foreground hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Ajouter une autre techno
          </button>
        </div>
        <p className="text-muted-foreground mb-3">
          Cochez les technologies du catalogue officiel que vous maîtrisez.
        </p>

        {showAddTech && (
          <form
            onSubmit={handleAddTechSubmit}
            className="flex gap-2 mb-3 bg-brand-canvas dark:bg-background p-3 rounded-xl border border-border"
          >
            <input
              type="text"
              value={customTechName}
              onChange={(e) => setCustomTechName(e.target.value)}
              placeholder="Nom de la nouvelle techno (ex: Rust, Flutter)..."
              className="flex-1 rounded-lg border border-border bg-white dark:bg-card px-3 py-1.5 text-[11px] outline-none focus:border-brand-violet dark:focus:border-violet-300"
            />
            <button
              type="submit"
              disabled={addTechMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-violet px-3.5 py-1.5 font-semibold text-white hover:bg-brand-violet disabled:opacity-50"
            >
              {addTechMutation.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                "Ajouter"
              )}
            </button>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {availableTechs.map((tech) => {
            const isSelected = selectedTechIds.includes(tech.id);
            return (
              <button
                type="button"
                key={tech.id}
                onClick={() => toggleTech(tech.id)}
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[10.5px] font-semibold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-brand-violet text-white border-brand-violet dark:border-violet-300 shadow-xs"
                    : "bg-brand-canvas dark:bg-background text-brand-ink dark:text-foreground border-border hover:border-neutral-300 dark:hover:border-border"
                }`}
              >
                {tech.imgUrl ? (
                  <img
                    src={tech.imgUrl}
                    alt={tech.name}
                    className="h-3.5 w-3.5 object-contain"
                  />
                ) : (
                  <Code2 className="h-3 w-3 text-brand-violet dark:text-violet-300" />
                )}
                {tech.name}
                {isSelected ? (
                  <X className="h-3 w-3 ml-1 text-white/80 hover:text-white" />
                ) : (
                  <Plus className="h-3 w-3 ml-0.5 text-muted-foreground" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-brand-sand dark:border-border pt-4 flex justify-end">
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-6 py-2.5 font-semibold text-white hover:bg-brand-violet cursor-pointer disabled:opacity-50"
        >
          {saveMutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
};

export default ServicesTechTab;
