import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  ShieldCheck,
  X,
  XCircle,
  AlertCircle,
  Receipt,
  Smartphone,
} from "lucide-react";
import {
  confirmerNumeroPaiement,
  getHistoriquePaiement,
  initierPaiementMission,
} from "../api/paiementApi";

// ── Palette commune au dashboard (annonceur / freelance) ────────────────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

const formatFCFA = (val: number | string | undefined | null) => {
  if (!val) return "0 FCFA";
  const num = typeof val === "string" ? parseFloat(val) : val;
  return `${new Intl.NumberFormat("fr-FR").format(num)} FCFA`;
};

const formatDate = (val: string | null | undefined) => {
  if (!val) return "Non effectué";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(val));
};

// ── 1. Modal Confirmation Numéro Mobile Money (Freelance) ──────────────────
interface ConfirmNumeroModalProps {
  propositionId: number;
  operateur: string;
  onClose: () => void;
  onConfirmed?: () => void;
}

export const ConfirmNumeroModal: React.FC<ConfirmNumeroModalProps> = ({
  propositionId,
  operateur,
  onClose,
  onConfirmed,
}) => {
  const [numero, setNumero] = useState("");
  const [step, setStep] = useState<"saisie" | "recap">("saisie");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const cleanedNumero = numero.trim();

  const mutation = useMutation({
    mutationFn: () =>
      confirmerNumeroPaiement({ propositionId, numero: cleanedNumero }),
    onSuccess: () => {
      onConfirmed?.();
      onClose();
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error ||
        "Erreur lors de la confirmation du numéro.";
      setErrorMsg(msg);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 dark:bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[28px] bg-white dark:bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-brand-sand dark:hover:bg-muted hover:text-brand-ink dark:hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground">
              Numéro de paiement Mobile Money
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Opérateur requis pour cette mission :{" "}
              <span className="font-bold text-brand-ink dark:text-foreground uppercase">
                {operateur}
              </span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-brand-green/25 bg-brand-green/10 p-3 text-[11px] text-brand-violet dark:text-violet-300">
            {errorMsg}
          </div>
        )}

        {step === "saisie" ? (
          <>
            <div className="mb-5 space-y-3 text-[11px] text-muted-foreground">
              <p className="leading-relaxed">
                Veuillez saisir le numéro sur lequel vous souhaitez recevoir le
                paiement net une fois la livraison validée.
              </p>

              <div>
                <label className="mb-1 block font-semibold text-muted-foreground">
                  Numéro {operateur} (ex : 771234567) :
                </label>
                <input
                  type="text"
                  value={numero}
                  onChange={(e) => setNumero(e.target.value)}
                  placeholder="Saisissez votre numéro mobile money..."
                  className="w-full rounded-xl border border-brand-ink/15 dark:border-border bg-brand-sand/40 dark:bg-muted/40 px-3 py-2 text-[12px] font-medium outline-none focus:border-brand-green"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-brand-ink/6 dark:border-border pt-4">
              <button
                onClick={onClose}
                className="rounded-xl border border-brand-ink/15 dark:border-border px-3.5 py-2 text-[11px] font-medium text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setStep("recap");
                }}
                disabled={!cleanedNumero}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-[11px] font-bold text-white hover:bg-brand-ink/85 dark:hover:bg-black/65 disabled:opacity-50"
              >
                Continuer
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 space-y-3 text-[11px] text-muted-foreground">
              <p className="leading-relaxed font-semibold text-brand-ink dark:text-foreground">
                Êtes-vous sûr que c'est ce numéro sur lequel vous souhaitez
                recevoir le paiement ?
              </p>

              <div className="rounded-2xl bg-brand-sand/60 dark:bg-muted/60 border border-brand-ink/8 dark:border-border p-4 text-center">
                <span className="block text-[9.5px] font-bold text-muted-foreground uppercase tracking-wide mb-1">
                  Numéro {operateur}
                </span>
                <span className="text-base font-bold text-brand-ink dark:text-foreground tracking-wide">
                  {cleanedNumero}
                </span>
              </div>

              <p className="flex items-start gap-1.5 rounded-xl border border-brand-peach/40 bg-brand-peach/10 dark:bg-brand-peach/10 p-2.5 text-[10.5px] text-brand-ink dark:text-foreground leading-relaxed">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                Une fois confirmé, ce numéro ne pourra plus être modifié.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-brand-ink/6 dark:border-border pt-4">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setStep("saisie");
                }}
                disabled={mutation.isPending}
                className="rounded-xl border border-brand-ink/15 dark:border-border px-3.5 py-2 text-[11px] font-medium text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 disabled:opacity-50"
              >
                Non, modifier
              </button>
              <button
                onClick={() => mutation.mutate()}
                disabled={mutation.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-[11px] font-bold text-brand-ink dark:text-primary-foreground hover:bg-brand-green-hover disabled:opacity-50"
              >
                {mutation.isPending && (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                )}
                Oui, confirmer ce numéro
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ── 2. Modal Initiation Paiement PayDunya (Annonceur) ─────────────────────
interface InitiatePaymentModalProps {
  missionId: number;
  missionTitle: string;
  budget: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const InitiatePaymentModal: React.FC<InitiatePaymentModalProps> = ({
  missionId,
  missionTitle,
  budget,
  onClose,
  onSuccess,
}) => {
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const commissionRate = 0.1;
  const montantCommission = budget * commissionRate;
  const montantNet = budget - montantCommission;

  const mutation = useMutation({
    mutationFn: () => initierPaiementMission(missionId),
    onSuccess: (data) => {
      onSuccess?.();
      if (data.payment_url) {
        window.open(data.payment_url, "_blank");
      }
      onClose();
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setErrorMsg(
          "Un paiement est déjà en cours ou a été effectué pour cette mission."
        );
      } else {
        const msg =
          err.response?.data?.error ||
          "Impossible d'initier le paiement PayDunya.";
        setErrorMsg(msg);
      }
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 dark:bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-white dark:bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-brand-sand dark:hover:bg-muted hover:text-brand-ink dark:hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground">
              Payer la mission avec PayDunya
            </h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-sm">
              Mission :{" "}
              <span className="font-semibold text-brand-ink dark:text-foreground">
                {missionTitle}
              </span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-brand-green/25 bg-brand-green/10 p-3 text-[11px] text-brand-violet dark:text-violet-300">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mb-5 space-y-3 rounded-2xl bg-brand-sand/50 dark:bg-muted/50 border border-brand-ink/8 dark:border-border p-4 text-[11px]">
          <div className="flex items-center justify-between border-b border-brand-ink/8 dark:border-border pb-2">
            <span className="text-muted-foreground">Montant total brut :</span>
            <span className="font-bold text-brand-ink dark:text-foreground text-xs">
              {formatFCFA(budget)}
            </span>
          </div>

          <div className="flex items-center justify-between text-muted-foreground">
            <span>Commission service Teranga Work (10%) :</span>
            <span className="font-semibold text-brand-ink dark:text-foreground">
              {formatFCFA(montantCommission)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-brand-ink/8 dark:border-border pt-2 text-brand-ink dark:text-foreground">
            <span className="font-semibold">Reversé au freelance (net) :</span>
            <span className="font-bold text-brand-ink dark:text-foreground">
              {formatFCFA(montantNet)}
            </span>
          </div>
        </div>

        <p className="mb-5 text-[10.5px] leading-relaxed text-muted-foreground">
          En cliquant sur{" "}
          <span className="font-bold text-brand-ink dark:text-foreground">« Payer maintenant »</span>
          , vous serez redirigé vers la passerelle sécurisée PayDunya (Wave,
          Orange Money, Carte bancaire). Une fois le paiement confirmé, le
          montant net sera automatiquement reversé au freelance.
        </p>

        <div className="flex items-center justify-end gap-2 border-t border-brand-ink/6 dark:border-border pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-brand-ink/15 dark:border-border px-3.5 py-2 text-[11px] font-medium text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-green px-4 py-2 text-[11px] font-bold text-brand-ink dark:text-primary-foreground hover:bg-brand-green-hover disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ExternalLink className="h-3.5 w-3.5" />
            )}
            Payer maintenant sur PayDunya
          </button>
        </div>
      </div>
    </div>
  );
};

// ── 3. Modal Historique & Traçabilité Paiement (Annonceur & Freelance) ─────
interface HistoriquePaiementModalProps {
  missionId: number;
  missionTitle: string;
  onClose: () => void;
}

export const HistoriquePaiementModal: React.FC<
  HistoriquePaiementModalProps
> = ({ missionId, missionTitle, onClose }) => {
  const {
    data: paiement,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["historique-paiement", missionId],
    queryFn: () => getHistoriquePaiement(missionId),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 dark:bg-black/65 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-white dark:bg-card p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-brand-sand dark:hover:bg-muted hover:text-brand-ink dark:hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground">
              Historique de paiement & traçabilité
            </h3>
            <p className="text-[11px] text-muted-foreground truncate max-w-xs">
              {missionTitle}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin text-brand-violet dark:text-violet-300" />
            Chargement de l'historique...
          </div>
        )}

        {isError && (
          <div className="my-6 rounded-xl border border-brand-peach/40 bg-brand-peach/15 dark:bg-brand-peach/10 p-4 text-center text-[11px] text-brand-ink dark:text-foreground">
            Aucun historique de paiement enregistré pour cette mission.
          </div>
        )}

        {paiement && (
          <div className="space-y-4">
            {/* Répartition financière */}
            <div className="rounded-2xl border border-brand-ink/8 dark:border-border bg-brand-sand/50 dark:bg-muted/50 p-4 text-[11px] space-y-2">
              <div className="flex justify-between text-muted-foreground">
                <span>Annonceur :</span>
                <span className="font-semibold text-brand-ink dark:text-foreground">
                  {paiement.annonceur_nom}
                </span>
              </div>
              <div className="flex justify-between text-muted-foreground">
                <span>Freelance :</span>
                <span className="font-semibold text-brand-ink dark:text-foreground">
                  {paiement.freelance_nom}
                </span>
              </div>
              <div className="flex justify-between border-t border-brand-ink/8 dark:border-border pt-2">
                <span className="text-muted-foreground">Montant brut :</span>
                <span className="font-bold text-brand-ink dark:text-foreground">
                  {formatFCFA(paiement.montant_brut)}
                </span>
              </div>
              <div className="flex justify-between text-brand-ink dark:text-foreground">
                <span>
                  Commission Teranga Work ({parseFloat(paiement.taux_commission) * 100}
                  %) :
                </span>
                <span className="font-semibold">
                  {formatFCFA(paiement.montant_commission)}
                </span>
              </div>
              <div className="flex justify-between border-t border-brand-ink/8 dark:border-border pt-1 font-bold text-brand-ink dark:text-foreground">
                <span>Montant net freelance :</span>
                <span>{formatFCFA(paiement.montant_net)}</span>
              </div>
            </div>

            {/* Statuts du cycle de vie */}
            <div className="grid grid-cols-2 gap-3 text-[10.5px]">
              <div className="rounded-2xl border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-3 space-y-1.5">
                <span className="text-[9.5px] font-bold text-muted-foreground">
                  1. Collecte annonceur
                </span>
                <div>
                  {paiement.statut_collecte === "REUSSI" && (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-ink dark:text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" />{" "}
                      Réussie
                    </span>
                  )}
                  {paiement.statut_collecte === "EN_ATTENTE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-ink dark:text-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> En attente
                    </span>
                  )}
                  {paiement.statut_collecte === "ECHOUE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-violet dark:text-violet-300">
                      <XCircle className="h-3.5 w-3.5" /> Échouée
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-[9px]">
                  Date : {formatDate(paiement.date_collecte)}
                </p>
                {paiement.reference_collecte && (
                  <p className="text-muted-foreground font-mono text-[8.5px] truncate">
                    Réf : {paiement.reference_collecte}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-3 space-y-1.5">
                <span className="text-[9.5px] font-bold text-muted-foreground">
                  2. Versement freelance
                </span>
                <div>
                  {paiement.statut_decaissement === "REUSSI" && (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-ink dark:text-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" />{" "}
                      Réussi
                    </span>
                  )}
                  {paiement.statut_decaissement === "EN_ATTENTE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-ink dark:text-foreground">
                      <Clock3 className="h-3.5 w-3.5" /> En cours
                    </span>
                  )}
                  {paiement.statut_decaissement === "NON_DECLENCHE" && (
                    <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                      Non déclenché
                    </span>
                  )}
                  {paiement.statut_decaissement === "ECHOUE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-brand-violet dark:text-violet-300">
                      <XCircle className="h-3.5 w-3.5" /> Échoué
                    </span>
                  )}
                </div>
                <p className="text-muted-foreground text-[9px]">
                  Date : {formatDate(paiement.date_decaissement)}
                </p>
                {paiement.reference_decaissement && (
                  <p className="text-muted-foreground font-mono text-[8.5px] truncate">
                    Réf : {paiement.reference_decaissement}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-brand-ink/6 dark:border-border pt-4 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-brand-ink/15 dark:border-border px-4 py-1.5 text-[11px] font-medium text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
