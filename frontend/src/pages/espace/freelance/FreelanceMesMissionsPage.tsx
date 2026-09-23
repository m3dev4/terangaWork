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

// ── Palette commune au dashboard (annonceur / freelance) ────────────────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

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

  const inDevPropositions = propositions.filter(
    (p: Proposition) => p.proposition_status === 'ACCEPTED'
  );

  const displayedPropositions = (
    activeTab === 'dev' ? inDevPropositions : propositions
  ).filter((p: Proposition) =>
    p.mission_title?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="mx-auto max-w-[1080px] pb-16">
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

      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#111118] text-white p-6 sm:p-8 mb-6">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#E7B84B]">
              Mon activité
            </span>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Mes missions & projets
            </h1>
            <p className="mt-1.5 text-[11px] text-white/50 max-w-md">
              Suivez l'avancement de vos missions, livrez votre travail et gérez vos paiements.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une mission..."
              className="w-full sm:w-64 rounded-2xl border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-[11px] text-white placeholder:text-white/40 outline-none focus:border-[#E7B84B]"
            />
          </div>
        </div>
      </div>

      {deliveryError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#D95C38]/25 bg-[#D95C38]/10 p-3 text-[11px] text-[#c14f2f]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{deliveryError}</span>
        </div>
      )}

      {/* ── Onglets ── */}
      <div className="mb-6 flex border-b border-[#111118]/8 gap-2">
        <button
          onClick={() => setActiveTab('dev')}
          className={`flex items-center gap-2 px-1 pb-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'dev'
              ? 'border-[#111118] text-[#111118]'
              : 'border-transparent text-[#111118]/35 hover:text-[#111118]/70'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Missions en développement
          <span className="rounded-full bg-[#F3EBDD] px-2 py-0.5 text-[9.5px] font-bold text-[#111118]/70">
            {inDevPropositions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-1 pb-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-[#111118] text-[#111118]'
              : 'border-transparent text-[#111118]/35 hover:text-[#111118]/70'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Toutes mes candidatures
          <span className="rounded-full bg-[#F3EBDD] px-2 py-0.5 text-[9.5px] font-bold text-[#111118]/70">
            {propositions.length}
          </span>
        </button>
      </div>

      {/* ── Chargement ── */}
      {isLoading && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-[24px] border border-[#111118]/8 bg-white p-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#D95C38]" />
          <p className="text-[11px] font-medium text-[#111118]/50">Chargement de vos missions...</p>
        </div>
      )}

      {/* ── État vide ── */}
      {!isLoading && displayedPropositions.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-[#111118]/15 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EBDD] text-[#D95C38]">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-[#111118]">
            {activeTab === 'dev'
              ? 'Aucune mission en cours de développement'
              : 'Aucune candidature déposée'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[11px] text-[#111118]/45 leading-relaxed">
            {activeTab === 'dev'
              ? "Dès qu'un annonceur accepte votre candidature, la mission apparaîtra dans cette section."
              : 'Découvrez les offres disponibles et postulez dès maintenant.'}
          </p>
          <button
            onClick={() => navigate('/espace/missions')}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] px-5 py-2.5 text-[11px] font-semibold text-white transition-colors cursor-pointer"
          >
            Rechercher une mission
          </button>
        </div>
      )}

      {/* ── Liste des missions ── */}
      {!isLoading && displayedPropositions.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {displayedPropositions.map((prop: Proposition) => {
            const isAccepted = prop.proposition_status === 'ACCEPTED';
            const isRejected = prop.proposition_status === 'REJECTED';
            const missionStatus = prop.mission_status || 'IN_PROGRESS';

            return (
              <div
                key={prop.id}
                className="flex flex-col rounded-[24px] border border-[#111118]/8 bg-white p-5 transition-all hover:shadow-md"
              >
                {/* En-tête mission & statut */}
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-[#111118]/6 pb-3">
                  <div>
                    {isAccepted && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {missionStatus === 'IN_PROGRESS' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EBDD] px-2.5 py-0.5 text-[9.5px] font-semibold text-[#111118]/70">
                            <CheckCircle2 className="h-3 w-3 text-[#D95C38]" /> En développement
                          </span>
                        )}
                        {missionStatus === 'DELIVERED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#E7B84B]/20 px-2.5 py-0.5 text-[9.5px] font-semibold text-[#c9922e] border border-[#E7B84B]/40">
                            <Truck className="h-3 w-3" /> Livrée — en attente validation client
                          </span>
                        )}
                        {missionStatus === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-[#111118] px-2.5 py-0.5 text-[9.5px] font-bold text-white">
                            <CheckCircle2 className="h-3 w-3 text-[#E7B84B]" /> Mission terminée
                          </span>
                        )}
                      </div>
                    )}
                    {isRejected && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#D95C38]/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-[#c14f2f]">
                        <XCircle className="h-3 w-3" /> Candidature non retenue
                      </span>
                    )}
                    {!isAccepted && !isRejected && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#E7B84B]/20 px-2.5 py-0.5 text-[9.5px] font-semibold text-[#c9922e]">
                        <Clock3 className="h-3 w-3" /> Candidature en attente
                      </span>
                    )}

                    <h2 className="font-heading text-sm font-bold text-[#111118] leading-tight">
                      {prop.mission_title}
                    </h2>
                  </div>

                  <span className="text-[11px] font-bold text-[#111118] shrink-0">
                    {formatBudget(prop.mission_budget || 0)}
                  </span>
                </div>

                {/* Infos clés */}
                <div className="mb-4 space-y-2 rounded-2xl bg-[#F3EBDD]/60 border border-[#111118]/6 p-3 text-[11px] text-[#111118]/65">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#111118]/40">
                      <CalendarDays className="h-3.5 w-3.5" /> Date de livraison prévue :
                    </span>
                    <span className="font-semibold text-[#111118]">
                      {formatDate(prop.date_livraison)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#111118]/40">
                      <WalletCards className="h-3.5 w-3.5" /> Mode de paiement :
                    </span>
                    <span className="font-semibold text-[#111118] uppercase">
                      PayDunya Mobile Money
                    </span>
                  </div>
                </div>

                {/* Extrait de la proposition */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-[#111118]/40 mb-1">
                    Votre proposition :
                  </p>
                  <p className="rounded-xl bg-[#F3EBDD]/40 p-2.5 text-[10.5px] text-[#111118]/65 italic line-clamp-2">
                    "{prop.lettre_motivation}"
                  </p>
                </div>

                {/* Actions paiement & livraison */}
                {isAccepted && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    <button
                      onClick={() =>
                        setConfirmNumeroTarget({
                          propId: prop.id,
                          operateur: 'WAVE',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#111118]/15 bg-[#F3EBDD]/60 px-3 py-1.5 text-[10.5px] font-semibold text-[#111118] hover:bg-[#111118] hover:text-white transition-colors cursor-pointer"
                    >
                      <Smartphone className="h-3.5 w-3.5" /> Numéro Mobile Money
                    </button>

                    {missionStatus === 'IN_PROGRESS' && (
                      <button
                        onClick={() => deliverMutation.mutate(prop.mission)}
                        disabled={deliverMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#D95C38] hover:bg-[#c14f2f] px-3 py-1.5 text-[10.5px] font-bold text-white transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        {deliverMutation.isPending ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Truck className="h-3.5 w-3.5" />
                        )}
                        Marquer comme livrée
                      </button>
                    )}

                    <button
                      onClick={() =>
                        setHistoriqueTarget({
                          missionId: prop.mission,
                          title: prop.mission_title || 'Mission',
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#111118]/12 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-[#111118]/70 hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5 text-[#111118]/40" /> Suivi paiement
                    </button>
                  </div>
                )}

                {/* Actions bas de carte */}
                <div className="mt-auto pt-3 border-t border-[#111118]/6 flex flex-wrap items-center justify-between gap-2">
                  {isAccepted ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/espace/projets')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#E7B84B] hover:bg-[#dfae3f] px-3 py-1.5 text-[10.5px] font-semibold text-[#111118] transition-colors cursor-pointer"
                      >
                        <Briefcase className="h-3.5 w-3.5" /> Espace projet
                      </button>
                      <button
                        onClick={() =>
                          navigate(
                            `/espace/messages?mission=${prop.mission}&title=${encodeURIComponent(
                              prop.mission_title || ''
                            )}`
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-[#111118]/15 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-[#111118] hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Messagerie
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-[#111118]/40 italic">
                      En attente de réponse du client
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/espace/missions/${prop.mission}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#D95C38] hover:underline cursor-pointer"
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