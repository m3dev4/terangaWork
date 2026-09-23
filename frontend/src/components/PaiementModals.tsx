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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => confirmerNumeroPaiement({ propositionId, numero }),
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111118]/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#111118]/35 hover:bg-[#F3EBDD] hover:text-[#111118]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3EBDD] text-[#D95C38]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#111118]">
              Numéro de paiement Mobile Money
            </h3>
            <p className="text-[11px] text-[#111118]/50">
              Opérateur requis pour cette mission :{" "}
              <span className="font-bold text-[#111118] uppercase">
                {operateur}
              </span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-xl border border-[#D95C38]/25 bg-[#D95C38]/10 p-3 text-[11px] text-[#c14f2f]">
            {errorMsg}
          </div>
        )}

        <div className="mb-5 space-y-3 text-[11px] text-[#111118]/60">
          <p className="leading-relaxed">
            Veuillez vérifier ou saisir le numéro sur lequel vous souhaitez
            recevoir le paiement net une fois la livraison validée.
          </p>

          <div>
            <label className="mb-1 block font-semibold text-[#111118]/70">
              Numéro {operateur} (ex : 771234567) :
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Saisissez votre numéro mobile money..."
              className="w-full rounded-xl border border-[#111118]/15 bg-[#F3EBDD]/40 px-3 py-2 text-[12px] font-medium outline-none focus:border-[#D95C38]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#111118]/6 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#111118]/15 px-3.5 py-2 text-[11px] font-medium text-[#111118]/60 hover:bg-[#F3EBDD]/60"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111118] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#111118]/85 disabled:opacity-50"
          >
            {mutation.isPending && (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            )}
            Confirmer le numéro
          </button>
        </div>
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111118]/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#111118]/35 hover:bg-[#F3EBDD] hover:text-[#111118]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3EBDD] text-[#D95C38]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#111118]">
              Payer la mission avec PayDunya
            </h3>
            <p className="text-[11px] text-[#111118]/50 truncate max-w-sm">
              Mission :{" "}
              <span className="font-semibold text-[#111118]">
                {missionTitle}
              </span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-[#D95C38]/25 bg-[#D95C38]/10 p-3 text-[11px] text-[#c14f2f]">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mb-5 space-y-3 rounded-2xl bg-[#F3EBDD]/50 border border-[#111118]/8 p-4 text-[11px]">
          <div className="flex items-center justify-between border-b border-[#111118]/8 pb-2">
            <span className="text-[#111118]/50">Montant total brut :</span>
            <span className="font-bold text-[#111118] text-xs">
              {formatFCFA(budget)}
            </span>
          </div>

          <div className="flex items-center justify-between text-[#111118]/60">
            <span>Commission service Jëfly (10%) :</span>
            <span className="font-semibold text-[#c9922e]">
              {formatFCFA(montantCommission)}
            </span>
          </div>

          <div className="flex items-center justify-between border-t border-[#111118]/8 pt-2 text-[#111118]">
            <span className="font-semibold">Reversé au freelance (net) :</span>
            <span className="font-bold text-[#111118]">
              {formatFCFA(montantNet)}
            </span>
          </div>
        </div>

        <p className="mb-5 text-[10.5px] leading-relaxed text-[#111118]/50">
          En cliquant sur{" "}
          <span className="font-bold text-[#111118]">« Payer maintenant »</span>
          , vous serez redirigé vers la passerelle sécurisée PayDunya (Wave,
          Orange Money, Carte bancaire). Une fois le paiement confirmé, le
          montant net sera automatiquement reversé au freelance.
        </p>

        <div className="flex items-center justify-end gap-2 border-t border-[#111118]/6 pt-4">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#111118]/15 px-3.5 py-2 text-[11px] font-medium text-[#111118]/60 hover:bg-[#F3EBDD]/60"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-[#D95C38] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#c14f2f] disabled:opacity-50 transition-colors"
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111118]/50 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-[#111118]/35 hover:bg-[#F3EBDD] hover:text-[#111118]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#F3EBDD] text-[#D95C38]">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-[#111118]">
              Historique de paiement & traçabilité
            </h3>
            <p className="text-[11px] text-[#111118]/50 truncate max-w-xs">
              {missionTitle}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center gap-2 text-[11px] text-[#111118]/40">
            <Loader2 className="h-5 w-5 animate-spin text-[#D95C38]" />
            Chargement de l'historique...
          </div>
        )}

        {isError && (
          <div className="my-6 rounded-xl border border-[#E7B84B]/40 bg-[#E7B84B]/15 p-4 text-center text-[11px] text-[#a87921]">
            Aucun historique de paiement enregistré pour cette mission.
          </div>
        )}

        {paiement && (
          <div className="space-y-4">
            {/* Répartition financière */}
            <div className="rounded-2xl border border-[#111118]/8 bg-[#F3EBDD]/50 p-4 text-[11px] space-y-2">
              <div className="flex justify-between text-[#111118]/50">
                <span>Annonceur :</span>
                <span className="font-semibold text-[#111118]">
                  {paiement.annonceur_nom}
                </span>
              </div>
              <div className="flex justify-between text-[#111118]/50">
                <span>Freelance :</span>
                <span className="font-semibold text-[#111118]">
                  {paiement.freelance_nom}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#111118]/8 pt-2">
                <span className="text-[#111118]/50">Montant brut :</span>
                <span className="font-bold text-[#111118]">
                  {formatFCFA(paiement.montant_brut)}
                </span>
              </div>
              <div className="flex justify-between text-[#c9922e]">
                <span>
                  Commission Jëfly ({parseFloat(paiement.taux_commission) * 100}
                  %) :
                </span>
                <span className="font-semibold">
                  {formatFCFA(paiement.montant_commission)}
                </span>
              </div>
              <div className="flex justify-between border-t border-[#111118]/8 pt-1 font-bold text-[#111118]">
                <span>Montant net freelance :</span>
                <span>{formatFCFA(paiement.montant_net)}</span>
              </div>
            </div>

            {/* Statuts du cycle de vie */}
            <div className="grid grid-cols-2 gap-3 text-[10.5px]">
              <div className="rounded-2xl border border-[#111118]/8 bg-white p-3 space-y-1.5">
                <span className="text-[9.5px] font-bold text-[#111118]/40">
                  1. Collecte annonceur
                </span>
                <div>
                  {paiement.statut_collecte === "REUSSI" && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#111118]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#D95C38]" />{" "}
                      Réussie
                    </span>
                  )}
                  {paiement.statut_collecte === "EN_ATTENTE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#c9922e]">
                      <Clock3 className="h-3.5 w-3.5" /> En attente
                    </span>
                  )}
                  {paiement.statut_collecte === "ECHOUE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#c14f2f]">
                      <XCircle className="h-3.5 w-3.5" /> Échouée
                    </span>
                  )}
                </div>
                <p className="text-[#111118]/35 text-[9px]">
                  Date : {formatDate(paiement.date_collecte)}
                </p>
                {paiement.reference_collecte && (
                  <p className="text-[#111118]/45 font-mono text-[8.5px] truncate">
                    Réf : {paiement.reference_collecte}
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-[#111118]/8 bg-white p-3 space-y-1.5">
                <span className="text-[9.5px] font-bold text-[#111118]/40">
                  2. Versement freelance
                </span>
                <div>
                  {paiement.statut_decaissement === "REUSSI" && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#111118]">
                      <CheckCircle2 className="h-3.5 w-3.5 text-[#D95C38]" />{" "}
                      Réussi
                    </span>
                  )}
                  {paiement.statut_decaissement === "EN_ATTENTE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#c9922e]">
                      <Clock3 className="h-3.5 w-3.5" /> En cours
                    </span>
                  )}
                  {paiement.statut_decaissement === "NON_DECLENCHE" && (
                    <span className="inline-flex items-center gap-1 font-medium text-[#111118]/40">
                      Non déclenché
                    </span>
                  )}
                  {paiement.statut_decaissement === "ECHOUE" && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#c14f2f]">
                      <XCircle className="h-3.5 w-3.5" /> Échoué
                    </span>
                  )}
                </div>
                <p className="text-[#111118]/35 text-[9px]">
                  Date : {formatDate(paiement.date_decaissement)}
                </p>
                {paiement.reference_decaissement && (
                  <p className="text-[#111118]/45 font-mono text-[8.5px] truncate">
                    Réf : {paiement.reference_decaissement}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-[#111118]/6 pt-4 text-right">
          <button
            onClick={onClose}
            className="rounded-xl border border-[#111118]/15 px-4 py-1.5 text-[11px] font-medium text-[#111118]/60 hover:bg-[#F3EBDD]/60"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
