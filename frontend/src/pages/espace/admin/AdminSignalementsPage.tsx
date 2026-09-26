import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { instance } from '../../../api/axios';
import { toast } from '../../../components/ui/toast';
import { getErrorMessage } from '../../../utils/errorMessage';
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  Loader2,
  Filter,
  X,
  AlertOctagon,
  Trash2,
} from 'lucide-react';
import { getMissions, moderateMission, type Mission } from '../../../api/missionsApi';

// ── Palette commune au produit (annonceur / freelance / admin / onboarding) ─
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

interface Signalement {
  id: number;
  reporter: number;
  reporter_email: string;
  reporter_name: string;
  reported_user?: number | null;
  reported_user_email?: string | null;
  mission?: number | null;
  mission_title?: string | null;
  category: string;
  reason: string;
  status: 'PENDING' | 'RESOLVED' | 'DISMISSED';
  created_at: string;
  updated_at: string;
}

export const AdminSignalementsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'RESOLVED' | 'DISMISSED'>('ALL');
  const [selectedSignalement, setSelectedSignalement] = useState<Signalement | null>(null);

  const { data: signalements = [], isLoading, isError, refetch } = useQuery<Signalement[]>({
    queryKey: ['adminSignalements'],
    queryFn: async () => {
      const response = await instance.get<Signalement[]>('signalements/');
      return response.data;
    },
  });

  const missionsQuery = useQuery<Mission[]>({
    queryKey: ['adminMissionsList'],
    queryFn: getMissions,
    refetchInterval: 10000,
  });

  const moderateMutation = useMutation({
    mutationFn: moderateMission,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminMissionsList'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      queryClient.invalidateQueries({ queryKey: ['missions'] });
      toast.add({
        title: variables.decision === 'approuver' ? 'Mission approuvée' : 'Mission supprimée',
        description: data.detail || `La mission #${variables.missionId} a été traitée.`,
        type: variables.decision === 'approuver' ? 'success' : 'warning',
      });
    },
    onError: (err: any) => {
      toast.add({
        title: 'Erreur de modération',
        description: getErrorMessage(err, 'Impossible de modérer la mission.'),
        type: 'error',
      });
    },
  });

  const pendingMissions = (missionsQuery.data || []).filter(
    (m) => m.status === 'PENDING_MODERATION'
  );

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: 'RESOLVED' | 'DISMISSED' }) => {
      const response = await instance.patch<Signalement>(`signalements/${id}/`, { status });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['adminSignalements'] });
      queryClient.invalidateQueries({ queryKey: ['adminDashboardStats'] });
      toast.add({
        title: 'Statut mis à jour',
        description: `Le signalement a été marqué comme ${variables.status === 'RESOLVED' ? 'résolu' : 'rejeté'}.`,
        type: 'success',
      });
      setSelectedSignalement(null);
    },
    onError: (error) => {
      toast.add({
        title: 'Action impossible',
        description: getErrorMessage(error, 'Impossible de modifier le statut du signalement.'),
        type: 'error',
      });
    },
  });

  const filteredSignalements = signalements.filter((item) => {
    const matchesSearch =
      item.reason.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.reporter_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.reported_user_email && item.reported_user_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (item.mission_title && item.mission_title.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'ALL' || item.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const pendingCount = signalements.filter((s) => s.status === 'PENDING').length;
  const resolvedCount = signalements.filter((s) => s.status === 'RESOLVED').length;
  const dismissedCount = signalements.filter((s) => s.status === 'DISMISSED').length;
  const totalCount = signalements.length || 1;

  const getStatusBadge = (status: Signalement['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#E7B84B]/20 text-[#a87921] border border-[#E7B84B]/40">
            <Clock className="w-3 h-3" /> En attente
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#111118] text-[#E7B84B]">
            <CheckCircle2 className="w-3 h-3" /> Résolu
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#F3EBDD] text-[#111118]/50">
            <XCircle className="w-3 h-3" /> Rejeté
          </span>
        );
    }
  };

  return (
    <div className="space-y-5 pb-8">
      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#111118] text-white p-6 flex items-center gap-3">
        <div className="p-3 bg-[#D95C38]/15 text-[#D95C38] rounded-2xl">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight">Modération & signalements</h1>
          <p className="text-xs text-white/50 mt-0.5">
            Examinez et traitez les réclamations et contenus signalés par les membres.
          </p>
        </div>
      </div>

      {/* ── Grille bento ── */}
      <div className="grid grid-cols-12 gap-5 auto-rows-[minmax(120px,auto)]">
        {/* Vue d'ensemble signalements — tuile encre haute */}
        <div className="col-span-12 md:col-span-4 md:row-span-2 rounded-[28px] bg-[#111118] text-white p-6 flex flex-col justify-between">
          <div>
            <span className="text-xs font-semibold text-white/50">Signalements</span>
            <p className="text-4xl font-extrabold text-white font-heading mt-1">{signalements.length}</p>
            <p className="text-xs text-[#E7B84B] font-semibold mt-1">{pendingCount} en attente de traitement</p>
          </div>

          <div className="space-y-3 mt-4">
            <div className="h-2.5 w-full bg-white/10 rounded-full overflow-hidden flex gap-0.5">
              <div style={{ width: `${(pendingCount / totalCount) * 100}%` }} className="h-full bg-[#E7B84B]" />
              <div style={{ width: `${(resolvedCount / totalCount) * 100}%` }} className="h-full bg-[#D95C38]" />
              <div style={{ width: `${(dismissedCount / totalCount) * 100}%` }} className="h-full bg-white/25" />
            </div>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#E7B84B]" /> En attente</span>
                <span className="font-bold text-white">{pendingCount}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#D95C38]" /> Résolus</span>
                <span className="font-bold text-white">{resolvedCount}</span>
              </div>
              <div className="flex items-center justify-between text-white/70">
                <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-white/25" /> Rejetés</span>
                <span className="font-bold text-white">{dismissedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Missions en attente de validation — tuile large */}
        <div className="col-span-12 md:col-span-8 md:row-span-2 rounded-[28px] border border-[#111118]/8 bg-white p-6 flex flex-col">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#111118]/6 pb-3 mb-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-[#F3EBDD] text-[#D95C38] rounded-xl">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#111118]">Missions en attente de validation</h2>
                <p className="text-[11px] text-[#111118]/45 mt-0.5">
                  Approuvez pour publier ou supprimez pour retirer immédiatement de la plateforme.
                </p>
              </div>
            </div>
            {pendingMissions.length > 0 ? (
              <span className="rounded-full bg-[#E7B84B]/20 text-[#a87921] px-2.5 py-0.5 text-[9.5px] font-bold shrink-0">
                {pendingMissions.length} mission(s) en attente
              </span>
            ) : (
              <span className="rounded-full bg-[#F3EBDD] text-[#111118]/60 px-2.5 py-0.5 text-[9.5px] font-bold shrink-0">
                Aucune mission en attente
              </span>
            )}
          </div>

          {pendingMissions.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-6 text-center text-xs text-[#111118]/35 bg-[#F3EBDD]/40 rounded-2xl border border-dashed border-[#111118]/10">
              Aucune mission en attente de modération pour le moment.
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 overflow-y-auto max-h-[340px] pr-1">
              {pendingMissions.map((m) => (
                <div
                  key={m.id}
                  className="flex flex-col justify-between rounded-2xl border border-[#E7B84B]/35 bg-[#F3EBDD]/40 p-4 transition hover:border-[#E7B84B]/60"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="rounded-full bg-[#111118] px-2 py-0.5 text-[9px] font-bold text-[#E7B84B]">
                        En attente
                      </span>
                      <span className="text-[10px] text-[#111118]/35 font-mono">#{m.id}</span>
                    </div>
                    <h4 className="font-heading text-xs font-bold text-[#111118] line-clamp-1">{m.title}</h4>
                    <p className="text-[10.5px] text-[#111118]/55 line-clamp-2 mt-1 leading-relaxed">
                      {m.description}
                    </p>
                    <div className="mt-2 text-[10px] text-[#111118]/50">
                      Budget : <strong className="text-[#111118]">{new Intl.NumberFormat('fr-FR').format(m.budget)} FCFA</strong>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-[#E7B84B]/25 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      disabled={moderateMutation.isPending}
                      onClick={() => moderateMutation.mutate({ missionId: m.id, decision: 'supprimer' })}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#D95C38]/10 border border-[#D95C38]/30 px-3 py-1.5 text-[10px] font-semibold text-[#c14f2f] hover:bg-[#D95C38]/20 transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="h-3 w-3" /> Supprimer
                    </button>
                    <button
                      type="button"
                      disabled={moderateMutation.isPending}
                      onClick={() => moderateMutation.mutate({ missionId: m.id, decision: 'approuver' })}
                      className="inline-flex items-center gap-1 rounded-xl bg-[#111118] px-3.5 py-1.5 text-[10px] font-bold text-white hover:bg-[#111118]/85 transition cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-3 w-3 text-[#E7B84B]" /> Approuver & publier
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Table des signalements ── */}
      <div className="bg-white rounded-[24px] border border-[#111118]/8 p-5 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#111118]/6">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#111118]/35" />
            <input
              type="text"
              placeholder="Rechercher par membre, motif, mission..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#F3EBDD]/40 border border-[#111118]/10 rounded-xl focus:outline-none focus:border-[#D95C38] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <Filter className="w-3.5 h-3.5 text-[#111118]/35 mr-1" />
            {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-xs ${
                  statusFilter === filterKey
                    ? 'bg-[#111118] text-white'
                    : 'bg-[#F3EBDD]/60 text-[#111118]/60 hover:bg-[#F3EBDD]'
                }`}
              >
                {filterKey === 'ALL'
                  ? 'Tous'
                  : filterKey === 'PENDING'
                  ? 'En attente'
                  : filterKey === 'RESOLVED'
                  ? 'Résolus'
                  : 'Rejetés'}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#D95C38]" />
            <p className="text-xs text-[#111118]/40">Chargement des signalements...</p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-[#D95C38]/10 text-[#c14f2f] rounded-xl text-xs text-center">
            Erreur lors du chargement des signalements.{' '}
            <button onClick={() => refetch()} className="underline font-semibold cursor-pointer">
              Réessayer
            </button>
          </div>
        ) : filteredSignalements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <AlertOctagon className="w-10 h-10 text-[#111118]/20" />
            <p className="text-sm font-semibold text-[#111118]">Aucun signalement trouvé</p>
            <p className="text-xs text-[#111118]/40">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Aucun résultat ne correspond aux filtres.'
                : "Aucun signalement n'a été émis pour le moment."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#111118]/6 bg-[#F3EBDD]/40 text-[#111118]/50 font-semibold text-[10px]">
                  <th className="py-3 px-4 rounded-l-xl">ID</th>
                  <th className="py-3 px-4">Signaleur</th>
                  <th className="py-3 px-4">Catégorie & motif</th>
                  <th className="py-3 px-4">Cible</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#111118]/6">
                {filteredSignalements.map((item) => (
                  <tr key={item.id} className="hover:bg-[#F3EBDD]/30 transition group">
                    <td className="py-3.5 px-4 font-bold text-[#111118]/35">#{item.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-[#111118] text-xs">{item.reporter_name}</span>
                        <span className="text-[10px] text-[#111118]/40">{item.reporter_email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#F3EBDD] text-[#111118]/70 mb-1">
                        {item.category}
                      </span>
                      <p className="text-xs text-[#111118]/55 truncate">{item.reason}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.reported_user_email ? (
                        <span className="text-xs font-medium text-[#111118]">
                          Membre : {item.reported_user_email}
                        </span>
                      ) : item.mission_title ? (
                        <span className="text-xs font-medium text-[#111118]">
                          Mission : {item.mission_title}
                        </span>
                      ) : (
                        <span className="text-xs text-[#111118]/35 italic">Plateforme</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => setSelectedSignalement(item)}
                        className="px-2.5 py-1 rounded-lg bg-[#F3EBDD] hover:bg-[#111118] hover:text-white text-[#111118]/70 text-[11px] font-semibold transition cursor-pointer inline-flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Détails</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modale détail / action de modération ── */}
      {selectedSignalement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#111118]/50 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-[28px] shadow-xl border border-[#111118]/8 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#111118]/6 bg-[#F3EBDD]/40">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#D95C38]" />
                <h3 className="text-sm font-bold text-[#111118]">
                  Signalement #{selectedSignalement.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSignalement(null)}
                className="p-1 rounded-lg text-[#111118]/35 hover:text-[#111118] hover:bg-white transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-[#F3EBDD]/40 rounded-xl border border-[#111118]/6">
                <span className="font-semibold text-[#111118]/60">Statut actuel :</span>
                {getStatusBadge(selectedSignalement.status)}
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#111118]/40 block text-[11px]">Auteur du signalement</span>
                <p className="font-bold text-[#111118]">{selectedSignalement.reporter_name} ({selectedSignalement.reporter_email})</p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#111118]/40 block text-[11px]">Catégorie</span>
                <span className="inline-block px-2.5 py-1 bg-[#D95C38]/10 text-[#c14f2f] rounded-md font-bold">
                  {selectedSignalement.category}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-[#111118]/40 block text-[11px]">Explication / motif</span>
                <div className="p-3 bg-[#F3EBDD]/40 border border-[#111118]/8 rounded-xl text-[#111118] font-medium leading-relaxed">
                  {selectedSignalement.reason}
                </div>
              </div>

              {selectedSignalement.reported_user_email && (
                <div className="space-y-1">
                  <span className="font-semibold text-[#111118]/40 block text-[11px]">Membre mis en cause</span>
                  <p className="font-semibold text-[#111118]">{selectedSignalement.reported_user_email}</p>
                </div>
              )}

              {selectedSignalement.mission_title && (
                <div className="space-y-1">
                  <span className="font-semibold text-[#111118]/40 block text-[11px]">Mission concernée</span>
                  <p className="font-semibold text-[#111118]">{selectedSignalement.mission_title}</p>
                </div>
              )}

              <div className="pt-4 border-t border-[#111118]/6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedSignalement(null)}
                  className="px-4 py-2 text-xs font-medium text-[#111118]/60 hover:bg-[#F3EBDD]/60 rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({ id: selectedSignalement.id, status: 'DISMISSED' })
                    }
                    disabled={updateStatusMutation.isPending || selectedSignalement.status === 'DISMISSED'}
                    className="px-3.5 py-2 text-xs font-semibold bg-[#F3EBDD] hover:bg-[#F3EBDD]/70 text-[#111118]/70 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Rejeter
                  </button>

                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({ id: selectedSignalement.id, status: 'RESOLVED' })
                    }
                    disabled={updateStatusMutation.isPending || selectedSignalement.status === 'RESOLVED'}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#111118] hover:bg-[#111118]/85 text-white rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Marquer résolu</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminSignalementsPage;