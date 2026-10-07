import React, { useState } from "react";
import { X, Lock, Loader2, CheckCircle2 } from "lucide-react";
import { changePassword } from "../../api/userApi";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (newPassword !== confirmPassword) {
      setError("Les nouveaux mots de passe ne correspondent pas.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    try {
      setIsLoading(true);
      await changePassword({
        old_password: oldPassword,
        new_password: newPassword,
      });
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(
        err.response?.data?.message ||
          "Erreur lors du changement de mot de passe."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-muted-foreground hover:bg-neutral-100 dark:hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-5 flex items-center gap-3 border-b border-brand-sand dark:border-border pb-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-sand dark:bg-muted text-brand-ink dark:text-foreground">
            <Lock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-base font-bold text-brand-ink dark:text-foreground">
              Modifier le mot de passe
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Choisissez un nouveau mot de passe sécurisé pour votre compte.
            </p>
          </div>
        </div>

        {success ? (
          <div className="flex flex-col items-center justify-center py-6 text-center text-emerald-600 dark:text-emerald-300">
            <CheckCircle2 className="mb-2 h-10 w-10 animate-bounce" />
            <p className="text-sm font-bold">
              Mot de passe modifié avec succès !
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-[11px]">
            {error && (
              <div className="rounded-md bg-red-50 dark:bg-red-500/10 p-2.5 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-500/30">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">
                Mot de passe actuel
              </label>
              <input
                type="password"
                required
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2.5 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2.5 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>

            <div>
              <label className="mb-1 block font-semibold uppercase text-[10px] tracking-wider text-muted-foreground">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-md border border-border bg-white dark:bg-card p-2.5 outline-none focus:border-brand-violet dark:focus:border-violet-300"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-md border border-neutral-300 dark:border-border py-2.5 font-semibold text-neutral-600 dark:text-muted-foreground hover:bg-brand-canvas dark:hover:bg-background cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 rounded-md bg-brand-violet py-2.5 font-semibold text-white hover:bg-brand-violet disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Valider
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ChangePasswordModal;
