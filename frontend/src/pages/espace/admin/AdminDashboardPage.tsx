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
        <div className="w-12 h-12 border-4 border-brand-green border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-muted-foreground">
          Chargement des données administrateur...
        </p>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="p-6 bg-brand-green/10 border border-brand-green/25 rounded-2xl text-center space-y-3">
        <ShieldAlert className="w-10 h-10 text-brand-violet dark:text-violet-300 mx-auto" />
        <h3 className="text-base font-semibold text-brand-ink dark:text-foreground">
          Impossible de charger le tableau de bord
        </h3>
        <p className="text-xs text-brand-violet dark:text-violet-300">
          Vérifiez vos permissions administrateur et la connexion au serveur.
        </p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-brand-green text-brand-ink dark:text-primary-foreground rounded-xl text-xs font-semibold hover:bg-brand-green-hover transition cursor-pointer"
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
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-brand-green">
              Espace administrateur
            </span>
            <span className="flex items-center gap-1 text-[10px] text-white/75 font-semibold bg-white/10 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-peach dark:bg-brand-peach/10 animate-pulse" />
              Données temps réel
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Vue d'ensemble de la plateforme
          </h1>
          <p className="text-xs text-white/75 mt-0.5">
            Suivi des utilisateurs, missions, flux financiers et modération
            Teranga Work.
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
      <div className="rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-5 hover:shadow-md transition space-y-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-ink/6 dark:border-border pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-ink text-brand-green">
              <Clock className="h-5 w-5 animate-pulse text-brand-green" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                  Modération Manuelle des Missions
                </h3>
                {pendingMissions.length > 0 ? (
                  <span className="rounded-full bg-brand-peach/20 dark:bg-brand-peach/10 border border-brand-peach/50 px-2.5 py-0.5 text-[9.5px] font-bold text-brand-ink dark:text-foreground">
                    {pendingMissions.length} mission(s) en attente
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-100 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 px-2.5 py-0.5 text-[9.5px] font-semibold">
                    Toutes les missions sont modérées
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Validez les nouvelles offres pour les publier aux freelances ou supprimez-les directement d'un simple clic.
              </p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-3 py-1 text-[10px] font-semibold text-brand-green shrink-0">
            <Sparkles className="w-3 h-3 text-brand-green" />
            Modération Admin Directe
          </span>
        </div>

        {pendingMissions.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground bg-brand-sand/20 dark:bg-muted/20 rounded-2xl border border-dashed border-brand-ink/10 dark:border-border">
            Aucune mission en attente de modération pour le moment.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {pendingMissions.map((m) => (
              <div
                key={m.id}
                className="flex flex-col justify-between rounded-2xl border border-brand-peach/40 bg-brand-sand/30 dark:bg-muted/30 p-4 transition hover:border-brand-ink/20 dark:hover:border-border"
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="rounded-full bg-brand-ink px-2 py-0.5 text-[9px] font-bold text-brand-green">
                      En attente de validation
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      #{m.id}
                    </span>
                  </div>
                  <h4 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground line-clamp-1">
                    {m.title}
                  </h4>
                  <p className="text-[10.5px] text-muted-foreground line-clamp-2 mt-1 leading-relaxed">
                    {m.description}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span>Budget : <strong>{new Intl.NumberFormat("fr-FR").format(m.budget)} FCFA</strong></span>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-brand-ink/8 dark:border-border flex items-center justify-end gap-2">
                  <button
                    type="button"
                    disabled={moderateMutation.isPending}
                    onClick={() =>
                      moderateMutation.mutate({
                        missionId: m.id,
                        decision: "supprimer",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-xl bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-[10px] font-semibold text-red-700 dark:text-red-300 hover:bg-red-500/20 transition cursor-pointer disabled:opacity-50"
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
                    className="inline-flex items-center gap-1 rounded-xl bg-brand-ink px-3.5 py-1.5 text-[10px] font-bold text-white hover:bg-brand-ink/85 dark:hover:bg-black/65 transition cursor-pointer disabled:opacity-50 shadow-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 text-brand-green" /> Approuver & Publier
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
        <div className="md:col-span-2 bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                    Utilisateurs inscrits
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Répartition communauté
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-brand-ink dark:text-foreground tracking-tight">
                  {stats.users.total}
                </span>
                <span className="block text-[10px] text-brand-violet dark:text-violet-300 font-semibold">
                  Total comptes
                </span>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <div className="h-3 w-full bg-brand-sand dark:bg-muted rounded-full overflow-hidden flex gap-0.5 p-0.5">
                <div
                  style={{ width: `${freelancePct}%` }}
                  className="h-full bg-brand-ink rounded-l-full transition-all duration-500"
                  title={`Freelances: ${freelancePct}%`}
                />
                <div
                  style={{ width: `${annonceurPct}%` }}
                  className="h-full bg-brand-green transition-all duration-500"
                  title={`Annonceurs: ${annonceurPct}%`}
                />
                <div
                  style={{ width: `${Math.max(adminPct, 2)}%` }}
                  className="h-full bg-brand-peach dark:bg-brand-peach/10 rounded-r-full transition-all duration-500"
                  title={`Admins: ${adminPct}%`}
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 text-xs">
                <div className="p-2.5 bg-brand-sand/50 dark:bg-muted/50 rounded-xl border border-brand-ink/6 dark:border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-ink" />
                    <span>Freelances</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-brand-ink dark:text-foreground text-sm">
                      {stats.users.freelance}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {freelancePct}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-brand-sand/50 dark:bg-muted/50 rounded-xl border border-brand-ink/6 dark:border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-green" />
                    <span>Annonceurs</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-brand-ink dark:text-foreground text-sm">
                      {stats.users.annonceur}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {annonceurPct}%
                    </span>
                  </div>
                </div>

                <div className="p-2.5 bg-brand-sand/50 dark:bg-muted/50 rounded-xl border border-brand-ink/6 dark:border-border">
                  <div className="flex items-center gap-1.5 text-muted-foreground font-medium text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full bg-brand-peach dark:bg-brand-peach/10" />
                    <span>Admins</span>
                  </div>
                  <div className="mt-1 flex items-baseline justify-between">
                    <span className="font-bold text-brand-ink dark:text-foreground text-sm">
                      {stats.users.admin}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {adminPct}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-brand-ink/6 dark:border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Activité communauté Teranga Work</span>
            <span className="text-brand-violet dark:text-violet-300 font-medium flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" /> Croissance active
            </span>
          </div>
        </div>

        {/* Missions par statut */}
        <div className="md:col-span-2 bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                    Missions publiées
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Statut du pipeline de projets
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="text-2xl font-black text-brand-ink dark:text-foreground tracking-tight">
                  {stats.missions.total}
                </span>
                <span className="block text-[10px] text-muted-foreground">
                  Total publiées
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
              {stats.missions.status_breakdown.map((item) => (
                <div
                  key={item.status}
                  className="p-2.5 rounded-xl border border-brand-ink/6 dark:border-border bg-brand-sand/40 dark:bg-muted/40 flex flex-col justify-between"
                >
                  <span className="text-[10px] font-semibold tracking-tight truncate text-muted-foreground">
                    {item.label}
                  </span>
                  <span className="text-lg font-bold text-brand-ink dark:text-foreground mt-1">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 p-3 rounded-xl bg-brand-sand/50 dark:bg-muted/50 border border-brand-ink/6 dark:border-border flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                Budget moyen par mission :
              </span>
              <span className="text-sm font-bold text-brand-ink dark:text-foreground">
                {formatFCFA(stats.missions.avg_budget)}
              </span>
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-brand-ink/6 dark:border-border flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Pipeline de développement</span>
            <span className="text-brand-violet dark:text-violet-300 font-semibold">Offre active</span>
          </div>
        </div>

        {/* Flux financiers */}
        <div className="md:col-span-2 lg:col-span-3 bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5 hover:shadow-md transition">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                  Flux financiers & paiements
                </h3>
                <p className="text-xs text-muted-foreground">
                  Volume brut, commissions et statuts
                </p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 bg-brand-ink text-white rounded-full">
              {stats.paiements.total_count} transaction(s)
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="p-3.5 bg-brand-sand/50 dark:bg-muted/50 rounded-xl border border-brand-ink/8 dark:border-border">
              <span className="text-[11px] font-medium text-muted-foreground">
                Volume brut total
              </span>
              <p className="text-xl font-black text-brand-ink dark:text-foreground mt-0.5">
                {formatFCFA(stats.paiements.montant_brut)}
              </p>
            </div>

            <div className="p-3.5 bg-brand-peach/15 dark:bg-brand-peach/10 rounded-xl border border-brand-peach/30">
              <span className="text-[11px] font-medium text-brand-ink dark:text-foreground">
                Commission Teranga Work
              </span>
              <p className="text-xl font-black text-brand-ink dark:text-foreground mt-0.5">
                {formatFCFA(stats.paiements.montant_commission)}
              </p>
            </div>

            <div className="p-3.5 bg-brand-ink rounded-xl border border-brand-ink dark:border-border">
              <span className="text-[11px] font-medium text-white/75">
                Montant net freelances
              </span>
              <p className="text-xl font-black text-white mt-0.5">
                {formatFCFA(stats.paiements.montant_net)}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3 rounded-xl border border-brand-ink/6 dark:border-border bg-brand-sand/30 dark:bg-muted/30">
              <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-green" /> Collectes
                d'annonceurs
              </h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-brand-ink dark:text-foreground font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-violet dark:text-violet-300" /> Réussi
                  : {stats.paiements.collecte.reussi}
                </span>
                <span className="flex items-center gap-1 text-brand-ink dark:text-foreground font-medium">
                  <Clock className="w-3.5 h-3.5" /> En attente :{" "}
                  {stats.paiements.collecte.en_attente}
                </span>
                <span className="flex items-center gap-1 text-brand-violet dark:text-violet-300 font-medium">
                  <XCircle className="w-3.5 h-3.5" /> Échoué :{" "}
                  {stats.paiements.collecte.echoue}
                </span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-brand-ink/6 dark:border-border bg-brand-sand/30 dark:bg-muted/30">
              <h4 className="text-xs font-bold text-muted-foreground mb-2 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-brand-ink" />{" "}
                Décaissements vers freelances
              </h4>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1 text-brand-ink dark:text-foreground font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-brand-violet dark:text-violet-300" /> Réussi
                  : {stats.paiements.decaissement.reussi}
                </span>
                <span className="flex items-center gap-1 text-brand-ink dark:text-foreground font-medium">
                  <Clock className="w-3.5 h-3.5" /> En attente :{" "}
                  {stats.paiements.decaissement.en_attente}
                </span>
                <span className="text-muted-foreground font-medium">
                  Non déclenché : {stats.paiements.decaissement.non_declenche}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modération */}
        <div className="md:col-span-1 bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5 flex flex-col justify-between hover:shadow-md transition">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-xl bg-brand-green/10 text-brand-violet dark:text-violet-300">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
                    Modération
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    Signalements reçus
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-brand-green/8 border border-brand-green/20 text-center space-y-1 mb-4">
              <span className="text-3xl font-black text-brand-violet dark:text-violet-300">
                {stats.signalements.pending}
              </span>
              <p className="text-xs font-semibold text-brand-ink dark:text-foreground">
                Signalements en attente
              </p>
              <p className="text-[10px] text-muted-foreground">
                Nécessitent une action administrateur
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-brand-ink/6 dark:border-border text-muted-foreground">
                <span>Signalements résolus</span>
                <span className="font-bold text-brand-ink dark:text-foreground">
                  {stats.signalements.resolved}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-brand-ink/6 dark:border-border text-muted-foreground">
                <span>Signalements rejetés</span>
                <span className="font-bold text-muted-foreground">
                  {stats.signalements.dismissed}
                </span>
              </div>
              <div className="flex justify-between py-1 text-muted-foreground">
                <span>Total historique</span>
                <span className="font-bold text-brand-ink dark:text-foreground">
                  {stats.signalements.total}
                </span>
              </div>
            </div>
          </div>

          <a
            href="/espace/admin/signalements"
            className="mt-4 w-full py-2 bg-brand-green hover:bg-brand-green-hover text-brand-ink dark:text-primary-foreground rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <span>Gérer la modération</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Catalogue insights */}
        <div className="md:col-span-2 lg:col-span-4 bg-white dark:bg-card rounded-[24px] border border-brand-ink/8 dark:border-border p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-4 h-4 text-brand-green" />
            <h3 className="text-sm font-bold text-brand-ink dark:text-foreground">
              Catalogue insights & données surplus
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand-violet dark:text-violet-300" /> Top services
                les plus demandés
              </h4>
              {stats.surplus.top_services.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucun service référencé pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.surplus.top_services.map((svc, idx) => (
                    <div
                      key={svc.id}
                      className="flex items-center justify-between p-2.5 bg-brand-sand/40 dark:bg-muted/40 rounded-xl border border-brand-ink/6 dark:border-border hover:bg-brand-sand/70 dark:hover:bg-muted/70 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-5 h-5 rounded-full bg-brand-ink text-white font-bold text-[10px] flex items-center justify-center">
                          #{idx + 1}
                        </span>
                        <span className="text-xs font-semibold text-brand-ink dark:text-foreground">
                          {svc.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground bg-white dark:bg-card px-2.5 py-0.5 rounded-full border border-brand-ink/10 dark:border-border">
                        {svc.mission_count} mission(s)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-brand-violet dark:text-violet-300" /> Top technologies
                les plus utilisées
              </h4>
              {stats.surplus.top_technologies.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">
                  Aucune technologie associée pour le moment.
                </p>
              ) : (
                <div className="space-y-2">
                  {stats.surplus.top_technologies.map((tech, idx) => (
                    <div
                      key={tech.id}
                      className="flex items-center justify-between p-2.5 bg-brand-sand/40 dark:bg-muted/40 rounded-xl border border-brand-ink/6 dark:border-border hover:bg-brand-sand/70 dark:hover:bg-muted/70 transition"
                    >
                      <div className="flex items-center gap-2.5">
                        {tech.imgUrl ? (
                          <img
                            src={tech.imgUrl}
                            alt={tech.name}
                            className="w-5 h-5 object-contain rounded-xs"
                          />
                        ) : (
                          <span className="w-5 h-5 rounded-full bg-brand-peach/25 dark:bg-brand-peach/10 text-brand-ink dark:text-foreground font-bold text-[10px] flex items-center justify-center">
                            #{idx + 1}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-brand-ink dark:text-foreground">
                          {tech.name}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground bg-white dark:bg-card px-2.5 py-0.5 rounded-full border border-brand-ink/10 dark:border-border">
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
