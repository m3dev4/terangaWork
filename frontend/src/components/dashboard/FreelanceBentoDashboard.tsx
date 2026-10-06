import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPropositions, type Proposition } from "../../api/propositionsApi";
import { getDashboardStats } from "../../api/paiementApi";
import { useConversions } from "../../hooks/useConversations";
import { getMediaUrl } from "../../utils/getMediaUrl";
import { VerticalNotificationSlider } from "./VerticalNotificationSlider";
import DashboardIcon from "./DashboardIcon";
import {
  Briefcase,
  ArrowRight,
  ChevronRight,
  ShieldCheck,
  Search,
  Star,
  Clock4,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { AuthUser } from "../../interfaces/authInterface";

interface FreelanceBentoDashboardProps {
  user: AuthUser | null | undefined;
}

export const FreelanceBentoDashboard: React.FC<FreelanceBentoDashboardProps> = ({
  user,
}) => {
  const { data: propositions = [], isLoading: isPropsLoading } = useQuery<
    Proposition[]
  >({
    queryKey: ["propositions-freelance-espace"],
    queryFn: () => getPropositions(),
  });

  const { data: conversations = [], isLoading: isConvsLoading } =
    useConversions();

  const { data: dashboardStats, isLoading: isStatsLoading } =
    useQuery({
      queryKey: ["dashboard-stats-freelance"],
      queryFn: getDashboardStats,
      select: (stats) => stats.role === "freelance" ? stats : undefined,
    });

  const activeMissions = propositions.filter(
    (p) => p.proposition_status === "ACCEPTED"
  );

  const completedMissions = propositions.filter(
    (p) => p.proposition_status === "DELIVERED"
  );

  const pendingPropositions = propositions.filter(
    (p) => p.proposition_status === "PENDING"
  );

  const totalEarnings = dashboardStats?.total_earned_net ?? 0;
  const pendingEarnings = dashboardStats?.total_pending_net ?? 0;

  // Classement des projets par montant proposé, pour mettre en avant les contrats les plus rémunérateurs
  const rankedActiveMissions = React.useMemo(() => {
    return [...activeMissions].sort(
      (a, b) => (b.montant_propose || 0) - (a.montant_propose || 0)
    );
  }, [activeMissions]);

  const topActiveMissions = rankedActiveMissions.slice(0, 4);

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
              Ravi de vous revoir, {user?.first_name || "Freelance"}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base leading-relaxed">
              Vos contrats en cours, vos gains cumulés et les opportunités à
              saisir, en un coup d'œil.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NavLink
                to="/espace/missions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass-primary bg-brand-green hover:bg-brand-green-hover text-brand-ink text-sm font-semibold transition-colors"
              >
                <Search className="w-4.5 h-4.5" />
                <span>Trouver une mission</span>
              </NavLink>
              <NavLink
                to="/espace/mes-missions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl glass-button-secondary text-sm font-medium transition-colors"
              >
                <Briefcase className="w-4.5 h-4.5 glass-accent" />
                <span>Mes projets ({activeMissions.length})</span>
              </NavLink>
            </div>
          </div>

          <div className="glass-hero-stat shrink-0">
            <DashboardIcon kind="work" size="hero" />
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Propositions envoyées
              </p>
              <p className="text-5xl font-extrabold text-foreground font-heading mt-1">
                {propositions.length}
              </p>
              <p className="text-xs glass-accent font-semibold mt-1">
                {pendingPropositions.length} en attente de réponse
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grille bento : indicateurs + actions ── */}
      <div className="grid grid-cols-12 gap-5 auto-rows-[minmax(156px,auto)]">
        {/* Gains cumulés */}
        <div className="glass-card glass-card--money col-span-12 md:col-span-5 md:row-span-2 p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Gains cumulés
            </span>
            <DashboardIcon kind="cash" size="large" />
          </div>
          <div>
            {isStatsLoading ? (
              <div className="h-12 w-40 glass-skeleton rounded-xl animate-pulse" />
            ) : (
              <>
                <p className="glass-amount font-extrabold text-foreground font-heading">
                  {formatMoney(totalEarnings)}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Montant net effectivement reçu (décaissements réussis)
                </p>
                {pendingEarnings > 0 && (
                  <p className="text-xs glass-accent mt-2 flex items-center gap-1.5">
                    <Clock4 className="w-3.5 h-3.5" />
                    {formatMoney(pendingEarnings)} en attente
                  </p>
                )}
              </>
            )}
          </div>
          <div className="pt-5 border-t glass-divider flex flex-wrap gap-3 items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <ShieldCheck className="w-3.5 h-3.5 glass-accent" />
              Virement garanti après validation
            </span>
            <NavLink
              to="/espace/mes-missions"
              className="font-semibold glass-accent hover:underline"
            >
              Paiements
            </NavLink>
          </div>
        </div>

        {/* Propositions soumises */}
        <div className="min-w-0 col-span-12 sm:col-span-6 md:col-span-4 glass-card glass-card--stat p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Propositions soumises
            </span>
            <DashboardIcon kind="work" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground font-heading">
              {propositions.length}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {pendingPropositions.length} en étude
              </span>
              <NavLink
                to="/espace/mes-missions"
                className="text-xs font-semibold glass-link hover:underline"
              >
                Voir
              </NavLink>
            </div>
          </div>
        </div>

        {/* Missions livrées */}
        <div className="min-w-0 col-span-12 sm:col-span-6 md:col-span-3 glass-card glass-card--stat p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">
              Missions livrées
            </span>
            <DashboardIcon kind="award" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-foreground font-heading">
              {completedMissions.length}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {activeMissions.length} en cours
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

        {/* Mon profil — tuile action */}
        <NavLink
          to="/espace/profil"
          className="min-w-0 col-span-12 sm:col-span-6 md:col-span-3 glass-card glass-card--action glass-card--violet p-6 flex items-center justify-between gap-3 group"
        >
          <div className="flex flex-col gap-3">
            <DashboardIcon kind="user" />
            <span className="text-sm font-bold text-foreground leading-tight">
              Profil & compétences
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-foreground shrink-0 group-hover:translate-x-1 transition-transform" />
        </NavLink>
      </div>

      {/* ── Contenu principal + activité ── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Colonne principale */}
        <div className="col-span-12 lg:col-span-7 space-y-5">
          {/* Projets actifs les mieux rémunérés */}
          <div className="glass-card p-6">
            <div className="glass-section-heading">
              <div className="flex items-center gap-3">
                <DashboardIcon kind="award" size="small" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-foreground">
                    Contrats en cours
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Classés par montant proposé
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/mes-missions"
                className="text-xs font-semibold glass-link hover:underline flex items-center gap-1 shrink-0"
              >
                Tous mes projets
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {isPropsLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 glass-inset rounded-2xl animate-pulse" />
                <div className="h-16 glass-inset rounded-2xl animate-pulse" />
              </div>
            ) : topActiveMissions.length === 0 ? (
              <div className="text-center py-10 glass-inset rounded-2xl">
                <Briefcase className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Aucun contrat en cours pour le moment
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Postulez à une mission pour décrocher votre prochain contrat.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topActiveMissions.map((prop, idx) => (
                  <div
                    key={prop.id}
                    className="p-4 rounded-2xl glass-inset glass-row flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg glass-chip flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-foreground truncate">
                          {prop.mission_title || `Mission #${prop.mission}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatMoney(prop.montant_propose || 0)} · Livraison{" "}
                          {new Date(`${prop.date_livraison}T00:00:00`).toLocaleDateString("fr-FR")}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1 rounded-full glass-chip font-bold text-xs border glass-divider">
                        En cours
                      </span>
                      <NavLink
                        to="/espace/mes-missions"
                        className="inline-flex items-center gap-1 glass-link text-xs font-semibold hover:underline"
                      >
                        Gérer
                        <ArrowRight className="w-3.5 h-3.5" />
                      </NavLink>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Discussions récentes */}
          <div className="glass-card p-6">
            <div className="glass-section-heading">
              <div className="flex items-center gap-3">
                <DashboardIcon kind="chat" size="small" />
                <div>
                  <h3 className="text-sm font-bold font-heading text-foreground">
                    Discussions récentes
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Vos conversations actives avec les annonceurs
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/messages"
                className="text-xs font-semibold text-foreground hover:underline flex items-center gap-1 shrink-0"
              >
                Messagerie
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {isConvsLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 glass-inset rounded-2xl animate-pulse" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 glass-inset rounded-2xl">
                <p className="text-xs font-semibold text-muted-foreground">
                  Aucune conversation récente
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Les échanges avec vos clients s'afficheront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {conversations.slice(0, 3).map((conv) => (
                  <NavLink
                    key={conv.mission_id}
                    to="/espace/messages"
                    className="p-4 rounded-2xl glass-inset glass-row flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-brand-ink/10 overflow-hidden shrink-0">
                        {conv.autre_utlisateur?.profile_picture ? (
                          <img
                            src={getMediaUrl(conv.autre_utlisateur.profile_picture)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs font-bold">
                            {conv.autre_utlisateur?.first_name?.[0] || "U"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-foreground truncate">
                          {conv.autre_utlisateur?.first_name}{" "}
                          {conv.autre_utlisateur?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.dernier_message?.content || conv.mission_titre}
                        </p>
                      </div>
                    </div>
                    {conv.nb_non_lus > 0 && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-brand-green text-brand-ink text-xs font-bold">
                        {conv.nb_non_lus} non lu{conv.nb_non_lus > 1 ? "s" : ""}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Flux d'activité + profil */}
        <div className="col-span-12 lg:col-span-5 space-y-5">
          <VerticalNotificationSlider />

          <div className="glass-card p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden glass-inset flex items-center justify-center text-foreground text-xl font-bold shrink-0">
              {user?.profile_picture ? (
                <img
                  src={getMediaUrl(user.profile_picture)}
                  alt={user.first_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                user?.first_name?.[0] || "F"
              )}
            </div>
            <div className="min-w-0 space-y-1">
              <p className="text-sm font-bold text-foreground truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {user?.email}
              </p>
              <div className="flex items-center gap-1 text-xs glass-link">
                <Star className="w-3.5 h-3.5 fill-brand-peach glass-accent" />
                <span className="font-bold text-foreground">4.9 / 5</span>
                <span className="text-muted-foreground text-[11px]">
                  (profil vérifié)
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
