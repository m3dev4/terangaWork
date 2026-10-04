import React, { useState } from 'react';
import { Briefcase, Plus, Trash2, Calendar, Loader2, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchExperiences,
  createExperience,
  deleteExperience,
  type ExperienceData,
} from '../../api/freelanceApi';

export const ExperienceTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: experiences = [], isLoading } = useQuery<ExperienceData[]>({
    queryKey: ['experiences'],
    queryFn: fetchExperiences,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [poste, setPoste] = useState('');
  const [entreprise, setEntreprise] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [current, setCurrent] = useState(false);
  const [description, setDescription] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: Omit<ExperienceData, 'id'>) => createExperience(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['freelanceProfile'] });
      setPoste('');
      setEntreprise('');
      setStartDate('');
      setEndDate('');
      setCurrent(false);
      setDescription('');
      setIsAdding(false);
      setSuccessMsg('Expérience ajoutée avec succès !');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteExperience(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['experiences'] });
      queryClient.invalidateQueries({ queryKey: ['freelanceProfile'] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!poste.trim() || !entreprise.trim() || !startDate) return;

    createMutation.mutate({
      poste: poste.trim(),
      entreprise: entreprise.trim(),
      startDate,
      endDate: current ? null : endDate || null,
      current,
      description: description.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-ink" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-sand bg-white p-6 sm:p-8 shadow-xs max-w-3xl space-y-6 text-[11px]">
      <div className="flex items-center justify-between border-b border-brand-sand pb-4">
        <div>
          <h3 className="font-heading text-xs font-bold text-brand-ink flex items-center gap-1.5">
            <Briefcase className="h-3.5 w-3.5 text-brand-ink" /> Parcours & Expériences Professionnelles
          </h3>
          <p className="text-muted-foreground mt-0.5">
            Vos expériences enregistrées en base de données backend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-brand-violet cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une expérience
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 p-3 font-semibold text-emerald-700">
          <CheckCircle className="h-4 w-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="rounded-xl bg-brand-canvas border border-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-600 mb-1">Poste / Intitulé *</label>
              <input
                type="text"
                required
                value={poste}
                onChange={(e) => setPoste(e.target.value)}
                placeholder="ex: Développeur Fullstack React & Django"
                className="w-full rounded-md border border-border bg-white p-2 outline-none focus:border-brand-violet"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-600 mb-1">Entreprise / Organisation *</label>
              <input
                type="text"
                required
                value={entreprise}
                onChange={(e) => setEntreprise(e.target.value)}
                placeholder="ex: Jokko Tech"
                className="w-full rounded-md border border-border bg-white p-2 outline-none focus:border-brand-violet"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-600 mb-1">Date de début *</label>
              <input
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-md border border-border bg-white p-2 outline-none focus:border-brand-violet"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-600 mb-1">Date de fin</label>
              <input
                type="date"
                disabled={current}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-md border border-border bg-white p-2 outline-none focus:border-brand-violet disabled:bg-neutral-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="currentExp"
              checked={current}
              onChange={(e) => setCurrent(e.target.checked)}
              className="rounded border-border"
            />
            <label htmlFor="currentExp" className="text-[11px] font-medium text-brand-ink cursor-pointer">
              Poste actuel (en cours)
            </label>
          </div>

          <div>
            <label className="block font-semibold text-neutral-600 mb-1">Description des missions</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez vos accomplissements clés..."
              className="w-full rounded-md border border-border bg-white p-2 outline-none focus:border-brand-violet"
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-md border border-neutral-300 px-3.5 py-1.5 font-semibold text-neutral-600 cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-md bg-brand-violet px-4 py-1.5 font-semibold text-white hover:bg-brand-violet cursor-pointer disabled:opacity-50"
            >
              {createMutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {/* List from DB */}
      {experiences.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Aucune expérience enregistrée. Cliquez sur "Ajouter une expérience" pour commencer.
        </div>
      ) : (
        <div className="space-y-3">
          {experiences.map((exp) => (
            <div
              key={exp.id}
              className="flex items-start justify-between rounded-xl border border-brand-sand bg-brand-canvas p-4"
            >
              <div className="space-y-1">
                <h4 className="font-heading text-xs font-bold text-brand-ink">{exp.poste}</h4>
                <p className="font-semibold text-brand-ink">{exp.entreprise}</p>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {exp.startDate} {exp.current ? ' - Présent' : exp.endDate ? ` à ${exp.endDate}` : ''}
                  </span>
                </div>
                {exp.description && (
                  <p className="mt-2 text-neutral-600 text-[10.5px] leading-relaxed whitespace-pre-line">
                    {exp.description}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(exp.id)}
                className="text-muted-foreground hover:text-red-500 cursor-pointer p-1"
                title="Supprimer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ExperienceTab;
