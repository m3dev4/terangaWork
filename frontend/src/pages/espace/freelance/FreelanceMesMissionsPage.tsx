import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Loader2,
  MessageSquare,
  Search,
  WalletCards,
  XCircle,
  Truck,
  Smartphone,
  Receipt,
  AlertCircle,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { getPropositions, type Proposition } from '../../../api/propositionsApi';
import { marquerMissionLivree } from '../../../api/paiementApi';
import {
  ConfirmNumeroModal,
  HistoriquePaiementModal,
} from '../../../components/PaiementModals';

const formatBudget = (value: number) =>
  `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }).format(new Date(value))
    : 'N/A';

const FreelanceMesMissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();

  const isCandidaturesRoute = location.pathname.includes('candidatures');
  const [activeTab, setActiveTab] = useState<'dev' | 'all'>(
    isCandidaturesRoute ? 'all' : 'dev'
  );
  const [search, setSearch] = useState('');

  // Modal states
  const [confirmNumeroTarget, setConfirmNumeroTarget] = useState<{
    propId: number;
    operateur: string;
  } | null>(null);
  const [historiqueTarget, setHistoriqueTarget] = useState<{
    missionId: number;
    title: string;
  } | null>(null);

  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  React.useEffect(() => {
    if (location.pathname.includes('candidatures')) {
      setActiveTab('all');
    } else if (location.pathname.includes('mes-missions')) {
      setActiveTab('dev');
    }
  }, [location.pathname]);

  const { data: propositions = [], isLoading } = useQuery({
    queryKey: ['propositions-freelance-espace'],
    queryFn: () => getPropositions(),
  });

  // Delivery mutation
  const deliverMutation = useMutation({
    mutationFn: (missionId: number) => marquerMissionLivree(missionId),
    onSuccess: () => {
      setDeliveryError(null);
      queryClient.invalidateQueries({ queryKey: ['propositions-freelance-espace'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.error || 'Erreur lors du marquage de livraison.';
      setDeliveryError(msg);
    },
  });

  // Filter propositions based on tab and search
  const inDevPropositions = propositions.filter(
    (p: Proposition) => p.proposition_status === 'ACCEPTED'
  );

  const displayedPropositions = (
    activeTab === 'dev' ? inDevPropositions : propositions
  ).filter((p: Proposition) =>
    p.mission_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1080px] pb-12">
      {/* Modals */}
      {confirmNumeroTarget && (
        <ConfirmNumeroModal
          propositionId={confirmNumeroTarget.propId}
          operateur={confirmNumeroTarget.operateur}
          onClose={() => setConfirmNumeroTarget(null)}
          onConfirmed={() =>
            queryClient.invalidateQueries({ queryKey: ['propositions-freelance-espace'] })
          }
        />
      )}

      {historiqueTarget && (
        <HistoriquePaiementModal
          missionId={historiqueTarget.missionId}
          missionTitle={historiqueTarget.title}
          onClose={() => setHistoriqueTarget(null)}
        />
      )}

      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[#EFECE6] pb-4">
        <div>
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f2994a]">
            Mon Activité
          </span>
          <h1 className="font-heading text-xl font-bold tracking-tight text-neutral-900">
            Mes Missions & Projets
          </h1>
          <p className="mt-1 text-[11px] text-neutral-500">
            Suivez l'avancement de vos missions, livrez votre travail et gérez vos paiements.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une mission..."
              className="w-56 rounded-md border border-[#e7e3dc] bg-white py-1.5 pl-8 pr-3 text-[11px] outline-none focus:border-[#1b4b6b]"
            />
          </div>
        </div>
      </div>

      {deliveryError && (
        <div className="mb-4 flex items-center gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-[11px] text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{deliveryError}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="mb-6 flex border-b border-[#e7e3dc] gap-4">
        <button
          onClick={() => setActiveTab('dev')}
          className={`flex items-center gap-2 pb-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'dev'
              ? 'border-[#1b4b6b] text-[#1b4b6b]'
              : 'border-transparent text-neutral-400 hover:text-neutral-700'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Missions en phase de développement
          <span className="rounded-full bg-[#1b4b6b]/10 px-2 py-0.5 text-[9.5px] font-bold text-[#1b4b6b]">
            {inDevPropositions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 pb-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#1b4b6b] text-[#1b4b6b]'
              : 'border-transparent text-neutral-400 hover:text-neutral-700'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Toutes mes candidatures
          <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[9.5px] font-bold text-neutral-500">
            {propositions.length}
          </span>
        </button>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-lg border border-[#ebe8e2] bg-white p-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#1b4b6b]" />
          <p className="text-[11px] font-medium text-neutral-500">Chargement de vos missions...</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && displayedPropositions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#d8d3cb] bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#f0f4f8] text-[#1b4b6b]">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-neutral-900">
            {activeTab === 'dev'
              ? 'Aucune mission en cours de développement'
              : 'Aucune candidature déposée'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[11px] text-neutral-400 leading-relaxed">
            {activeTab === 'dev'
              ? 'Dès qu’un annonceur accepte votre candidature, la mission apparaîtra dans cette section.'
              : 'Découvrez les offres disponibles et postulez dès maintenant.'}
          </p>
          <button
            onClick={() => navigate('/espace/missions')}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-[#1b4b6b] px-4 py-2 text-[11px] font-semibold text-white hover:bg-[#143952] transition-colors cursor-pointer"
          >
            Rechercher une mission
          </button>
        </div>
      )}

      {/* List of Missions */}
      {!isLoading && displayedPropositions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayedPropositions.map((prop: Proposition) => {
            const isAccepted = prop.proposition_status === 'ACCEPTED';
            const isRejected = prop.proposition_status === 'REJECTED';
            const missionStatus = prop.mission_status || 'IN_PROGRESS';

            return (
              <div
                key={prop.id}
                className="flex flex-col rounded-xl border border-[#ebe8e2] bg-white p-5 shadow-xs transition-all hover:shadow-md"
              >
                {/* Mission Header & Status */}
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-[#f3f0eb] pb-3">
                  <div>
                    {isAccepted && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {missionStatus === 'IN_PROGRESS' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ef] px-2.5 py-0.5 text-[9.5px] font-semibold text-[#29935a]">
                            <CheckCircle2 className="h-3 w-3" /> En développement
                          </span>
                        )}
                        {missionStatus === 'DELIVERED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-[9.5px] font-semibold text-blue-700 border border-blue-200">
                            <Truck className="h-3 w-3" /> Livrée - En attente validation client
                          </span>
                        )}
                        {missionStatus === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9.5px] font-bold text-emerald-800 border border-emerald-300">
                            <CheckCircle2 className="h-3 w-3" /> Mission Terminée
                          </span>
                        )}
                      </div>
                    )}
                    {isRejected && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-0.5 text-[9.5px] font-semibold text-red-600">
                        <XCircle className="h-3 w-3" /> Candidature non retenue
                      </span>
                    )}
                    {!isAccepted && !isRejected && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-[9.5px] font-semibold text-amber-700">
                        <Clock3 className="h-3 w-3" /> Candidature en attente
                      </span>
                    )}

                    <h2 className="font-heading text-sm font-bold text-neutral-900 leading-tight">
                      {prop.mission_title}
                    </h2>
                  </div>

                  <span className="text-[11px] font-bold text-[#1b4b6b] shrink-0">
                    {formatBudget(prop.mission_budget || 0)}
                  </span>
                </div>

                {/* Info Card */}
                <div className="mb-4 space-y-2 rounded-lg bg-[#FAF9F6] border border-[#e7e3dc] p-3 text-[11px] text-neutral-600">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <CalendarDays className="h-3.5 w-3.5 text-neutral-400" /> Date de livraison prévue:
                    </span>
                    <span className="font-semibold text-neutral-800">
                      {formatDate(prop.date_livraison)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-neutral-400">
                      <WalletCards className="h-3.5 w-3.5 text-neutral-400" /> Mode de paiement:
                    </span>
                    <span className="font-semibold text-neutral-800 uppercase">
                      PayDunya Mobile Money
                    </span>
                  </div>
                </div>

                {/* Motivation Letter Excerpt */}
                <div className="mb-4">
                  <p className="text-[10px] uppercase font-semibold text-neutral-400 mb-1">
                    Votre proposition :
                  </p>
                  <p className="rounded bg-[#f7f5f0] p-2.5 text-[10.5px] text-neutral-600 italic line-clamp-2">
                    "{prop.lettre_motivation}"
                  </p>
                </div>

                {/* Dedicated Action Buttons for Payment & Delivery */}
                {isAccepted && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {/* 1. Phone Confirmation Button */}
                    <button
                      onClick={() =>
                        setConfirmNumeroTarget({
                          propId: prop.id,
                          operateur: 'WAVE', // default / retrieved
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#1b4b6b]/30 bg-[#f0f4f8] px-3 py-1.5 text-[10.5px] font-semibold text-[#1b4b6b] hover:bg-[#1b4b6b] hover:text-white transition-colors cursor-pointer"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Numéro Mobile Money
                    </button>

                    {/* 2. Mark as Delivered Button */}
                    {missionStatus === 'IN_PROGRESS' && (
                      <button
                        onClick={() => deliverMutation.mutate(prop.mission)}
                        disabled={deliverMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#29935a] px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-[#1f7344] transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deliverMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Truck className="h-3.5 w-3.5" />
                        )}
                        Marquer comme livrée
                      </button>
                    )}

                    {/* 3. History Button */}
                    <button
                      onClick={() =>
                        setHistoriqueTarget({
                          missionId: prop.mission,
                          title: prop.mission_title || 'Mission',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-md border border-[#e7e3dc] bg-white px-3 py-1.5 text-[10.5px] font-semibold text-neutral-700 hover:bg-neutral-50 transition-colors cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5 text-neutral-500" /> Suivi Paiement
                    </button>
                  </div>
                )}

                {/* Actions */}
                <div className="mt-auto pt-3 border-t border-[#f3f0eb] flex flex-wrap items-center justify-between gap-2">
                  {isAccepted ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/espace/projets')}
                        className="inline-flex items-center gap-1.5 rounded-md bg-[#f2994a] px-3 py-1.5 text-[10.5px] font-semibold text-white hover:bg-[#d8792b] transition-colors cursor-pointer"
                      >
                        <Briefcase className="h-3.5 w-3.5" /> Espace Projet
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            `/espace/messages?mission=${prop.mission}&title=${encodeURIComponent(
                              prop.mission_title || ''
                            )}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-md border border-[#1b4b6b] bg-white px-3 py-1.5 text-[10.5px] font-semibold text-[#1b4b6b] hover:bg-[#f0f4f8] transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Messagerie
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-neutral-400 italic">
                      En attente de réponse du client
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/espace/missions/${prop.mission}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#1b4b6b] hover:underline cursor-pointer"
                  >
                    Voir l'annonce <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default FreelanceMesMissionsPage;
