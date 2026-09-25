import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { instance } from "../../../api/axios";
import { getMissions, moderateMission, type Mission } from "../../../api/missionsApi";
import { toast } from "../../../components/ui/toast";
import {
  Users,
  Briefcase,
  Wallet,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
  RefreshCw,
  Layers,
  Cpu,
  CheckCircle2,
  Clock,
  XCircle,
  Sparkles,
  Check,
  Trash2,
} from "lucide-react";

// ── Palette commune au dashboard (annonceur / freelance / admin) ───────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

interface AdminStats {
  users: {
    total: number;
    freelance: number;
    annonceur: number;
    admin: number;
    breakdown: Array<{ name: string; value: number; color: string }>;
  };
  missions: {
    total: number;
    pending_moderation?: number;
    open: number;
    in_progress: number;
    delivered: number;
    completed: number;
    closed: number;
    rejected?: number;
    status_breakdown: Array<{
      status: string;
      label: string;
      count: number;
      color: string;
    }>;
    avg_budget: number;
  };
  paiements: {
    total_count: number;
    montant_brut: number;
    montant_commission: number;
    montant_net: number;
    collecte: { en_attente: number; reussi: number; echoue: number };
    decaissement: { non_declenche: number; en_attente: number; reussi: number };
  };
  signalements: {
    total: number;
    pending: number;
    resolved: number;
    dismissed: number;
  };
  surplus: {
    top_services: Array<{ id: number; name: string; mission_count: number }>;
    top_technologies: Array<{
      id: number;
      name: string;
      imgUrl: string;
      mission_count: number;
    }>;
  };
}

export const AdminDashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const {
    data: stats,
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useQuery<AdminStats>({
    queryKey: ["adminDashboardStats"],
    queryFn: async () => {
      const response = await instance.get<AdminStats>("admin/dashboard/stats/");
      return response.data;
    },
    refetchInterval: 30000,
  });

  const missionsQuery = useQuery<Mission[]>({
    queryKey: ["adminMissionsList"],
    queryFn: getMissions,
    refetchInterval: 10000,
  });

  const moderateMutation = useMutation({
    mutationFn: moderateMission,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["adminMissionsList"] });
      queryClient.invalidateQueries({ queryKey: ["adminDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["missions"] });
      toast.add({
        title: variables.decision === "approuver" ? "Mission Approuvée" : "Mission Supprimée",
        description: data.detail || `La mission #${variables.missionId} a été traitée.`,
        type: variables.decision === "approuver" ? "success" : "warning",
      });
    },
    onError: (err: any) => {
      toast.add({
        title: "Erreur de modération",
        description: err?.response?.data?.detail || "Impossible de modérer cette mission.",
        type: "error",
      });
    },
  });

  const pendingMissions = (missionsQuery.data || []).filter(
    (m) => m.status === "PENDING_MODERATION"
  );

  const formatFCFA = (val: number) => {
    return new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "XOF",
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-[#D95C38] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-[#111118]/50">
          Chargement des données administrateur...
        </p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-6 bg-[#D95C38]/10 border border-[#D95C38]/25 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-[#D95C38] mx-auto" />
        <h3 className="text-base font-semibold text-[#111118]">
          Impossible de charger le tableau de bord
        </h3>
        <p className="text-xs text-[#c14f2f]">
          Vérifiez vos permissions administrateur et la connexion au serveur.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-[#D95C38] text-white rounded-xl text-xs font-semibold hover:bg-[#c14f2f] transition cursor-pointer"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const userTotal = stats.users.total || 1;
  const freelancePct = Math.round((stats.users.freelance / userTotal) * 100);
  const annonceurPct = Math.round((stats.users.annonceur / userTotal) * 100);
  const adminPct = 100 - (freelancePct + annonceurPct);

  return (
    <div className="space-y-6 pb-8">
      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#111118] text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-[#E7B84B]">
              Espace administrateur
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/60 font-semibold bg-white/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#E7B84B] animate-pulse" />
              Données temps réel
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Vue d'ensemble de la plateforme
          </h1>
          <p className="text-xs text-white/50 mt-0.5">
            Suivi des utilisateurs, missions, flux financiers et modération
            Jëfly.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-white/10 hover:bg-white/15 rounded-xl transition cursor-pointer disabled:opacity-50 shrink-0"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`}
          />
          <span>Actualiser</span>
        </button>
      </div>

      {/* ── Section Modération Manuelle des Missions (Bento Grid) ── */}
      <div className="rounded-[24px] border border-[#111118]/8 bg-white p-5 hover:shadow-md transition space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111118]/6 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#111118] text-[#E7B84B]">
              <Clock className="h-5 w-5 animate-pulse text-[#E7B84B]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#111118]">
                  Modération Manuelle des Missions
                </h3>
                {pendingMissions.length > 0 ? (
                  <span className="rounded-full bg-[#E7B84B]/20 border border-[#E7B84B]/50 px-2.5 py-0.5 text-[9.5px] font-bold text-[#a87921]">
                    {pendingMissions.length} mission(s) en attente
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 text-emerald-800 px-2.5 py-0.5 text-[9.5px] font-semibold">
                    Toutes les missions sont modérées
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#111118]/40 mt-0.5">
                Validez les nouvelles offres pour les publier aux freelances ou supprimez-les directement d'un simple clic.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#111118] px-3 py-1 text-[10px] font-semibold text-[#E7B84B] shrink-0">
            <Sparkles className="w-3 h-3 text-[#E7B84B]" />
            Modération Admin Directe
          </span>
        </div>

        {pendingMissions.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#111118]/40 bg-[#F3EBDD]/20 rounded-2xl border border-dashed border-[#111118]/10">
            Aucune mission en attente de modération pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingMissions.map((m) => (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-2xl border border-[#E7B84B]/40 bg-[#F3EBDD]/30 p-4 transition hover:border-[#111118]/20"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="rounded-full bg-[#111118] px-2 py-0.5 text-[9px] font-bold text-[#E7B84B]">
                      En attente de validation
                    </span>
                    <span className="text-[10px] text-[#111118]/40 font-mono">
                      #{m.id}
                    </span>
                  </div>
                  <h4 className="font-heading text-xs font-bold text-[#111118] line-clamp-1">
                    {m.title}
                  </h4>
                  <p className="text-[10.5px] text-[#111118]/60 line-clamp-2 mt-1 leading-relaxed">
                    {m.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-[#111118]/50">
                    <span>Budget : <strong>{new Intl.NumberFormat("fr-FR").format(m.budget)} FCFA</strong></span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-[#111118]/8 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={moderateMutation.isPending}
                    onClick={() =>
                      moderateMutation.mutate({
                        missionId: m.id,
                        decision: "supprimer",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[10px] font-semibold text-red-700 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="h-3 w-3" /> Supprimer
                  </button>
                  <button
                    type="button"
                    disabled={moderateMutation.isPending}
                    onClick={() =>
                      moderateMutation.mutate({
                        missionId: m.id,
                        decision: "approuver",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-xl bg-[#111118] px-3.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#111118]/85 transition cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 text-[#E7B84B]" /> Approuver & Publier
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Grille bento ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {/* Utilisateurs */}
        <div className="md:col-span-2 bg-white rounded-[24px] border border-[#111118]/8 p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F3EBDD] text-[#D95C38]">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111118]">
                    Utilisateurs inscrits
                  </h3>
                  <p className="text-xs text-[#111118]/40">
                    Répartition communauté
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#111118] tracking-tight">
                  {stats.users.total}
                </span>
                <span className="block text-[10px] text-[#D95C38] font-semibold">
                  Total comptes
                </span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="h-3 w-full bg-[#F3EBDD] rounded-full overflow-hidden flex gap-0.5 p-0.5">
                <div
                  style={{ width: `${freelancePct}%` }}
                  className="h-full bg-[#111118] rounded-l-full transition-all duration-500"
                  title={`Freelances: ${freelancePct}%`}
                />
                <div
                  style={{ width: `${annonceurPct}%` }}
                  className="h-full bg-[#D95C38] transition-all duration-500"
                  title={`Annonceurs: ${annonceurPct}%`}
                />
                <div
                  style={{ width: `${Math.max(adminPct, 2)}%` }}
                  className="h-full bg-[#E7B84B] rounded-r-full transition-all duration-500"
                  title={`Admins: ${adminPct}%`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-2.5 bg-[#F3EBDD]/50 rounded-xl border border-[#111118]/6">
                  <div className="flex items-center gap-1.5 text-[#111118]/50 font-medium text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#111118]" />
                    <span>Freelances</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-[#111118] text-sm">
                      {stats.users.freelance}
                    </span>
                    <span className="text-[10px] text-[#111118]/35">
                      {freelancePct}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#F3EBDD]/50 rounded-xl border border-[#111118]/6">
                  <div className="flex items-center gap-1.5 text-[#111118]/50 font-medium text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#D95C38]" />
                    <span>Annonceurs</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-[#111118] text-sm">
                      {stats.users.annonceur}
                    </span>
                    <span className="text-[10px] text-[#111118]/35">
                      {annonceurPct}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-[#F3EBDD]/50 rounded-xl border border-[#111118]/6">
                  <div className="flex items-center gap-1.5 text-[#111118]/50 font-medium text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#E7B84B]" />
                    <span>Admins</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-[#111118] text-sm">
                      {stats.users.admin}
                    </span>
                    <span className="text-[10px] text-[#111118]/35">
                      {adminPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#111118]/6 flex items-center justify-between text-[11px] text-[#111118]/40">
            <span>Activité communauté Jëfly</span>
            <span className="text-[#D95C38] font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Croissance active
            </span>
          </div>
        </div>

        {/* Missions par statut */}
        <div className="md:col-span-2 bg-white rounded-[24px] border border-[#111118]/8 p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#F3EBDD] text-[#D95C38]">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111118]">
                    Missions publiées
                  </h3>
                  <p className="text-xs text-[#111118]/40">
                    Statut du pipeline de projets
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-[#111118] tracking-tight">
                  {stats.missions.total}
                </span>
                <span className="block text-[10px] text-[#111118]/40">
                  Total publiées
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
              {stats.missions.status_breakdown.map((item) => (
                <div
                  key={item.status}
                  className="p-2.5 rounded-xl border border-[#111118]/6 bg-[#F3EBDD]/40 flex flex-col justify-between"
                >
                  <span className="text-[10px] font-semibold tracking-tight truncate text-[#111118]/60">
                    {item.label}
                  </span>
                  <span className="text-lg font-bold text-[#111118] mt-1">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-xl bg-[#F3EBDD]/50 border border-[#111118]/6 flex items-center justify-between">
              <span className="text-xs font-medium text-[#111118]/60">
                Budget moyen par mission :
              </span>
              <span className="text-sm font-bold text-[#111118]">
                {formatFCFA(stats.missions.avg_budget)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-[#111118]/6 flex items-center justify-between text-[11px] text-[#111118]/40">
            <span>Pipeline de développement</span>
            <span className="text-[#D95C38] font-semibold">Offre active</span>
          </div>
        </div>

        {/* Flux financiers */}
        <div className="md:col-span-2 lg:col-span-3 bg-white rounded-[24px] border border-[#111118]/8 p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F3EBDD] text-[#D95C38]">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111118]">
                  Flux financiers & paiements
                </h3>
                <p className="text-xs text-[#111118]/40">
                  Volume brut, commissions et statuts
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-[#111118] text-white rounded-full">
              {stats.paiements.total_count} transaction(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3.5 bg-[#F3EBDD]/50 rounded-xl border border-[#111118]/8">
              <span className="text-[11px] font-medium text-[#111118]/60">
                Volume brut total
              </span>
              <p className="text-xl font-black text-[#111118] mt-0.5">
                {formatFCFA(stats.paiements.montant_brut)}
              </p>
            </div>

            <div className="p-3.5 bg-[#E7B84B]/15 rounded-xl border border-[#E7B84B]/30">
              <span className="text-[11px] font-medium text-[#a87921]">
                Commission Jëfly
              </span>
              <p className="text-xl font-black text-[#a87921] mt-0.5">
                {formatFCFA(stats.paiements.montant_commission)}
              </p>
            </div>

            <div className="p-3.5 bg-[#111118] rounded-xl border border-[#111118]">
              <span className="text-[11px] font-medium text-white/60">
                Montant net freelances
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {formatFCFA(stats.paiements.montant_net)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-[#111118]/6 bg-[#F3EBDD]/30">
              <h4 className="text-xs font-bold text-[#111118]/70 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#D95C38]" /> Collectes
                d'annonceurs
              </h4>
              <div className="flex items-center justify-between text-xs text-[#111118]/60">
                <span className="flex items-center gap-1 text-[#111118] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D95C38]" /> Réussi
                  : {stats.paiements.collecte.reussi}
                </span>
                <span className="flex items-center gap-1 text-[#a87921] font-medium">
                  <Clock className="w-3.5 h-3.5" /> En attente :{" "}
                  {stats.paiements.collecte.en_attente}
                </span>
                <span className="flex items-center gap-1 text-[#c14f2f] font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Échoué :{" "}
                  {stats.paiements.collecte.echoue}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-[#111118]/6 bg-[#F3EBDD]/30">
              <h4 className="text-xs font-bold text-[#111118]/70 mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#111118]" />{" "}
                Décaissements vers freelances
              </h4>
              <div className="flex items-center justify-between text-xs text-[#111118]/60">
                <span className="flex items-center gap-1 text-[#111118] font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#D95C38]" /> Réussi
                  : {stats.paiements.decaissement.reussi}
                </span>
                <span className="flex items-center gap-1 text-[#a87921] font-medium">
                  <Clock className="w-3.5 h-3.5" /> En attente :{" "}
                  {stats.paiements.decaissement.en_attente}
                </span>
                <span className="text-[#111118]/35 font-medium">
                  Non déclenché : {stats.paiements.decaissement.non_declenche}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modération */}
        <div className="md:col-span-1 bg-white rounded-[24px] border border-[#111118]/8 p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-[#D95C38]/10 text-[#D95C38]">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111118]">
                    Modération
                  </h3>
                  <p className="text-xs text-[#111118]/40">
                    Signalements reçus
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#D95C38]/8 border border-[#D95C38]/20 text-center space-y-1 mb-4">
              <span className="text-3xl font-black text-[#D95C38]">
                {stats.signalements.pending}
              </span>
              <p className="text-xs font-semibold text-[#111118]">
                Signalements en attente
              </p>
              <p className="text-[10px] text-[#111118]/45">
                Nécessitent une action administrateur
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-[#111118]/6 text-[#111118]/60">
                <span>Signalements résolus</span>
                <span className="font-bold text-[#111118]">
                  {stats.signalements.resolved}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-[#111118]/6 text-[#111118]/60">
                <span>Signalements rejetés</span>
                <span className="font-bold text-[#111118]/40">
                  {stats.signalements.dismissed}
                </span>
              </div>
              <div className="flex justify-between py-1 text-[#111118]/60">
                <span>Total historique</span>
                <span className="font-bold text-[#111118]">
                  {stats.signalements.total}
                </span>
              </div>
            </div>
          </div>

          <a
            href="/espace/admin/signalements"
            className="mt-4 w-full py-2 bg-[#D95C38] hover:bg-[#c14f2f] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>Gérer la modération</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Catalogue insights */}
        <div className="md:col-span-2 lg:col-span-4 bg-white rounded-[24px] border border-[#111118]/8 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-[#E7B84B]" />
            <h3 className="text-sm font-bold text-[#111118]">
              Catalogue insights & données surplus
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#111118]/60 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#D95C38]" /> Top services
                les plus demandés
              </h4>
              {stats.surplus.top_services.length === 0 ? (
                <p className="text-xs text-[#111118]/40 italic">
                  Aucun service référencé pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.surplus.top_services.map((svc, idx) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-2.5 bg-[#F3EBDD]/40 rounded-xl border border-[#111118]/6 hover:bg-[#F3EBDD]/70 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-[#111118] text-white font-bold text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-[#111118]">
                          {svc.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-[#111118]/50 bg-white px-2.5 py-0.5 rounded-full border border-[#111118]/10">
                        {svc.mission_count} mission(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#111118]/60 flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-[#D95C38]" /> Top technologies
                les plus utilisées
              </h4>
              {stats.surplus.top_technologies.length === 0 ? (
                <p className="text-xs text-[#111118]/40 italic">
                  Aucune technologie associée pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.surplus.top_technologies.map((tech, idx) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-2.5 bg-[#F3EBDD]/40 rounded-xl border border-[#111118]/6 hover:bg-[#F3EBDD]/70 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        {tech.imgUrl ? (
                          <img
                            src={tech.imgUrl}
                            alt={tech.name}
                            className="w-5 h-5 object-contain rounded-xs"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-[#E7B84B]/25 text-[#a87921] font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-[#111118]">
                          {tech.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-[#111118]/50 bg-white px-2.5 py-0.5 rounded-full border border-[#111118]/10">
                        {tech.mission_count} mission(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboardPage;
