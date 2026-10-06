import React, { useState } from 'react';
import { ExternalLink, FolderGit2, Plus, Trash2, Loader2, CheckCircle } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchRealisations,
  createRealisation,
  deleteRealisation,
  type RealisationData,
} from '../../api/freelanceApi';

export const RealisationTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: realisations = [], isLoading } = useQuery<RealisationData[]>({
    queryKey: ['realisations'],
    queryFn: fetchRealisations,
  });

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState('');
  const [link, setLink] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const createMutation = useMutation({
    mutationFn: (data: Omit<RealisationData, 'id'>) => createRealisation(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realisations'] });
      queryClient.invalidateQueries({ queryKey: ['freelanceProfile'] });
      setTitle('');
      setLink('');
      setIsAdding(false);
      setSuccessMsg('Réalisation ajoutée avec succès !');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRealisation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['realisations'] });
      queryClient.invalidateQueries({ queryKey: ['freelanceProfile'] });
    },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    createMutation.mutate({
      title: title.trim(),
      link: link.trim(),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-brand-ink dark:text-foreground" />
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-brand-sand dark:border-border bg-white dark:bg-card p-6 sm:p-8 shadow-xs max-w-3xl space-y-6 text-[11px]">
      <div className="flex items-center justify-between border-b border-brand-sand dark:border-border pb-4">
        <div>
          <h3 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground flex items-center gap-1.5">
            <FolderGit2 className="h-4 w-4 text-brand-ink dark:text-foreground" /> Portfolio & Réalisations
          </h3>
          <p className="text-muted-foreground mt-0.5">
            Vos projets et liens enregistrés en base de données backend.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsAdding(!isAdding)}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand-violet px-3.5 py-2 text-[11px] font-semibold text-white hover:bg-brand-violet cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" /> Ajouter une réalisation
        </button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30 p-3 font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-600 dark:text-emerald-300" />
          {successMsg}
        </div>
      )}

      {isAdding && (
        <form onSubmit={handleAdd} className="rounded-xl bg-brand-canvas dark:bg-background border border-border p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">Titre du Projet *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="ex: Plateforme E-Commerce Mobile Money"
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>
            <div>
              <label className="block font-semibold text-neutral-600 dark:text-muted-foreground mb-1">Lien Web / Démo</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://votre-projet.com"
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="rounded-md border border-neutral-300 dark:border-border px-3.5 py-1.5 font-semibold text-neutral-600 dark:text-muted-foreground cursor-pointer"
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
      {realisations.length === 0 ? (
        <div className="py-8 text-center text-muted-foreground">
          Aucune réalisation enregistrée. Cliquez sur "Ajouter une réalisation" pour commencer.
        </div>
      ) : (
        <div className="space-y-3">
          {realisations.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-xl border border-brand-sand dark:border-border bg-brand-canvas dark:bg-background p-4"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <FolderGit2 className="h-4 w-4 text-brand-ink dark:text-foreground" />
                  <h4 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground">{item.title}</h4>
                  {item.link && (
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-brand-ink dark:text-foreground hover:underline ml-2"
                    >
                      Voir démo <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  )}
                </div>
              </div>

              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(item.id)}
                className="text-muted-foreground hover:text-red-500 dark:hover:text-red-300 cursor-pointer p-1"
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

export default RealisationTab;
