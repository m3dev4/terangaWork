import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getPropositions, type Proposition } from "../../api/propositionsApi";
import { useConversions } from "../../hooks/useConversations";
import { getMediaUrl } from "../../utils/getMediaUrl";
import { VerticalNotificationSlider } from "./VerticalNotificationSlider";
import {
  Briefcase,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Award,
  MessageSquare,
  ShieldCheck,
  Search,
  User,
  Star,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { AuthUser } from "../../interfaces/authInterface";

interface FreelanceBentoDashboardProps {
  user: AuthUser | undefined;
}

export const FreelanceBentoDashboard: React.FC<FreelanceBentoDashboardProps> = ({
  user,
}) => {
  const { data: propositions = [], isLoading: isPropsLoading } = useQuery<
    Proposition[]
  >({
    queryKey: ["propositions-freelance-espace"],
    queryFn: getPropositions,
  });

  const { data: conversations = [], isLoading: isConvsLoading } =
    useConversions();

  const activeMissions = propositions.filter(
    (p) => p.proposition_status === "ACCEPTED"
  );

  const completedMissions = propositions.filter(
    (p) => p.proposition_status === "DELIVERED"
  );

  const pendingPropositions = propositions.filter(
    (p) => p.proposition_status === "PENDING"
  );

  const totalEarnings = propositions
    .filter(
      (p) =>
        p.proposition_status === "ACCEPTED" ||
        p.proposition_status === "DELIVERED"
    )
    .reduce((acc, p) => acc + (p.montant_propose || 0), 0);

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
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* ── Bandeau d'accueil ── */}
      <div className="relative overflow-hidden rounded-[32px] bg-[#111118] text-white p-8 sm:p-10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-white">
              Ravi de vous revoir, {user?.first_name || "Freelance"}
            </h1>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              Vos contrats en cours, vos gains cumulés et les opportunités à
              saisir, en un coup d'œil.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NavLink
                to="/espace/missions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] text-white text-sm font-semibold transition-colors"
              >
                <Search className="w-4.5 h-4.5" />
                <span>Trouver une mission</span>
              </NavLink>
              <NavLink
                to="/espace/mes-missions"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10"
              >
                <Briefcase className="w-4.5 h-4.5 text-[#E7B84B]" />
                <span>Mes projets ({activeMissions.length})</span>
              </NavLink>
            </div>
          </div>

          <div className="shrink-0 text-left lg:text-right">
            <p className="text-xs font-medium text-white/45">
              Propositions envoyées
            </p>
            <p className="text-5xl font-extrabold text-white font-heading mt-1">
              {propositions.length}
            </p>
            <p className="text-xs text-[#E7B84B] font-semibold mt-1">
              {pendingPropositions.length} en attente de réponse
            </p>
          </div>
        </div>
      </div>

      {/* ── Grille bento : indicateurs + actions ── */}
      <div className="grid grid-cols-12 gap-5 auto-rows-[minmax(132px,auto)]">
        {/* Gains — tuile haute, encre */}
        <div className="col-span-12 md:col-span-5 md:row-span-2 rounded-[28px] bg-[#111118] text-white p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">
              Gains cumulés
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#E7B84B]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-white font-heading">
              {formatMoney(totalEarnings)}
            </p>
            <p className="text-xs text-white/45 mt-2">
              Montant total des contrats acceptés ou livrés
            </p>
          </div>
          <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-white/70">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E7B84B]" />
              Virement garanti après validation
            </span>
            <NavLink
              to="/espace/mes-missions"
              className="font-semibold text-[#E7B84B] hover:text-[#f0c869]"
            >
              Paiements
            </NavLink>
          </div>
        </div>

        {/* Propositions soumises */}
        <div className="col-span-6 md:col-span-4 rounded-[24px] bg-[#F3EBDD] border border-[#111118]/8 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111118]/50">
              Propositions soumises
            </span>
            <Briefcase className="w-4.5 h-4.5 text-[#D95C38]" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#111118] font-heading">
              {propositions.length}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#111118]/55">
                {pendingPropositions.length} en étude
              </span>
              <NavLink
                to="/espace/mes-missions"
                className="text-xs font-semibold text-[#D95C38] hover:underline"
              >
                Voir
              </NavLink>
            </div>
          </div>
        </div>

        {/* Missions livrées */}
        <div className="col-span-6 md:col-span-3 rounded-[24px] bg-[#F3EBDD] border border-[#111118]/8 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111118]/50">
              Missions livrées
            </span>
            <CheckCircle2 className="w-4.5 h-4.5 text-[#D95C38]" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#111118] font-heading">
              {completedMissions.length}
            </p>
            <p className="text-xs text-[#111118]/55 mt-1">
              {activeMissions.length} en cours
            </p>
          </div>
        </div>

        {/* Messagerie — tuile action */}
        <NavLink
          to="/espace/messages"
          className="col-span-6 md:col-span-4 rounded-[24px] bg-[#E7B84B] p-6 flex items-center justify-between group transition-colors hover:bg-[#dfae3f]"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#111118]/10 flex items-center justify-center text-[#111118]">
              <MessageSquare className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-[#111118]">
              Messagerie directe
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-[#111118] group-hover:translate-x-1 transition-transform" />
        </NavLink>

        {/* Mon profil — tuile action */}
        <NavLink
          to="/espace/profil"
          className="col-span-6 md:col-span-3 rounded-[24px] bg-[#D95C38] p-6 flex items-center justify-between group transition-colors hover:bg-[#c14f2f]"
        >
          <div className="flex flex-col gap-3">
            <User className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white leading-tight">
              Profil & compétences
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-1 transition-transform" />
        </NavLink>
      </div>

      {/* ── Contenu principal + activité ── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Colonne principale */}
        <div className="col-span-12 lg:col-span-7 space-y-5">
          {/* Projets actifs les mieux rémunérés */}
          <div className="rounded-[28px] bg-white border border-[#111118]/8 p-6">
            <div className="flex items-center justify-between pb-4 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3EBDD] flex items-center justify-center text-[#D95C38]">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-[#111118]">
                    Contrats en cours
                  </h3>
                  <p className="text-xs text-[#111118]/50">
                    Classés par montant proposé
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/mes-missions"
                className="text-xs font-semibold text-[#D95C38] hover:underline flex items-center gap-1 shrink-0"
              >
                Tous mes projets
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {isPropsLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 bg-[#F3EBDD] rounded-2xl animate-pulse" />
                <div className="h-16 bg-[#F3EBDD] rounded-2xl animate-pulse" />
              </div>
            ) : topActiveMissions.length === 0 ? (
              <div className="text-center py-10 bg-[#F3EBDD]/60 rounded-2xl">
                <Briefcase className="w-8 h-8 text-[#111118]/25 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#111118]/70">
                  Aucun contrat en cours pour le moment
                </p>
                <p className="text-[11px] text-[#111118]/45 mt-1">
                  Postulez à une mission pour décrocher votre prochain contrat.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topActiveMissions.map((prop, idx) => (
                  <div
                    key={prop.id}
                    className="p-4 rounded-2xl bg-[#F3EBDD]/60 hover:bg-[#F3EBDD] transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#E7B84B] text-[#111118] flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-[#111118] truncate">
                          {prop.mission_title || `Mission #${prop.mission}`}
                        </p>
                        <p className="text-xs text-[#111118]/55">
                          {formatMoney(prop.montant_propose || 0)} · Délai{" "}
                          {prop.delai_execution_jours} j
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-white text-[#111118] font-bold text-xs border border-[#111118]/10">
                        En cours
                      </span>
                      <NavLink
                        to="/espace/mes-missions"
                        className="inline-flex items-center gap-1 text-[#D95C38] text-xs font-semibold hover:underline"
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
          <div className="rounded-[28px] bg-white border border-[#111118]/8 p-6">
            <div className="flex items-center justify-between pb-4 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3EBDD] flex items-center justify-center text-[#111118]">
                  <MessageSquare className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-[#111118]">
                    Discussions récentes
                  </h3>
                  <p className="text-xs text-[#111118]/50">
                    Vos conversations actives avec les annonceurs
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/messages"
                className="text-xs font-semibold text-[#111118] hover:underline flex items-center gap-1 shrink-0"
              >
                Messagerie
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {isConvsLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 bg-[#F3EBDD] rounded-2xl animate-pulse" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 bg-[#F3EBDD]/60 rounded-2xl">
                <p className="text-xs font-semibold text-[#111118]/70">
                  Aucune conversation récente
                </p>
                <p className="text-[11px] text-[#111118]/45 mt-1">
                  Les échanges avec vos clients s'afficheront ici.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {conversations.slice(0, 3).map((conv) => (
                  <NavLink
                    key={conv.mission_id}
                    to="/espace/messages"
                    className="p-4 rounded-2xl bg-[#F3EBDD]/60 hover:bg-[#F3EBDD] transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-full bg-[#111118]/10 overflow-hidden shrink-0">
                        {conv.autre_utilisateur?.profile_picture ? (
                          <img
                            src={getMediaUrl(conv.autre_utilisateur.profile_picture)}
                            alt="Avatar"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[#111118]/60 text-xs font-bold">
                            {conv.autre_utilisateur?.first_name?.[0] || "U"}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-[#111118] truncate">
                          {conv.autre_utilisateur?.first_name}{" "}
                          {conv.autre_utilisateur?.last_name}
                        </p>
                        <p className="text-xs text-[#111118]/55 truncate">
                          {conv.dernier_message?.content || conv.mission_titre}
                        </p>
                      </div>
                    </div>
                    {conv.nb_non_lus > 0 && (
                      <span className="shrink-0 px-2.5 py-1 rounded-full bg-[#D95C38] text-white text-xs font-bold">
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

          <div className="rounded-[28px] bg-white border border-[#111118]/8 p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden bg-[#F3EBDD] flex items-center justify-center text-[#111118] text-xl font-bold shrink-0">
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
              <p className="text-sm font-bold text-[#111118] truncate">
                {user?.first_name} {user?.last_name}
              </p>
              <p className="text-xs text-[#111118]/50 truncate">
                {user?.email}
              </p>
              <div className="flex items-center gap-1 text-xs text-[#D95C38]">
                <Star className="w-3.5 h-3.5 fill-[#E7B84B] text-[#E7B84B]" />
                <span className="font-bold text-[#111118]">4.9 / 5</span>
                <span className="text-[#111118]/45 text-[11px]">
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