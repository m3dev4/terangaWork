import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMissions, type Mission } from "../../api/missionsApi";
import { getPropositions, type Proposition } from "../../api/propositionsApi";
import { getDashboardStats } from "../../api/paiementApi";
import { VerticalNotificationSlider } from "./VerticalNotificationSlider";
import DashboardIcon from "./DashboardIcon";
import {
  PlusCircle,
  Briefcase,
  Users,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Clock4,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { AuthUser } from "../../interfaces/authInterface";

interface AnnonceurBentoDashboardProps {
  user: AuthUser | null | undefined;
}

export const AnnonceurBentoDashboard: React.FC<
  AnnonceurBentoDashboardProps
> = ({ user }) => {
  const { data: missions = [], isLoading: isMissionsLoading } = useQuery<
    Mission[]
  >({
    queryKey: ["missions"],
    queryFn: getMissions,
  });

  const { data: propositions = [], isLoading: isPropsLoading } = useQuery<
    Proposition[]
  >({
    queryKey: ["propositions"],
    queryFn: () => getPropositions(),
  });

  const { data: dashboardStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["dashboard-stats-annonceur"],
    queryFn: getDashboardStats,
    select: (stats) => (stats.role === "annonceur" ? stats : undefined),
  });

  const activeMissionsCount = missions.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "OPEN"
  ).length;

  const totalPropositionsCount = propositions.length;
  const pendingPropositionsCount = propositions.filter(
    (p) => p.proposition_status === "PENDING"
  ).length;

  const totalSpent = dashboardStats?.total_spent_brut ?? 0;
  const pendingSpent = dashboardStats?.total_pending_brut ?? 0;
  const commissionsPaid = dashboardStats?.total_paid_commissions ?? 0;

  const missionsWithCandidates = React.useMemo(() => {
    const candidateMap = new Map<number | string, number>();
    propositions.forEach((p) => {
      const mId = p.mission;
      candidateMap.set(mId, (candidateMap.get(mId) || 0) + 1);
    });

    return missions
      .map((m) => ({
        ...m,
        candidateCount: candidateMap.get(m.id) || 0,
      }))
      .sort((a, b) => b.candidateCount - a.candidateCount);
  }, [missions, propositions]);

  const topMissions = missionsWithCandidates.slice(0, 4);

  const activeProjects = propositions.filter(
    (p) => p.proposition_status === "ACCEPTED"
  );

  const formatMoney = (val: number) => {
    return new Intl.NumberFormat("fr-FR").format(val) + " FCFA";
  };

  return (
    <div className="dashboard-glass space-y-5 max-w-7xl mx-auto pb-8">
      {/* ── Bandeau d'accueil ── */}
      <div className="glass-card glass-card--welcome p-8 sm:p-10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <h1 className="glass-welcome-title font-extrabold font-heading tracking-tight text-foreground">
              Ravi de vous revoir, {user?.first_name || "Annonceur"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Vos offres, vos candidats les plus actifs et l'avancement de vos
              projets, en un coup d'œil.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NavLink
                to="/espace/publier-mission"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass-primary bg-brand-green hover:bg-brand-green-hover text-brand-ink text-sm font-semibold transition-colors"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Publier une nouvelle mission</span>
              </NavLink>
              <NavLink
                to="/espace/candidatures-recues"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass-button-secondary text-sm font-medium transition-colors"
              >
                <Users className="w-4.5 h-4.5" />
                <span>Candidatures reçues ({pendingPropositionsCount})</span>
              </NavLink>
            </div>
          </div>

          <div className="glass-hero-stat shrink-0">
            <DashboardIcon kind="work" size="hero" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Annonces publiées
              </p>
              <p className="text-5xl font-extrabold text-foreground font-heading mt-1">
                {missions.length}
              </p>
              <p className="text-xs glass-accent font-semibold mt-1">
                {activeMissionsCount} active{activeMissionsCount > 1 ? "s" : ""}{" "}
                en ce moment
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grille bento : indicateurs + actions ── */}
      <div className="grid grid-cols-12 gap-5 auto-rows-[minmax(156px,auto)]">
        {/* Budget */}
        <div className="glass-card glass-card--money col-span-12 md:col-span-5 md:row-span-2 p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Budget & dépenses
            </span>
            <DashboardIcon kind="cash" size="large" />
          </div>
          <div>
            {isStatsLoading ? (
              <div className="h-12 w-40 glass-skeleton rounded-xl animate-pulse" />
            ) : (
              <>
                <p className="glass-amount font-extrabold text-foreground font-heading">
                  {formatMoney(totalSpent)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Montant total effectivement payé (collectes réussies)
                </p>
                {pendingSpent > 0 && (
                  <p className="text-xs glass-accent mt-2 flex items-center gap-1.5">
                    <Clock4 className="w-3.5 h-3.5" />
                    {formatMoney(pendingSpent)} en attente de paiement
                  </p>
                )}
                {commissionsPaid > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    Commissions Teranga Work payées :{" "}
                    {formatMoney(commissionsPaid)}
                  </p>
                )}
              </>
            )}
          </div>
          <div className="pt-5 border-t glass-divider flex flex-wrap gap-3 items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 glass-accent" />
              Paiement en séquestre sécurisé
            </span>
            <NavLink
              to="/espace/candidatures-recues"
              className="font-semibold glass-accent hover:underline"
            >
              Historique
            </NavLink>
          </div>
        </div>

        {/* Annonces publiées */}
        <div className="min-w-0 col-span-12 sm:col-span-6 md:col-span-4 glass-card glass-card--stat p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Annonces publiées
            </span>
            <DashboardIcon kind="work" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground font-heading">
              {missions.length}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {activeMissionsCount} en cours
              </span>
              <NavLink
                to="/espace/mes-annonces"
                className="text-xs font-semibold glass-link hover:underline"
              >
                Gérer
              </NavLink>
            </div>
          </div>
        </div>

        {/* Candidatures reçues */}
        <div className="min-w-0 col-span-12 sm:col-span-6 md:col-span-3 glass-card glass-card--stat p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Candidatures
            </span>
            <DashboardIcon kind="user" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground font-heading">
              {totalPropositionsCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {pendingPropositionsCount} en attente
            </p>
          </div>
        </div>

        {/* Messagerie — tuile action */}
        <NavLink
          to="/espace/messages"
          className="min-w-0 col-span-12 sm:col-span-6 md:col-span-4 glass-card glass-card--action glass-card--peach p-6 flex items-center justify-between gap-3 group"
        >
          <div className="flex items-center gap-3 md:flex-col md:items-start xl:flex-row xl:items-center">
            <DashboardIcon kind="chat" />
            <span className="text-sm font-bold text-foreground">
              Messagerie directe
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground group-hover:translate-x-1 transition-transform" />
        </NavLink>

        {/* Évaluer candidats — tuile action */}
        <NavLink
          to="/espace/candidatures-recues"
          className="min-w-0 col-span-12 sm:col-span-6 md:col-span-3 glass-card glass-card--action glass-card--violet p-6 flex items-center justify-between gap-3 group"
        >
          <div className="flex flex-col gap-3">
            <DashboardIcon kind="user" />
            <span className="text-sm font-bold text-foreground leading-tight">
              Évaluer les candidats
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
        </NavLink>
      </div>

      {/* ── Contenu principal + activité ── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Colonne principale */}
        <div className="col-span-12 lg:col-span-7 space-y-5">
          {/* Missions les plus candidatées */}
          <div className="glass-card p-6">
            <div className="glass-section-heading">
              <div className="flex items-center gap-3">
                <DashboardIcon kind="award" size="small" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-foreground">
                    Missions les plus candidatées
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Classées par nombre d'offres reçues
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/mes-annonces"
                className="text-xs font-semibold glass-link hover:underline flex items-center gap-1 shrink-0"
              >
                Toutes mes annonces
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {isMissionsLoading || isPropsLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 glass-inset rounded-2xl animate-pulse" />
                <div className="h-16 glass-inset rounded-2xl animate-pulse" />
              </div>
            ) : topMissions.length === 0 ? (
              <div className="text-center py-10 glass-inset rounded-2xl">
                <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Aucune candidature reçue pour le moment
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Publiez une nouvelle mission pour attirer des candidats.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topMissions.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl glass-inset glass-row flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg glass-chip flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-foreground truncate">
                          {m.title || `Mission #${m.id}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.budget ? formatMoney(m.budget) : "Sur devis"} ·{" "}
                          {m.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1 rounded-full glass-chip font-bold text-xs border glass-divider">
                        {m.candidateCount} candidat
                        {m.candidateCount > 1 ? "s" : ""}
                      </span>
                      <NavLink
                        to="/espace/candidatures-recues"
                        className="inline-flex items-center gap-1 glass-link text-xs font-semibold hover:underline"
                      >
                        Voir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </NavLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Projets actifs */}
          <div className="glass-card p-6">
            <div className="glass-section-heading">
              <div className="flex items-center gap-3">
                <DashboardIcon kind="work" size="small" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-foreground">
                    Projets actifs
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Missions attribuées, en cours de réalisation
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/projets"
                className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 shrink-0"
              >
                Workspaces
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {activeProjects.length === 0 ? (
              <div className="text-center py-8 glass-inset rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground">
                  Aucun projet en cours de développement
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Acceptez une candidature pour démarrer un contrat.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeProjects.slice(0, 3).map((prop) => (
                  <div
                    key={prop.id}
                    className="p-4 rounded-2xl glass-inset glass-row flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">
                        {prop.mission_title || `Mission #${prop.mission}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {prop.freelance_info?.first_name || "Freelance"}{" "}
                        {prop.freelance_info?.last_name || "Freelance"} ·{" "}
                      </p>
                    </div>
                    <NavLink
                      to="/espace/projets"
                      className="shrink-0 px-3.5 py-1.5 rounded-xl bg-brand-ink hover:bg-brand-ink/85 text-white text-xs font-semibold transition-colors"
                    >
                      Workspace
                    </NavLink>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Flux d'activité */}
        <div className="col-span-12 lg:col-span-5">
          <VerticalNotificationSlider />
        </div>
      </div>
    </div>
  );
};
