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
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 sm:p-8 mb-6">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <span className="text-[10px] font-semibold text-brand-green">
              Mon activité
            </span>
            <h1 className="font-heading text-xl sm:text-2xl font-bold tracking-tight text-white mt-1">
              Mes missions & projets
            </h1>
            <p className="mt-1.5 text-[11px] text-white/75 max-w-md">
              Suivez l'avancement de vos missions, livrez votre travail et gérez vos paiements.
            </p>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/75" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une mission..."
              className="w-full sm:w-64 rounded-2xl border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-[11px] text-white placeholder:text-white/75 outline-none focus:border-brand-peach"
            />
          </div>
        </div>
      </div>

      {deliveryError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-3 text-[11px] text-brand-violet dark:text-violet-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{deliveryError}</span>
        </div>
      )}

      {/* ── Onglets ── */}
      <div className="mb-6 flex border-b border-brand-ink/8 dark:border-border gap-2">
        <button
          onClick={() => setActiveTab('dev')}
          className={`flex items-center gap-2 px-1 pb-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'dev'
              ? 'border-brand-ink dark:border-border text-brand-ink dark:text-foreground'
              : 'border-transparent text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          <Briefcase className="h-4 w-4" />
          Missions en développement
          <span className="rounded-full bg-brand-sand dark:bg-muted px-2 py-0.5 text-[9.5px] font-bold text-muted-foreground">
            {inDevPropositions.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`flex items-center gap-2 px-1 pb-2.5 text-[11px] font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === 'all'
              ? 'border-brand-ink dark:border-border text-brand-ink dark:text-foreground'
              : 'border-transparent text-muted-foreground hover:text-muted-foreground'
          }`}
        >
          <FileCheck2 className="h-4 w-4" />
          Toutes mes candidatures
          <span className="rounded-full bg-brand-sand dark:bg-muted px-2 py-0.5 text-[9.5px] font-bold text-muted-foreground">
            {propositions.length}
          </span>
        </button>
      </div>

      {/* ── Chargement ── */}
      {isLoading && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-violet dark:text-violet-300" />
          <p className="text-[11px] font-medium text-muted-foreground">Chargement de vos missions...</p>
        </div>
      )}

      {/* ── État vide ── */}
      {!isLoading && displayedPropositions.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-brand-ink/15 dark:border-border bg-white dark:bg-card p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-brand-ink dark:text-foreground">
            {activeTab === 'dev'
              ? 'Aucune mission en cours de développement'
              : 'Aucune candidature déposée'}
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[11px] text-muted-foreground leading-relaxed">
            {activeTab === 'dev'
              ? "Dès qu'un annonceur accepte votre candidature, la mission apparaîtra dans cette section."
              : 'Découvrez les offres disponibles et postulez dès maintenant.'}
          </p>
          <button
            onClick={() => navigate('/espace/missions')}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-green hover:bg-brand-green-hover px-5 py-2.5 text-[11px] font-semibold text-brand-ink dark:text-primary-foreground transition-colors cursor-pointer"
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
                className="flex flex-col rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-5 transition-all hover:shadow-md"
              >
                {/* En-tête mission & statut */}
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-brand-ink/6 dark:border-border pb-3">
                  <div>
                    {isAccepted && (
                      <div className="flex flex-wrap items-center gap-1.5 mb-1">
                        {missionStatus === 'IN_PROGRESS' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-sand dark:bg-muted px-2.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3 text-brand-violet dark:text-violet-300" /> En développement
                          </span>
                        )}
                        {missionStatus === 'DELIVERED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach/20 dark:bg-brand-peach/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-brand-ink dark:text-foreground border border-brand-peach/40">
                            <Truck className="h-3 w-3" /> Livrée — en attente validation client
                          </span>
                        )}
                        {missionStatus === 'COMPLETED' && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-2.5 py-0.5 text-[9.5px] font-bold text-white">
                            <CheckCircle2 className="h-3 w-3 text-brand-green" /> Mission terminée
                          </span>
                        )}
                      </div>
                    )}
                    {isRejected && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-green/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-brand-violet dark:text-violet-300">
                        <XCircle className="h-3 w-3" /> Candidature non retenue
                      </span>
                    )}
                    {!isAccepted && !isRejected && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-peach/20 dark:bg-brand-peach/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-brand-ink dark:text-foreground">
                        <Clock3 className="h-3 w-3" /> Candidature en attente
                      </span>
                    )}

                    <h2 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground leading-tight">
                      {prop.mission_title}
                    </h2>
                  </div>

                  <span className="text-[11px] font-bold text-brand-ink dark:text-foreground shrink-0">
                    {formatBudget(prop.mission_budget || 0)}
                  </span>
                </div>

                {/* Infos clés */}
                <div className="mb-4 space-y-2 rounded-2xl bg-brand-sand/60 dark:bg-muted/60 border border-brand-ink/6 dark:border-border p-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Date de livraison prévue :
                    </span>
                    <span className="font-semibold text-brand-ink dark:text-foreground">
                      {formatDate(prop.date_livraison)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <WalletCards className="h-3.5 w-3.5" /> Mode de paiement :
                    </span>
                    <span className="font-semibold text-brand-ink dark:text-foreground uppercase">
                      PayDunya Mobile Money
                    </span>
                  </div>
                </div>

                {/* Extrait de la proposition */}
                <div className="mb-4">
                  <p className="text-[10px] font-semibold text-muted-foreground mb-1">
                    Votre proposition :
                  </p>
                  <p className="rounded-xl bg-brand-sand/40 dark:bg-muted/40 p-2.5 text-[10.5px] text-muted-foreground italic line-clamp-2">
                    "{prop.lettre_motivation}"
                  </p>
                </div>

                {/* Actions paiement & livraison */}
                {isAccepted && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {prop.numero_paiement_confirme ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/10 dark:border-border bg-brand-sand/40 dark:bg-muted/40 px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" />
                        Numéro confirmé
                        {prop.numero_paiement ? ` : ${prop.numero_paiement}` : ''}
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setConfirmNumeroTarget({
                            propId: prop.id,
                            operateur: prop.mission_operateur || 'WAVE',
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/15 dark:border-border bg-brand-sand/60 dark:bg-muted/60 px-3 py-1.5 text-[10.5px] font-semibold text-brand-ink dark:text-foreground hover:bg-brand-ink hover:text-white transition-colors cursor-pointer"
                      >
                        <Smartphone className="h-3.5 w-3.5" /> Numéro Mobile Money
                      </button>
                    )}

                    {missionStatus === 'IN_PROGRESS' && (
                      <button
                        onClick={() => deliverMutation.mutate(prop.mission)}
                        disabled={deliverMutation.isPending}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green hover:bg-brand-green-hover px-3 py-1.5 text-[10.5px] font-bold text-brand-ink dark:text-primary-foreground transition-colors disabled:opacity-50 cursor-pointer"
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
                      className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/12 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 transition-colors cursor-pointer"
                    >
                      <Receipt className="h-3.5 w-3.5 text-muted-foreground" /> Suivi paiement
                    </button>
                  </div>
                )}

                {/* Actions bas de carte */}
                <div className="mt-auto pt-3 border-t border-brand-ink/6 dark:border-border flex flex-wrap items-center justify-between gap-2">
                  {isAccepted ? (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => navigate('/espace/projets')}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-peach dark:bg-brand-peach/10 hover:bg-brand-peach dark:hover:bg-brand-peach/20 px-3 py-1.5 text-[10.5px] font-semibold text-brand-ink dark:text-foreground transition-colors cursor-pointer"
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
                        className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/15 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-[10.5px] font-semibold text-brand-ink dark:text-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 transition-colors cursor-pointer"
                      >
                        <MessageSquare className="h-3.5 w-3.5" /> Messagerie
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10.5px] text-muted-foreground italic">
                      En attente de réponse du client
                    </span>
                  )}

                  <button
                    onClick={() => navigate(`/espace/missions/${prop.mission}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-brand-violet dark:text-violet-300 hover:underline cursor-pointer"
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