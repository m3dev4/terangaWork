import React, { useState, useEffect } from 'react';
import { Code2, Plus, X, Save, CheckCircle, Loader2, Sparkles, Briefcase } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchFreelanceProfile,
  updateFreelanceProfile,
  fetchServices,
  proposeService,
  fetchTechnologies,
  addTechnology,
  type ServiceData,
  type TechnologieData,
} from '../../api/freelanceApi';

interface ServicesTechTabProps {
  user?: any;
}

export const ServicesTechTab: React.FC<ServicesTechTabProps> = () => {
  const queryClient = useQueryClient();

  // ─── Real DB Queries ─────────────────────────
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ['freelanceProfile'],
    queryFn: fetchFreelanceProfile,
  });

  const { data: availableServices = [], isLoading: isServicesLoading } = useQuery({
    queryKey: ['servicesList'],
    queryFn: fetchServices,
  });

  const { data: availableTechs = [], isLoading: isTechsLoading } = useQuery({
    queryKey: ['technologiesList'],
    queryFn: fetchTechnologies,
  });

  // ─── Local Form State initialized from DB ────
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [selectedTechIds, setSelectedTechIds] = useState<number[]>([]);
  const [customServiceName, setCustomServiceName] = useState('');
  const [customTechName, setCustomTechName] = useState('');
  const [showProposeService, setShowProposeService] = useState(false);
  const [showAddTech, setShowAddTech] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (profile) {
      if (profile.service) {
        setSelectedServiceId(profile.service);
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
        service: selectedServiceId,
        technologies: selectedTechIds,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['freelanceProfile'] });
      queryClient.invalidateQueries({ queryKey: ['missions-compatibilite'] });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    },
  });

  const proposeServiceMutation = useMutation({
    mutationFn: (name: string) => proposeService({ name }),
    onSuccess: (newService: ServiceData) => {
      queryClient.invalidateQueries({ queryKey: ['servicesList'] });
      setSelectedServiceId(newService.id);
      setCustomServiceName('');
      setShowProposeService(false);
    },
  });

  const addTechMutation = useMutation({
    mutationFn: (name: string) => addTechnology({ name }),
    onSuccess: (newTech: TechnologieData) => {
      queryClient.invalidateQueries({ queryKey: ['technologiesList'] });
      if (!selectedTechIds.includes(newTech.id)) {
        setSelectedTechIds([...selectedTechIds, newTech.id]);
      }
      setCustomTechName('');
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
        <Loader2 className="h-6 w-6 animate-spin text-brand-ink" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-6 sm:p-8 shadow-xs max-w-3xl space-y-6 text-[11px]">
      {savedSuccess && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 font-semibold text-emerald-700">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          Service principal et technologies enregistrés dans votre profil avec succès !
        </div>
      )}

      {/* ─── Section 1: Predefined Services Selection ─── */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading text-xs font-bold text-brand-ink flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-brand-ink" /> Service Principal (Spécialité)
          </h3>
          <button
            type="button"
            onClick={() => setShowProposeService(!showProposeService)}
            className="text-[10px] font-semibold text-brand-ink hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Proposer un autre service
          </button>
        </div>
        <p className="text-muted-foreground mb-3">
          Sélectionnez le domaine de service géré par l'administration qui correspond le mieux à votre profil.
        </p>

        {showProposeService && (
          <form onSubmit={handleProposeServiceSubmit} className="flex gap-2 mb-3 bg-brand-canvas p-3 rounded-xl border border-border">
            <input
              type="text"
              value={customServiceName}
              onChange={(e) => setCustomServiceName(e.target.value)}
              placeholder="Nom du nouveau service à proposer (ex: IA & Machine Learning)..."
              className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] outline-none focus:border-brand-violet"
            />
            <button
              type="submit"
              disabled={proposeServiceMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-violet px-3.5 py-1.5 font-semibold text-white hover:bg-brand-violet disabled:opacity-50"
            >
              {proposeServiceMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ajouter au catalogue'}
            </button>
          </form>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {availableServices.map((service) => {
            const isSelected = selectedServiceId === service.id;
            return (
              <button
                type="button"
                key={service.id}
                onClick={() => setSelectedServiceId(service.id)}
                className={`flex items-center justify-between text-left p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'border-brand-violet bg-brand-sand text-brand-ink font-bold shadow-xs'
                    : 'border-border bg-white text-brand-ink hover:border-neutral-300'
                }`}
              >
                <div>
                  <div className="text-[11.5px]">{service.name}</div>
                  {service.description && (
                    <div className="text-[9.5px] text-muted-foreground font-normal line-clamp-1">{service.description}</div>
                  )}
                </div>
                {isSelected && <CheckCircle className="h-4 w-4 text-brand-ink shrink-0" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Section 2: Technologies Catalogue Selection ─── */}
      <div className="border-t border-brand-sand pt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-heading text-xs font-bold text-brand-ink flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-brand-violet" /> Technologies & Outils du Catalogue
          </h3>
          <button
            type="button"
            onClick={() => setShowAddTech(!showAddTech)}
            className="text-[10px] font-semibold text-brand-ink hover:underline flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Ajouter une autre techno
          </button>
        </div>
        <p className="text-muted-foreground mb-3">
          Cochez les technologies du catalogue officiel que vous maîtrisez.
        </p>

        {showAddTech && (
          <form onSubmit={handleAddTechSubmit} className="flex gap-2 mb-3 bg-brand-canvas p-3 rounded-xl border border-border">
            <input
              type="text"
              value={customTechName}
              onChange={(e) => setCustomTechName(e.target.value)}
              placeholder="Nom de la nouvelle techno (ex: Rust, Flutter)..."
              className="flex-1 rounded-lg border border-border bg-white px-3 py-1.5 text-[11px] outline-none focus:border-brand-violet"
            />
            <button
              type="submit"
              disabled={addTechMutation.isPending}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-violet px-3.5 py-1.5 font-semibold text-white hover:bg-brand-violet disabled:opacity-50"
            >
              {addTechMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Ajouter'}
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
                    ? 'bg-brand-violet text-white border-brand-violet shadow-xs'
                    : 'bg-brand-canvas text-brand-ink border-border hover:border-neutral-300'
                }`}
              >
                {tech.imgUrl ? (
                  <img src={tech.imgUrl} alt={tech.name} className="h-3.5 w-3.5 object-contain" />
                ) : (
                  <Code2 className="h-3 w-3 text-brand-violet" />
                )}
                {tech.name}
                {isSelected ? <X className="h-3 w-3 ml-1 text-white/80 hover:text-white" /> : <Plus className="h-3 w-3 ml-0.5 text-muted-foreground" />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="border-t border-brand-sand pt-4 flex justify-end">
        <button
          type="button"
          disabled={saveMutation.isPending}
          onClick={() => saveMutation.mutate()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-6 py-2.5 font-semibold text-white hover:bg-brand-violet cursor-pointer disabled:opacity-50"
        >
          {saveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          Enregistrer les modifications
        </button>
      </div>
    </div>
  );
};

export default ServicesTechTab;
