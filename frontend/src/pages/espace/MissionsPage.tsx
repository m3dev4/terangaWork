import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, ChevronLeft, ChevronRight, Edit3, Loader2, MoreVertical, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { deleteMission, getMissions, type Mission } from '../../api/missionsApi';
import { getErrorMessage } from '../../utils/errorMessage';

const formatBudget = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'Sans échéance';

const MissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [error, setError] = useState('');
  const missionsQuery = useQuery({ queryKey: ['missions'], queryFn: getMissions });
  const deleteMutation = useMutation({ mutationFn: deleteMission, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['missions'] }), onError: (mutationError) => setError(getErrorMessage(mutationError, 'Suppression impossible.')) });

  const missions = (missionsQuery.data || []).filter((mission) => `${mission.title} ${mission.description}`.toLowerCase().includes(search.toLowerCase()));
  const remove = (mission: Mission) => {
    if (window.confirm(`Supprimer « ${mission.title} » ?`)) {
      setOpenMenu(null);
      deleteMutation.mutate(mission.id);
    }
  };

  return (
    <div className="mx-auto max-w-[940px] pb-8">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f2994a]">Espace annonceur</p>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[#20252a]">Mes annonces</h1>
          <p className="mt-1 text-[11px] text-neutral-400">Gérez la visibilité et les détails de vos missions publiées.</p>
        </div>
        <button type="button" onClick={() => navigate('/espace/publier-mission')} className="inline-flex items-center justify-center gap-2 rounded-md bg-[#f2994a] px-4 py-2.5 text-[11px] font-semibold text-white shadow-sm hover:bg-[#df853a]"><Plus className="h-3.5 w-3.5" /> Publier une nouvelle annonce</button>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Rechercher une annonce..." className="w-full rounded-md border border-[#e7e3dc] bg-white py-2.5 pl-9 pr-3 text-[11px] outline-none focus:border-[#1b4b6b]" />
        </label>
        <button type="button" className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e7e3dc] bg-white px-4 py-2.5 text-[11px] font-semibold text-neutral-600 hover:border-[#1b4b6b]">Filtres</button>
      </div>

      {error && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-[11px] text-red-600">{error}</p>}
      {missionsQuery.isLoading && <div className="rounded-lg border border-[#ebe8e2] bg-white p-10 text-center text-[11px] text-neutral-400"><Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin" />Chargement de vos annonces...</div>}
      {missionsQuery.isError && <div className="rounded-lg border border-red-100 bg-red-50 p-8 text-center text-[11px] text-red-600">Impossible de charger vos annonces.</div>}
      {!missionsQuery.isLoading && !missionsQuery.isError && missions.length === 0 && <div className="rounded-lg border border-dashed border-[#d8d3cb] bg-white p-12 text-center"><p className="font-heading text-sm font-semibold text-neutral-800">Aucune annonce trouvée</p><p className="mt-1 text-[11px] text-neutral-400">Publiez votre première mission pour commencer.</p></div>}

      <div className="space-y-3">
        {missions.map((mission) => (
          <article key={mission.id} className="relative rounded-lg border border-[#ebe8e2] bg-white px-4 py-4 shadow-[0_4px_18px_rgba(31,42,48,0.025)] transition hover:border-[#d7d1c8] sm:px-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2"><h2 className="truncate font-heading text-[13px] font-semibold text-[#24282b]">{mission.title}</h2>
                  {(!mission.status || mission.status === 'OPEN') && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#eaf7ef] px-2 py-0.5 text-[9px] font-semibold text-[#29935a]"><CheckCircle2 className="h-2.5 w-2.5" /> ACTIVE</span>
                  )}
                  {mission.status === 'IN_PROGRESS' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-semibold text-blue-700 border border-blue-200">EN COURS</span>
                  )}
                  {mission.status === 'DELIVERED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[9px] font-semibold text-amber-700 border border-amber-200">LIVRÉE</span>
                  )}
                  {mission.status === 'COMPLETED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-bold text-emerald-800 border border-emerald-300">TERMINÉE</span>
                  )}
                  {mission.status === 'CLOSED' && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2 py-0.5 text-[9px] font-semibold text-neutral-500">FERMÉE</span>
                  )}
                </div>
                <p className="line-clamp-1 text-[11px] text-neutral-500">{mission.description}</p>
                {mission.technologies_detail && mission.technologies_detail.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {mission.technologies_detail.map((tech) => (
                      <span key={tech.id} className="inline-flex items-center gap-1 rounded-full bg-[#f0f4f8] border border-[#d2e2ee] px-2 py-0.5 text-[9.5px] font-semibold text-[#1b4b6b]">
                        {tech.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative shrink-0">
                <button type="button" onClick={() => setOpenMenu(openMenu === mission.id ? null : mission.id)} className="rounded p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700" title="Actions"><MoreVertical className="h-4 w-4" /></button>
                {openMenu === mission.id && <div className="absolute right-0 top-8 z-10 w-32 rounded-md border border-[#ebe8e2] bg-white p-1 shadow-lg"><button type="button" onClick={() => navigate(`/espace/mes-annonces/${mission.id}/modifier`)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-neutral-600 hover:bg-neutral-50"><Edit3 className="h-3 w-3" /> Modifier</button><button type="button" onClick={() => remove(mission)} className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-[10px] text-red-600 hover:bg-red-50"><Trash2 className="h-3 w-3" /> Supprimer</button></div>}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-[#f2efeb] pt-3 text-[10px] text-neutral-500"><span><strong className="mr-1 uppercase tracking-wide text-[8px] text-neutral-400">Budget</strong><b className="font-semibold text-neutral-800">{formatBudget(mission.budget)}</b></span><span><strong className="mr-1 uppercase tracking-wide text-[8px] text-neutral-400">Échéance</strong><b className="font-semibold text-neutral-800">{formatDate(mission.date_deadline)}</b></span><span><strong className="mr-1 uppercase tracking-wide text-[8px] text-neutral-400">Candidatures</strong><b className="font-semibold text-neutral-800">--</b></span><button type="button" onClick={() => navigate(`/espace/mes-annonces/${mission.id}`)} className="ml-auto text-[10px] font-semibold text-[#1b4b6b] hover:underline">Voir les détails →</button></div>
          </article>
        ))}
      </div>

      {missions.length > 0 && <div className="mt-5 flex items-center justify-between text-[10px] text-neutral-400"><span>Affichage de 1 à {missions.length} annonce{missions.length > 1 ? 's' : ''}</span><div className="flex items-center gap-1"><button type="button" className="rounded border border-[#e7e3dc] p-1.5" title="Page précédente"><ChevronLeft className="h-3 w-3" /></button><span className="rounded bg-[#1b4b6b] px-2 py-1.5 font-semibold text-white">1</span><button type="button" className="rounded border border-[#e7e3dc] p-1.5" title="Page suivante"><ChevronRight className="h-3 w-3" /></button></div></div>}
    </div>
  );
};

export default MissionsPage;