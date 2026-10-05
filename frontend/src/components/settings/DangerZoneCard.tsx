import React, { useState } from 'react';
import { AlertTriangle, X, Trash2, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { deleteAccount } from '../../api/userApi';

export const DangerZoneCard: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (pwd: string) => deleteAccount(pwd),
    onSuccess: () => {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      queryClient.clear();
      navigate('/login');
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.password?.[0] ||
        err.response?.data?.error ||
        err.response?.data?.detail ||
        'Erreur lors de la suppression du compte.';
      setError(typeof msg === 'string' ? msg : JSON.stringify(msg));
    },
  });

  const handleDeleteAccount = () => {
    if (!password) {
      setError('Le mot de passe est requis.');
      return;
    }
    setError(null);
    deleteMutation.mutate(password);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setPassword('');
    setError(null);
  };

  return (
    <div className="rounded-2xl border border-red-200 dark:border-red-500/30 bg-red-50/40 dark:bg-red-500/10 p-6 sm:p-7 shadow-xs">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300">
          <AlertTriangle className="h-5 w-5" />
        </div>

        <div className="flex-1">
          <h3 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground">
            Supprimer le compte
          </h3>
          <p className="mt-1 text-[11px] text-neutral-600 dark:text-muted-foreground leading-relaxed max-w-xl">
            La suppression de votre compte est{' '}
            <span className="font-bold text-red-600 dark:text-red-300">définitive</span> et entraînera la{' '}
            <span className="font-bold text-red-600 dark:text-red-300">perte immédiate</span> de toutes vos
            données, candidatures et historique de missions. Cette action ne peut pas être annulée.
          </p>

          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-[11px] font-bold text-white shadow-xs hover:bg-red-600 transition-colors cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" /> Supprimer mon compte
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white dark:bg-card p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleCloseModal}
              className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-300">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-base font-bold text-brand-ink dark:text-foreground">
                Confirmer la suppression
              </h3>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Pour confirmer, saisissez votre{' '}
                <span className="font-bold text-red-600 dark:text-red-300">mot de passe actuel</span> ci-dessous :
              </p>
            </div>

            <div className="space-y-4 text-[11px]">
              {error && (
                <div className="rounded-md bg-red-50 dark:bg-red-500/10 p-2.5 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30 text-center">
                  {error}
                </div>
              )}

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Votre mot de passe"
                className="w-full rounded-md border border-neutral-300 dark:border-border px-3.5 py-2.5 outline-none focus:border-red-500 text-center font-medium"
              />

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="flex-1 rounded-md border border-neutral-300 dark:border-border py-2.5 font-semibold text-neutral-600 dark:text-muted-foreground hover:bg-brand-canvas dark:hover:bg-background cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={!password || deleteMutation.isPending}
                  onClick={handleDeleteAccount}
                  className="flex-1 rounded-md bg-red-500 py-2.5 font-bold text-white hover:bg-red-600 disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {deleteMutation.isPending && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  )}
                  Confirmer la suppression
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DangerZoneCard;
