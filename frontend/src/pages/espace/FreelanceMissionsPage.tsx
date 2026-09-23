import React, { useDeferredValue, useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { ArrowRight, Clock3, Search, SlidersHorizontal, WalletCards, Sparkles, Brain, CheckCircle2, AlertCircle, Info, RefreshCw, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMissions, type Mission } from '../../api/missionsApi';
import { getMissionsRecommandees, type MatchingMissionResult } from '../../api/matchingApi';

const formatBudget = (value: number) => `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;
const formatDate = (value: string | null) => value ? new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`)) : 'Flexible';

const MissionCardSkeleton = () => (
  <div className="animate-pulse rounded-lg border border-[#ebe8e2] bg-white p-4">
    <div className="mb-4 flex items-center justify-between"><div className="h-4 w-20 rounded bg-[#eeeae4]" /><div className="h-3 w-12 rounded bg-[#f3f0eb]" /></div>
    <div className="mb-2 h-4 w-4/5 rounded bg-[#eeeae4]" /><div className="mb-5 h-9 w-full rounded bg-[#f3f0eb]" />
    <div className="mb-4 flex gap-2"><div className="h-5 w-14 rounded-full bg-[#f3f0eb]" /><div className="h-5 w-16 rounded-full bg-[#f3f0eb]" /></div>
    <div className="flex justify-between border-t border-[#f3f0eb] pt-3"><div className="h-3 w-20 rounded bg-[#eeeae4]" /><div className="h-3 w-14 rounded bg-[#eeeae4]" /></div>
  </div>
);

const FreelanceMissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showJustification, setShowJustification] = useState<number | null>(null);
  const deferredSearch = useDeferredValue(search);

  const missionsQuery = useQuery({ queryKey: ['available-missions'], queryFn: getMissions });

  const matchingMutation = useMutation({
    mutationFn: getMissionsRecommandees,
  });

  const matchingData = matchingMutation.data;
  const isMatchingActive = Boolean(matchingData && matchingData.resultats.length > 0);

  // Filter regular missions — only OPEN missions are visible to freelancers
  const regularMissions = (missionsQuery.data || []).filter((mission) =>
    (!mission.status || mission.status === 'OPEN') &&
    `${mission.title} ${mission.description}`.toLowerCase().includes(deferredSearch.toLowerCase())
  );

  // Process matching missions
  const matchingResults: (MatchingMissionResult & { originalMission?: Mission })[] = (
    matchingData?.resultats || []
  )
    .map((item) => {
      const orig = (missionsQuery.data || []).find((m) => m.id === item.mission_id);
      return { ...item, originalMission: orig };
    })
    .filter((item) =>
      `${item.mission_title} ${item.mission_description}`.toLowerCase().includes(deferredSearch.toLowerCase())
    );

  return (
    <div className="relative mx-auto max-w-[1080px] pb-24">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#f2994a]">
            Opportunités
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[#20252a]">
            Rechercher une mission
          </h1>
          <p className="mt-1 text-[11px] text-neutral-400">
            Trouvez les projets qui correspondent à votre expertise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMatchingActive && (
            <button
              onClick={() => matchingMutation.reset()}
              className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-3 py-1 text-[10px] font-semibold text-neutral-600 hover:bg-neutral-200 transition"
            >
              <RefreshCw className="h-3 w-3" /> Réinitialiser le filtre IA
            </button>
          )}
          <span className="text-[10px] text-neutral-400">
            {isMatchingActive
              ? `${matchingResults.length} mission${matchingResults.length > 1 ? 's' : ''} recommandée${matchingResults.length > 1 ? 's' : ''}`
              : missionsQuery.data
              ? `${regularMissions.length} mission${regularMissions.length > 1 ? 's' : ''} disponible${regularMissions.length > 1 ? 's' : ''}`
              : 'Missions disponibles'}
          </span>
        </div>
      </div>

      {/* Banner if matching is active */}
      {isMatchingActive && (
        <div className="mb-5 flex items-center justify-between rounded-xl border border-indigo-100 bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-blue-50/90 p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-xs font-bold text-indigo-950">
                  Résultats du Matching Intelligent IA
                </p>
                {matchingData.etage_2_reussi ? (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-800">
                    Reclassement IA Actif
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-800">
                    Scoring Déterministe
                  </span>
                )}
              </div>
              <p className="text-[10px] text-indigo-700/80">
                Les missions sont classées selon la compatibilité avec vos compétences et vos services.
              </p>
            </div>
          </div>
          <button
            onClick={() => matchingMutation.mutate()}
            disabled={matchingMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-[10px] font-semibold text-white shadow-sm hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${matchingMutation.isPending ? 'animate-spin' : ''}`} />
            Actualiser
          </button>
        </div>
      )}

      {/* Error state */}
      {matchingMutation.isError && (
        <div className="mb-5 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-[11px] text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>Le service de matching intelligent est temporairement indisponible. Réessayez plus tard.</span>
        </div>
      )}

      {/* Search & Filter Controls */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par titre ou compétence..."
            className="w-full rounded-md border border-[#e7e3dc] bg-white py-2.5 pl-9 pr-3 text-[11px] outline-none focus:border-[#1b4b6b]"
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-[#e7e3dc] bg-white px-4 py-2.5 text-[11px] font-semibold text-neutral-600 hover:border-[#1b4b6b]"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#fff2e8] px-3 py-1.5 text-[10px] font-medium text-[#d8792b]">
          Toutes les missions
        </span>
        <span className="rounded-full border border-[#e7e3dc] bg-white px-3 py-1.5 text-[10px] text-neutral-500">
          Développement
        </span>
        <span className="rounded-full border border-[#e7e3dc] bg-white px-3 py-1.5 text-[10px] text-neutral-500">
          Design
        </span>
        <span className="rounded-full border border-[#e7e3dc] bg-white px-3 py-1.5 text-[10px] text-neutral-500">
          Marketing
        </span>
      </div>

      {/* Loading Skeletons */}
      {(missionsQuery.isLoading || matchingMutation.isPending) && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <MissionCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* Query Error */}
      {missionsQuery.isError && (
        <div className="rounded-lg border border-red-100 bg-red-50 p-8 text-center text-[11px] text-red-600">
          Impossible de charger les missions pour le moment.
        </div>
      )}

      {/* Empty State */}
      {!missionsQuery.isLoading &&
        !matchingMutation.isPending &&
        !missionsQuery.isError &&
        ((isMatchingActive && matchingResults.length === 0) ||
          (!isMatchingActive && regularMissions.length === 0)) && (
          <div className="rounded-lg border border-dashed border-[#d8d3cb] bg-white p-12 text-center">
            <p className="font-heading text-sm font-semibold text-neutral-800">Aucune mission trouvée</p>
            <p className="mt-1 text-[11px] text-neutral-400">Essayez un autre terme de recherche.</p>
          </div>
        )}

      {/* Display Matching Results if Matching Active */}
      {!matchingMutation.isPending && isMatchingActive && matchingResults.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {matchingResults.map((item) => {
            const scorePct = Math.round(item.score * 100);
            const isJustifOpen = showJustification === item.mission_id;

            return (
              <article
                key={item.mission_id}
                className="relative flex flex-col rounded-xl border border-indigo-100 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md"
              >
                {/* Score Header */}
                <div className="mb-3 flex items-center justify-between">
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-2.5 py-1 text-[10px] font-bold text-white shadow-xs">
                    <Sparkles className="h-3 w-3" /> {scorePct}% Pertinence
                  </span>
                  <span className="text-[10px] font-medium text-neutral-400">
                    Client: {item.annonceur_nom}
                  </span>
                </div>

                <h2 className="mb-2 line-clamp-2 font-heading text-[13px] font-semibold leading-snug text-[#24282b]">
                  {item.mission_title}
                </h2>
                <p className="line-clamp-3 text-[11px] leading-relaxed text-neutral-500">
                  {item.mission_description}
                </p>

                {/* Score Details Breakdown */}
                <div className="my-3 rounded-lg border border-slate-100 bg-slate-50/80 p-2 text-[9.5px]">
                  <div className="flex justify-between text-neutral-600 mb-1">
                    <span>Technologies (50%):</span>
                    <span className="font-semibold text-indigo-700">
                      {Math.round(item.score_technologies * 100)}%
                    </span>
                  </div>
                  <div className="flex justify-between text-neutral-600">
                    <span>Service (50%):</span>
                    <span className="font-semibold text-indigo-700">
                      {Math.round(item.score_service * 100)}%
                    </span>
                  </div>
                </div>

                {/* Justification IA button & toggle */}
                {item.justification_ia && (
                  <div className="mb-3">
                    <button
                      type="button"
                      onClick={() => setShowJustification(isJustifOpen ? null : item.mission_id)}
                      className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-600 hover:underline cursor-pointer"
                    >
                      <Info className="h-3 w-3" />
                      {isJustifOpen ? "Masquer l'analyse IA" : "Voir l'analyse de l'IA"}
                    </button>
                    {isJustifOpen && (
                      <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/60 p-2.5 text-[10.5px] leading-relaxed text-indigo-950">
                        <p className="font-semibold mb-1 flex items-center gap-1 text-indigo-900">
                          <Brain className="h-3.5 w-3.5 text-indigo-600" /> Analyse IA :
                        </p>
                        {item.justification_ia}
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-auto pt-3 border-t border-[#f2efeb]">
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-[#f7f5f1] px-2 py-1 text-[9px] text-neutral-500">
                      <Clock3 className="h-2.5 w-2.5" /> {formatDate(item.date_deadline)}
                    </span>
                    {item.mission_technologies.map((tech, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 rounded-full bg-[#f0f4f8] border border-[#d2e2ee] px-2 py-0.5 text-[9px] font-semibold text-[#1b4b6b]"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-[8px] uppercase tracking-wide text-neutral-400">Budget estimé</p>
                      <p className="mt-0.5 text-[11px] font-semibold text-[#1b4b6b]">
                        {formatBudget(item.mission_budget)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/espace/missions/${item.mission_id}`)}
                      className="inline-flex items-center gap-1 rounded-md bg-[#1b4b6b] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#143b55] cursor-pointer transition"
                    >
                      Voir la mission <ArrowRight className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Standard Missions List if Matching Not Active */}
      {!matchingMutation.isPending && !isMatchingActive && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {regularMissions.map((mission: Mission) => (
            <article
              key={mission.id}
              className="flex min-h-[218px] flex-col rounded-lg border border-[#ebe8e2] bg-white p-4 shadow-[0_4px_18px_rgba(31,42,48,0.025)] transition hover:-translate-y-0.5 hover:border-[#cfc7bc] hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-[#eaf7ef] px-2 py-1 text-[9px] font-semibold uppercase text-[#29935a]">
                  Nouveau
                </span>
                <span className="text-[10px] text-neutral-400">#{mission.id}</span>
              </div>
              <h2 className="mb-2 line-clamp-2 font-heading text-[13px] font-semibold leading-snug text-[#24282b]">
                {mission.title}
              </h2>
              <p className="line-clamp-3 text-[11px] leading-relaxed text-neutral-500">
                {mission.description}
              </p>
              <div className="mt-auto pt-4">
                <div className="mb-3 flex flex-wrap gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f7f5f1] px-2 py-1 text-[9px] text-neutral-500">
                    <WalletCards className="h-2.5 w-2.5" /> {mission.operateurMobileMoney}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[#f7f5f1] px-2 py-1 text-[9px] text-neutral-500">
                    <Clock3 className="h-2.5 w-2.5" /> {formatDate(mission.date_deadline)}
                  </span>
                  {mission.technologies_detail?.map((tech) => (
                    <span
                      key={tech.id}
                      className="inline-flex items-center gap-1 rounded-full bg-[#f0f4f8] border border-[#d2e2ee] px-2 py-0.5 text-[9px] font-semibold text-[#1b4b6b]"
                    >
                      {tech.name}
                    </span>
                  ))}
                </div>
                <div className="flex items-end justify-between border-t border-[#f2efeb] pt-3">
                  <div>
                    <p className="text-[8px] uppercase tracking-wide text-neutral-400">Budget estimé</p>
                    <p className="mt-0.5 text-[11px] font-semibold text-[#1b4b6b]">
                      {formatBudget(mission.budget)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/espace/missions/${mission.id}`)}
                    className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#1b4b6b] hover:underline cursor-pointer"
                  >
                    Voir la mission <ArrowRight className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Floating Action Button (FAB) for Intelligent Matching */}
      <div className="fixed bottom-6 right-6 z-40">
  <button
    type="button"
    onClick={() => matchingMutation.mutate()}
    disabled={matchingMutation.isPending}
    className="group relative flex items-center gap-2.5 rounded-2xl bg-[#111118] px-5 py-3.5 text-xs font-semibold text-white shadow-lg shadow-[#111118]/20 transition-colors hover:bg-[#111118]/90 disabled:opacity-70 cursor-pointer"
  >
    {!matchingMutation.isPending && (
      <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-[#D95C38]">
        <span className="absolute inset-0 rounded-full bg-[#D95C38] animate-ping opacity-60" />
      </span>
    )}

    {matchingMutation.isPending ? (
      <Loader2 className="h-4 w-4 animate-spin text-[#E7B84B]" />
    ) : (
      <Brain className="h-4 w-4 text-[#E7B84B]" />
    )}

    <span>
      {matchingMutation.isPending ? 'Recherche des meilleurs profils…' : 'Lancer le matching'}
    </span>
  </button>
</div>
    </div>
  );
};

export default FreelanceMissionsPage;
