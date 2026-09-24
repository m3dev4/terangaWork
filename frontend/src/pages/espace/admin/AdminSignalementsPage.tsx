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
} from 'lucide-react';

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

  // Fetch Signalements from DRF backend
  const { data: signalements = [], isLoading, isError, refetch } = useQuery<Signalement[]>({
    queryKey: ['adminSignalements'],
    queryFn: async () => {
      const response = await instance.get<Signalement[]>('signalements/');
      return response.data;
    },
  });

  // Update Status Mutation
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
        description: `Le signalement a été marqué comme ${variables.status === 'RESOLVED' ? 'Résolu' : 'Rejeté'}.`,
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

  const getStatusBadge = (status: Signalement['status']) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" /> En attente
          </span>
        );
      case 'RESOLVED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Résolu
          </span>
        );
      case 'DISMISSED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-neutral-100 text-neutral-600 border border-neutral-200">
            <XCircle className="w-3 h-3" /> Rejeté
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-[#EFECE6] shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 text-red-600 rounded-xl">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-neutral-900 tracking-tight">Modération & Signalements</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              Examinez et traitez les réclamations et contenus signalés par les membres.
            </p>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="bg-white rounded-2xl border border-[#EFECE6] p-5 shadow-2xs space-y-4">
        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-neutral-100">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              placeholder="Rechercher par membre, motif, mission..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:border-[#1b4b6b] focus:bg-white transition"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
            <Filter className="w-3.5 h-3.5 text-neutral-400 mr-1" />
            {(['ALL', 'PENDING', 'RESOLVED', 'DISMISSED'] as const).map((filterKey) => (
              <button
                key={filterKey}
                onClick={() => setStatusFilter(filterKey)}
                className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer text-xs ${
                  statusFilter === filterKey
                    ? 'bg-[#1b4b6b] text-white'
                    : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
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

        {/* Loading / Error / Empty States */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#1b4b6b]" />
            <p className="text-xs text-neutral-400">Chargement des signalements...</p>
          </div>
        ) : isError ? (
          <div className="p-4 bg-red-50 text-red-600 rounded-xl text-xs text-center">
            Erreur lors du chargement des signalements.{' '}
            <button onClick={() => refetch()} className="underline font-semibold cursor-pointer">
              Réessayer
            </button>
          </div>
        ) : filteredSignalements.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center space-y-2">
            <AlertOctagon className="w-10 h-10 text-neutral-300" />
            <p className="text-sm font-semibold text-neutral-700">Aucun signalement trouvé</p>
            <p className="text-xs text-neutral-400">
              {searchTerm || statusFilter !== 'ALL'
                ? 'Aucun résultat ne correspond aux filtres.'
                : 'Aucun signalement n\'a été émis pour le moment.'}
            </p>
          </div>
        ) : (
          /* Signalements Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-100 bg-neutral-50/70 text-neutral-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4 rounded-l-xl">ID</th>
                  <th className="py-3 px-4">Signaleur</th>
                  <th className="py-3 px-4">Catégorie & Motif</th>
                  <th className="py-3 px-4">Cible</th>
                  <th className="py-3 px-4">Statut</th>
                  <th className="py-3 px-4 text-right rounded-r-xl">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredSignalements.map((item) => (
                  <tr key={item.id} className="hover:bg-neutral-50/60 transition group">
                    <td className="py-3.5 px-4 font-bold text-neutral-400">#{item.id}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-neutral-900 text-xs">{item.reporter_name}</span>
                        <span className="text-[10px] text-neutral-400">{item.reporter_email}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 max-w-xs">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-semibold bg-neutral-100 text-neutral-700 mb-1">
                        {item.category}
                      </span>
                      <p className="text-xs text-neutral-600 truncate">{item.reason}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      {item.reported_user_email ? (
                        <span className="text-xs font-medium text-neutral-800">
                          Membre: {item.reported_user_email}
                        </span>
                      ) : item.mission_title ? (
                        <span className="text-xs font-medium text-neutral-800">
                          Mission: {item.mission_title}
                        </span>
                      ) : (
                        <span className="text-xs text-neutral-400 italic">Plateforme</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">{getStatusBadge(item.status)}</td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedSignalement(item)}
                          className="px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-[#1b4b6b] hover:text-white text-neutral-700 text-[11px] font-semibold transition cursor-pointer flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Détails</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Signalement Detail & Moderation Action Modal */}
      {selectedSignalement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl border border-neutral-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-100 bg-neutral-50/50">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-red-600" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Signalement #{selectedSignalement.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedSignalement(null)}
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="font-semibold text-neutral-600">Statut actuel :</span>
                {getStatusBadge(selectedSignalement.status)}
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-neutral-500 block text-[11px] uppercase">Auteur du signalement</span>
                <p className="font-bold text-neutral-900">{selectedSignalement.reporter_name} ({selectedSignalement.reporter_email})</p>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-neutral-500 block text-[11px] uppercase">Catégorie</span>
                <span className="inline-block px-2.5 py-1 bg-red-50 text-red-700 rounded-md font-bold">
                  {selectedSignalement.category}
                </span>
              </div>

              <div className="space-y-1">
                <span className="font-semibold text-neutral-500 block text-[11px] uppercase">Explication / Motif</span>
                <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl text-neutral-800 font-medium leading-relaxed">
                  {selectedSignalement.reason}
                </div>
              </div>

              {selectedSignalement.reported_user_email && (
                <div className="space-y-1">
                  <span className="font-semibold text-neutral-500 block text-[11px] uppercase">Membre mis en cause</span>
                  <p className="font-semibold text-neutral-800">{selectedSignalement.reported_user_email}</p>
                </div>
              )}

              {selectedSignalement.mission_title && (
                <div className="space-y-1">
                  <span className="font-semibold text-neutral-500 block text-[11px] uppercase">Mission concernée</span>
                  <p className="font-semibold text-neutral-800">{selectedSignalement.mission_title}</p>
                </div>
              )}

              <div className="pt-4 border-t border-neutral-100 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setSelectedSignalement(null)}
                  className="px-4 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-100 rounded-xl transition cursor-pointer"
                >
                  Fermer
                </button>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedSignalement.id,
                        status: 'DISMISSED',
                      })
                    }
                    disabled={updateStatusMutation.isPending || selectedSignalement.status === 'DISMISSED'}
                    className="px-3.5 py-2 text-xs font-semibold bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded-xl transition cursor-pointer disabled:opacity-50"
                  >
                    Rejeter
                  </button>

                  <button
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: selectedSignalement.id,
                        status: 'RESOLVED',
                      })
                    }
                    disabled={updateStatusMutation.isPending || selectedSignalement.status === 'RESOLVED'}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
                  >
                    {updateStatusMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>Marquer Résolu</span>
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
