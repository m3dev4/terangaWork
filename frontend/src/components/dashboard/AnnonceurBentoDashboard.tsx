import React from "react";
import { useQuery } from "@tanstack/react-query";
import { getMissions, type Mission } from "../../api/missionsApi";
import { getPropositions, type Proposition } from "../../api/propositionsApi";
import { VerticalNotificationSlider } from "./VerticalNotificationSlider";
import {
  PlusCircle,
  Briefcase,
  Users,
  CheckCircle2,
  DollarSign,
  ArrowRight,
  ChevronRight,
  Award,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import type { AuthUser } from "../../interfaces/authInterface";

interface AnnonceurBentoDashboardProps {
  user: AuthUser | undefined;
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
    queryFn: getPropositions,
  });

  const activeMissionsCount = missions.filter(
    (m) => m.status === "IN_PROGRESS" || m.status === "OPEN"
  ).length;

  const totalPropositionsCount = propositions.length;
  const pendingPropositionsCount = propositions.filter(
    (p) => p.proposition_status === "PENDING"
  ).length;

  const totalSpent = propositions
    .filter(
      (p) =>
        p.proposition_status === "ACCEPTED" ||
        p.proposition_status === "DELIVERED"
    )
    .reduce((acc, p) => acc + (p.montant_propose || 0), 0);

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
    <div className="space-y-5 max-w-7xl mx-auto pb-16">
      {/* ── Bandeau d'accueil ── */}
      <div className="relative overflow-hidden rounded-[32px] bg-[#111118] text-white p-8 sm:p-10">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="space-y-4 max-w-xl">
            <h1 className="text-3xl sm:text-4xl font-extrabold font-heading tracking-tight text-white">
              Ravi de vous revoir, {user?.first_name || "Annonceur"}
            </h1>
            <p className="text-white/60 text-sm sm:text-base leading-relaxed">
              Vos offres, vos candidats les plus actifs et l'avancement de vos
              projets, en un coup d'œil.
            </p>
            <div className="pt-2 flex flex-wrap items-center gap-3">
              <NavLink
                to="/espace/publier-mission"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] text-white text-sm font-semibold transition-colors"
              >
                <PlusCircle className="w-4.5 h-4.5" />
                <span>Publier une nouvelle mission</span>
              </NavLink>
              <NavLink
                to="/espace/candidatures-recues"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors border border-white/10"
              >
                <Users className="w-4.5 h-4.5 text-[#E7B84B]" />
                <span>Candidatures reçues ({pendingPropositionsCount})</span>
              </NavLink>
            </div>
          </div>

          <div className="shrink-0 text-left lg:text-right">
            <p className="text-xs font-medium text-white/45">
              Annonces publiées
            </p>
            <p className="text-5xl font-extrabold text-white font-heading mt-1">
              {missions.length}
            </p>
            <p className="text-xs text-[#E7B84B] font-semibold mt-1">
              {activeMissionsCount} active{activeMissionsCount > 1 ? "s" : ""}{" "}
              en ce moment
            </p>
          </div>
        </div>
      </div>

      {/* ── Grille bento : indicateurs + actions ── */}
      <div className="grid grid-cols-12 gap-5 auto-rows-[minmax(132px,auto)]">
        {/* Budget — tuile haute, encre */}
        <div className="col-span-12 md:col-span-5 md:row-span-2 rounded-[28px] bg-[#111118] text-white p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/50">
              Budget & dépenses
            </span>
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-[#E7B84B]">
              <DollarSign className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-4xl font-extrabold text-white font-heading">
              {formatMoney(totalSpent)}
            </p>
            <p className="text-xs text-white/45 mt-2">
              Montant total des paiements validés
            </p>
          </div>
          <div className="pt-5 border-t border-white/10 flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-white/70">
              <ShieldCheck className="w-3.5 h-3.5 text-[#E7B84B]" />
              Paiement en séquestre sécurisé
            </span>
            <NavLink
              to="/espace/candidatures-recues"
              className="font-semibold text-[#E7B84B] hover:text-[#f0c869]"
            >
              Historique
            </NavLink>
          </div>
        </div>

        {/* Annonces publiées */}
        <div className="col-span-6 md:col-span-4 rounded-[24px] bg-[#F3EBDD] border border-[#111118]/8 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111118]/50">
              Annonces publiées
            </span>
            <Briefcase className="w-4.5 h-4.5 text-[#D95C38]" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#111118] font-heading">
              {missions.length}
            </p>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-[#111118]/55">
                {activeMissionsCount} en cours
              </span>
              <NavLink
                to="/espace/mes-annonces"
                className="text-xs font-semibold text-[#D95C38] hover:underline"
              >
                Gérer
              </NavLink>
            </div>
          </div>
        </div>

        {/* Candidatures reçues */}
        <div className="col-span-6 md:col-span-3 rounded-[24px] bg-[#F3EBDD] border border-[#111118]/8 p-6 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#111118]/50">
              Candidatures
            </span>
            <Users className="w-4.5 h-4.5 text-[#D95C38]" />
          </div>
          <div>
            <p className="text-3xl font-extrabold text-[#111118] font-heading">
              {totalPropositionsCount}
            </p>
            <p className="text-xs text-[#111118]/55 mt-1">
              {pendingPropositionsCount} en attente
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

        {/* Évaluer candidats — tuile action */}
        <NavLink
          to="/espace/candidatures-recues"
          className="col-span-6 md:col-span-3 rounded-[24px] bg-[#D95C38] p-6 flex items-center justify-between group transition-colors hover:bg-[#c14f2f]"
        >
          <div className="flex flex-col gap-3">
            <Users className="w-5 h-5 text-white" />
            <span className="text-sm font-bold text-white leading-tight">
              Évaluer les candidats
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-white shrink-0 group-hover:translate-x-1 transition-transform" />
        </NavLink>
      </div>

      {/* ── Contenu principal + activité ── */}
      <div className="grid grid-cols-12 gap-5">
        {/* Colonne principale */}
        <div className="col-span-12 lg:col-span-7 space-y-5">
          {/* Missions les plus candidatées */}
          <div className="rounded-[28px] bg-white border border-[#111118]/8 p-6">
            <div className="flex items-center justify-between pb-4 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3EBDD] flex items-center justify-center text-[#D95C38]">
                  <Award className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-[#111118]">
                    Missions les plus candidatées
                  </h3>
                  <p className="text-xs text-[#111118]/50">
                    Classées par nombre d'offres reçues
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/mes-annonces"
                className="text-xs font-semibold text-[#D95C38] hover:underline flex items-center gap-1 shrink-0"
              >
                Toutes mes annonces
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {isMissionsLoading || isPropsLoading ? (
              <div className="space-y-2.5">
                <div className="h-16 bg-[#F3EBDD] rounded-2xl animate-pulse" />
                <div className="h-16 bg-[#F3EBDD] rounded-2xl animate-pulse" />
              </div>
            ) : topMissions.length === 0 ? (
              <div className="text-center py-10 bg-[#F3EBDD]/60 rounded-2xl">
                <Briefcase className="w-8 h-8 text-[#111118]/25 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#111118]/70">
                  Aucune candidature reçue pour le moment
                </p>
                <p className="text-[11px] text-[#111118]/45 mt-1">
                  Publiez une nouvelle mission pour attirer des candidats.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {topMissions.map((m, idx) => (
                  <div
                    key={m.id}
                    className="p-4 rounded-2xl bg-[#F3EBDD]/60 hover:bg-[#F3EBDD] transition-colors flex items-center justify-between gap-4 group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-[#E7B84B] text-[#111118] flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-[#111118] truncate">
                          {m.title || (m as any).titre || `Mission #${m.id}`}
                        </p>
                        <p className="text-xs text-[#111118]/55">
                          {m.budget ? formatMoney(m.budget) : "Sur devis"} ·{" "}
                          {m.status}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="px-3 py-1 rounded-full bg-white text-[#111118] font-bold text-xs border border-[#111118]/10">
                        {m.candidateCount} candidat
                        {m.candidateCount > 1 ? "s" : ""}
                      </span>
                      <NavLink
                        to="/espace/candidatures-recues"
                        className="inline-flex items-center gap-1 text-[#D95C38] text-xs font-semibold hover:underline"
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
          <div className="rounded-[28px] bg-white border border-[#111118]/8 p-6">
            <div className="flex items-center justify-between pb-4 mb-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#F3EBDD] flex items-center justify-center text-[#111118]">
                  <CheckCircle2 className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold font-heading text-[#111118]">
                    Projets actifs
                  </h3>
                  <p className="text-xs text-[#111118]/50">
                    Missions attribuées, en cours de réalisation
                  </p>
                </div>
              </div>
              <NavLink
                to="/espace/projets"
                className="text-xs font-semibold text-[#111118] hover:underline flex items-center gap-1 shrink-0"
              >
                Workspaces
                <ChevronRight className="w-3.5 h-3.5" />
              </NavLink>
            </div>

            {activeProjects.length === 0 ? (
              <div className="text-center py-8 bg-[#F3EBDD]/60 rounded-2xl">
                <p className="text-xs font-semibold text-[#111118]/70">
                  Aucun projet en cours de développement
                </p>
                <p className="text-[11px] text-[#111118]/45 mt-1">
                  Acceptez une candidature pour démarrer un contrat.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {activeProjects.slice(0, 3).map((prop) => (
                  <div
                    key={prop.id}
                    className="p-4 rounded-2xl bg-[#F3EBDD]/60 flex items-center justify-between gap-4"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <p className="text-sm font-bold text-[#111118] truncate">
                        {prop.mission_title || `Mission #${prop.mission}`}
                      </p>
                      <p className="text-xs text-[#111118]/55">
                        {prop.freelance_info?.first_name || "Freelance"}{" "}
                        {prop.freelance_info?.last_name || "Freelance"} ·{" "}
                      </p>
                    </div>
                    <NavLink
                      to="/espace/projets"
                      className="shrink-0 px-3.5 py-1.5 rounded-xl bg-[#111118] hover:bg-[#111118]/85 text-white text-xs font-semibold transition-colors"
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
