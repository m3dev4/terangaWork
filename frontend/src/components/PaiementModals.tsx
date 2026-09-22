import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2,
  Clock3,
  ExternalLink,
  Loader2,
  PhoneCall,
  ShieldCheck,
  WalletCards,
  X,
  XCircle,
  AlertCircle,
  DollarSign,
  Receipt,
  Smartphone,
} from 'lucide-react';
import {
  confirmerNumeroPaiement,
  getHistoriquePaiement,
  initierPaiementMission,
  type NumeroPaiement,
  type Paiement,
} from '../api/paiementApi';

const formatFCFA = (val: number | string | undefined | null) => {
  if (!val) return '0 FCFA';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  return `${new Intl.NumberFormat('fr-FR').format(num)} FCFA`;
};

const formatDate = (val: string | null | undefined) => {
  if (!val) return 'Non effectué';
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  const [numero, setNumero] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => confirmerNumeroPaiement({ propositionId, numero }),
    onSuccess: () => {
      onConfirmed?.();
      onClose();
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Erreur lors de la confirmation du numéro.';
      setErrorMsg(msg);
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f4f8] text-[#1b4b6b]">
            <Smartphone className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-neutral-900">
              Numéro de paiement Mobile Money
            </h3>
            <p className="text-[11px] text-neutral-500">
              Opérateur requis pour cette mission :{' '}
              <span className="font-bold text-[#1b4b6b] uppercase">{operateur}</span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
            {errorMsg}
          </div>
        )}

        <div className="mb-5 space-y-3 text-[11px] text-neutral-600">
          <p className="leading-relaxed">
            Veuillez vérifier ou saisir le numéro sur lequel vous souhaitez recevoir le paiement net une fois la livraison validée.
          </p>

          <div>
            <label className="mb-1 block font-semibold text-neutral-700">
              Numéro {operateur} (ex: 771234567) :
            </label>
            <input
              type="text"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              placeholder="Saisissez votre numéro mobile money..."
              className="w-full rounded-md border border-[#e7e3dc] bg-[#faf9f7] px-3 py-2 text-[12px] font-medium outline-none focus:border-[#1b4b6b]"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-[#f0ede8] pt-4">
          <button
            onClick={onClose}
            className="rounded-md border border-[#e7e3dc] px-3.5 py-2 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#1b4b6b] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#143952] disabled:opacity-50"
          >
            {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
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
  const commissionRate = 0.10;
  const montantCommission = budget * commissionRate;
  const montantNet = budget - montantCommission;

  const mutation = useMutation({
    mutationFn: () => initierPaiementMission(missionId),
    onSuccess: (data) => {
      onSuccess?.();
      if (data.payment_url) {
        window.open(data.payment_url, '_blank');
      }
      onClose();
    },
    onError: (err: any) => {
      if (err.response?.status === 409) {
        setErrorMsg('Un paiement est déjà en cours ou a été effectué pour cette mission.');
      } else {
        const msg = err.response?.data?.error || "Impossible d'initier le paiement PayDunya.";
        setErrorMsg(msg);
      }
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eaf7ef] text-[#29935a]">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-neutral-900">
              Payer la mission avec PayDunya
            </h3>
            <p className="text-[11px] text-neutral-500 truncate max-w-sm">
              Mission : <span className="font-semibold text-neutral-800">{missionTitle}</span>
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="mb-5 space-y-3 rounded-xl bg-[#faf9f7] border border-[#e7e3dc] p-4 text-[11px]">
          <div className="flex items-center justify-between pb-2 border-b border-[#e7e3dc]">
            <span className="text-neutral-500">Montant total brut :</span>
            <span className="font-bold text-neutral-900 text-xs">{formatFCFA(budget)}</span>
          </div>

          <div className="flex items-center justify-between text-neutral-600">
            <span>Commission service Jëfly (10%) :</span>
            <span className="font-semibold text-[#f2994a]">{formatFCFA(montantCommission)}</span>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-[#e7e3dc] text-neutral-800">
            <span className="font-semibold">Reversé au Freelance (Net) :</span>
            <span className="font-bold text-[#29935a]">{formatFCFA(montantNet)}</span>
          </div>
        </div>

        <p className="mb-5 text-[10.5px] leading-relaxed text-neutral-500">
          En cliquant sur <span className="font-bold text-neutral-700">"Payer maintenant"</span>, vous serez redirigé vers la passerelle sécurisée PayDunya (Wave, Orange Money, Carte BDF). Une fois le paiement confirmé, le montant net sera automatiquement reversé au freelance.
        </p>

        <div className="flex items-center justify-end gap-2 border-t border-[#f0ede8] pt-4">
          <button
            onClick={onClose}
            className="rounded-md border border-[#e7e3dc] px-3.5 py-2 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Annuler
          </button>
          <button
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="inline-flex items-center gap-2 rounded-md bg-[#29935a] px-4 py-2 text-[11px] font-bold text-white hover:bg-[#1f7344] disabled:opacity-50 transition-colors"
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

export const HistoriquePaiementModal: React.FC<HistoriquePaiementModalProps> = ({
  missionId,
  missionTitle,
  onClose,
}) => {
  const { data: paiement, isLoading, isError } = useQuery({
    queryKey: ['historique-paiement', missionId],
    queryFn: () => getHistoriquePaiement(missionId),
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0f4f8] text-[#1b4b6b]">
            <Receipt className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-heading text-sm font-bold text-neutral-900">
              Historique de Paiement & Traçabilité
            </h3>
            <p className="text-[11px] text-neutral-500 truncate max-w-xs">
              {missionTitle}
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="flex h-40 items-center justify-center gap-2 text-[11px] text-neutral-400">
            <Loader2 className="h-5 w-5 animate-spin text-[#1b4b6b]" />
            Chargement de l'historique...
          </div>
        )}

        {isError && (
          <div className="my-6 rounded-md border border-amber-200 bg-amber-50 p-4 text-center text-[11px] text-amber-800">
            Aucun historique de paiement enregistré pour cette mission.
          </div>
        )}

        {paiement && (
          <div className="space-y-4">
            {/* Direct Financial Breakdown */}
            <div className="rounded-xl border border-[#e7e3dc] bg-[#faf9f7] p-4 text-[11px] space-y-2">
              <div className="flex justify-between text-neutral-500">
                <span>Annonceur :</span>
                <span className="font-semibold text-neutral-800">{paiement.annonceur_nom}</span>
              </div>
              <div className="flex justify-between text-neutral-500">
                <span>Freelance :</span>
                <span className="font-semibold text-neutral-800">{paiement.freelance_nom}</span>
              </div>
              <div className="pt-2 border-t border-[#e7e3dc] flex justify-between">
                <span>Montant Brut :</span>
                <span className="font-bold text-neutral-900">{formatFCFA(paiement.montant_brut)}</span>
              </div>
              <div className="flex justify-between text-[#f2994a]">
                <span>Commission Jëfly ({parseFloat(paiement.taux_commission) * 100}%) :</span>
                <span className="font-semibold">{formatFCFA(paiement.montant_commission)}</span>
              </div>
              <div className="flex justify-between font-bold text-[#29935a] pt-1 border-t border-[#e7e3dc]">
                <span>Montant Net Freelance :</span>
                <span>{formatFCFA(paiement.montant_net)}</span>
              </div>
            </div>

            {/* Lifecycle Status Cards */}
            <div className="grid grid-cols-2 gap-3 text-[10.5px]">
              {/* Collecte */}
              <div className="rounded-xl border border-[#ebe8e2] bg-white p-3 space-y-1.5">
                <span className="text-[9.5px] uppercase font-bold text-neutral-400">1. Collecte Annonceur</span>
                <div>
                  {paiement.statut_collecte === 'REUSSI' && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#29935a]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Réussie
                    </span>
                  )}
                  {paiement.statut_collecte === 'EN_ATTENTE' && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <Clock3 className="h-3.5 w-3.5" /> En attente
                    </span>
                  )}
                  {paiement.statut_collecte === 'ECHOUE' && (
                    <span className="inline-flex items-center gap-1 font-bold text-red-600">
                      <XCircle className="h-3.5 w-3.5" /> Échouée
                    </span>
                  )}
                </div>
                <p className="text-neutral-400 text-[9px]">Date: {formatDate(paiement.date_collecte)}</p>
                {paiement.reference_collecte && (
                  <p className="text-neutral-500 font-mono text-[8.5px] truncate">Ref: {paiement.reference_collecte}</p>
                )}
              </div>

              {/* Décaissement */}
              <div className="rounded-xl border border-[#ebe8e2] bg-white p-3 space-y-1.5">
                <span className="text-[9.5px] uppercase font-bold text-neutral-400">2. Vers. Freelance</span>
                <div>
                  {paiement.statut_decaissement === 'REUSSI' && (
                    <span className="inline-flex items-center gap-1 font-bold text-[#29935a]">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Réussi
                    </span>
                  )}
                  {paiement.statut_decaissement === 'EN_ATTENTE' && (
                    <span className="inline-flex items-center gap-1 font-bold text-amber-600">
                      <Clock3 className="h-3.5 w-3.5" /> En cours
                    </span>
                  )}
                  {paiement.statut_decaissement === 'NON_DECLENCHE' && (
                    <span className="inline-flex items-center gap-1 font-medium text-neutral-400">
                      Non déclenché
                    </span>
                  )}
                  {paiement.statut_decaissement === 'ECHOUE' && (
                    <span className="inline-flex items-center gap-1 font-bold text-red-600">
                      <XCircle className="h-3.5 w-3.5" /> Échoué
                    </span>
                  )}
                </div>
                <p className="text-neutral-400 text-[9px]">Date: {formatDate(paiement.date_decaissement)}</p>
                {paiement.reference_decaissement && (
                  <p className="text-neutral-500 font-mono text-[8.5px] truncate">Ref: {paiement.reference_decaissement}</p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-[#f0ede8] pt-4 text-right">
          <button
            onClick={onClose}
            className="rounded-md border border-[#e7e3dc] px-4 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
