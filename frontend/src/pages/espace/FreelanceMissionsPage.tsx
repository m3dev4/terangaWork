import React, { useDeferredValue, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  Search,
  SlidersHorizontal,
  WalletCards,
  Brain,
  AlertCircle,
  Info,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMissions, type Mission } from "../../api/missionsApi";
import {
  getMissionsRecommandees,
  type MatchingMissionResult,
} from "../../api/matchingApi";

const formatBudget = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : "Flexible";

// Badge de score réutilisé partout où le matching apparaît (cohérent avec les
// candidatures reçues) : pas de dégradé arc-en-ciel, une seule couleur de marque.
const MatchScoreBadge: React.FC<{ score: number }> = ({ score }) => (
  <span className="inline-flex items-center gap-1 rounded-full bg-[#111118] px-2.5 py-1 text-[10px] font-bold text-white">
    <span className="h-1.5 w-1.5 rounded-full bg-[#E7B84B]" />
    {Math.round(score * 100)}% pertinence
  </span>
);

const MissionCardSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-[#111118]/8 bg-white p-4">
    <div className="mb-4 flex items-center justify-between">
      <div className="h-4 w-20 rounded bg-[#F3EBDD]" />
      <div className="h-3 w-12 rounded bg-[#F3EBDD]/60" />
    </div>
    <div className="mb-2 h-4 w-4/5 rounded bg-[#F3EBDD]" />
    <div className="mb-5 h-9 w-full rounded bg-[#F3EBDD]/60" />
    <div className="mb-4 flex gap-2">
      <div className="h-5 w-14 rounded-full bg-[#F3EBDD]/60" />
      <div className="h-5 w-16 rounded-full bg-[#F3EBDD]/60" />
    </div>
    <div className="flex justify-between border-t border-[#111118]/6 pt-3">
      <div className="h-3 w-20 rounded bg-[#F3EBDD]" />
      <div className="h-3 w-14 rounded bg-[#F3EBDD]" />
    </div>
  </div>
);

const FreelanceMissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [showJustification, setShowJustification] = useState<number | null>(
    null
  );
  const deferredSearch = useDeferredValue(search);

  const missionsQuery = useQuery({
    queryKey: ["available-missions"],
    queryFn: getMissions,
  });

  const matchingMutation = useMutation({
    mutationFn: getMissionsRecommandees,
  });

  const matchingData = matchingMutation.data;
  const isMatchingActive = Boolean(
    matchingData && matchingData.resultats.length > 0
  );

  const regularMissions = (missionsQuery.data || []).filter(
    (mission) =>
      (!mission.status || mission.status === "OPEN") &&
      `${mission.title} ${mission.description}`
        .toLowerCase()
        .includes(deferredSearch.toLowerCase())
  );

  const matchingResultsMap = new Map(
    (matchingData?.resultats || []).map((r) => [r.mission_id, r])
  );

  // Trier les missions quand le matching est actif : recommandées d'abord, puis non recommandées
  const displayedMissions = [...regularMissions].sort((a, b) => {
    if (!isMatchingActive) return 0;
    const hasA = matchingResultsMap.has(a.id);
    const hasB = matchingResultsMap.has(b.id);
    if (hasA && !hasB) return -1;
    if (!hasA && hasB) return 1;
    if (hasA && hasB) {
      return (matchingResultsMap.get(b.id)?.score || 0) - (matchingResultsMap.get(a.id)?.score || 0);
    }
    return 0;
  });

  return (
    <div className="relative mx-auto max-w-[1080px] pb-24">
      {/* ── En-tête ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold text-[#D95C38]">
            Opportunités
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-[#111118]">
            Rechercher une mission
          </h1>
          <p className="mt-1 text-[11px] text-[#111118]/40">
            Trouvez les projets qui correspondent à votre expertise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMatchingActive && (
            <button
              onClick={() => matchingMutation.reset()}
              className="inline-flex items-center gap-1 rounded-full bg-[#F3EBDD] px-3 py-1 text-[10px] font-semibold text-[#111118]/70 hover:bg-[#F3EBDD]/70 transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Réinitialiser le matching
            </button>
          )}
          <span className="text-[10px] text-[#111118]/40">
            {isMatchingActive
              ? `${matchingResultsMap.size} mission${matchingResultsMap.size > 1 ? "s" : ""} sélectionnée${matchingResultsMap.size > 1 ? "s" : ""} par l'IA`
              : missionsQuery.data
                ? `${regularMissions.length} mission${regularMissions.length > 1 ? "s" : ""} disponible${regularMissions.length > 1 ? "s" : ""}`
                : "Missions disponibles"}
          </span>
        </div>
      </div>

      {/* ── Bandeau matching actif ── */}
      {isMatchingActive && (
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-[#111118]/8 bg-[#F3EBDD]/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#111118] text-[#E7B84B]">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-xs font-bold text-[#111118]">
                  Matching IA actif
                </p>
                <span className="rounded-full bg-[#111118] px-2 py-0.5 text-[9px] font-semibold text-[#E7B84B]">
                  Top {matchingResultsMap.size} Pertinents
                </span>
              </div>
              <p className="text-[10px] text-[#111118]/50">
                Les meilleures opportunités sont déverrouillées ci-dessous. Les missions moins pertinentes sont désactivées.
              </p>
            </div>
          </div>
          <button
            onClick={() => matchingMutation.mutate()}
            disabled={matchingMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-[#111118]/85 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`h-3 w-3 ${matchingMutation.isPending ? "animate-spin" : ""}`}
            />
            Actualiser
          </button>
        </div>
      )}

      {/* ── Erreur matching ── */}
      {matchingMutation.isError && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-[#D95C38]/25 bg-[#D95C38]/10 p-4 text-[11px] text-[#c14f2f]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            Le service de matching est temporairement indisponible. Réessayez
            plus tard.
          </span>
        </div>
      )}

      {/* ── Recherche & filtres ── */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#111118]/35" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par titre ou compétence..."
            className="w-full rounded-2xl border border-[#111118]/12 bg-white py-2.5 pl-9 pr-3 text-[11px] outline-none focus:border-[#D95C38]"
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-[#111118]/12 bg-white px-4 py-2.5 text-[11px] font-semibold text-[#111118]/70 hover:border-[#111118]/25"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-[#111118] px-3 py-1.5 text-[10px] font-medium text-white">
          Toutes les missions
        </span>
        <span className="rounded-full border border-[#111118]/12 bg-white px-3 py-1.5 text-[10px] text-[#111118]/60">
          Développement
        </span>
        <span className="rounded-full border border-[#111118]/12 bg-white px-3 py-1.5 text-[10px] text-[#111118]/60">
          Design
        </span>
        <span className="rounded-full border border-[#111118]/12 bg-white px-3 py-1.5 text-[10px] text-[#111118]/60">
          Marketing
        </span>
      </div>

      {/* ── Squelettes de chargement ── */}
      {(missionsQuery.isLoading || matchingMutation.isPending) && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <MissionCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* ── Erreur de requête ── */}
      {missionsQuery.isError && (
        <div className="rounded-2xl border border-[#D95C38]/20 bg-[#D95C38]/5 p-8 text-center text-[11px] text-[#c14f2f]">
          Impossible de charger les missions pour le moment.
        </div>
      )}

      {/* ── État vide ── */}
      {!missionsQuery.isLoading &&
        !matchingMutation.isPending &&
        !missionsQuery.isError &&
        displayedMissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-[#111118]/15 bg-white p-12 text-center">
            <p className="font-heading text-sm font-semibold text-[#111118]">
              Aucune mission trouvée
            </p>
            <p className="mt-1 text-[11px] text-[#111118]/40">
              Essayez un autre terme de recherche.
            </p>
          </div>
        )}

      {/* ── Liste globale des missions avec filtres disabled ── */}
      {!missionsQuery.isLoading &&
        !matchingMutation.isPending &&
        !missionsQuery.isError &&
        displayedMissions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedMissions.map((mission) => {
              const matchItem = matchingResultsMap.get(mission.id);
              const isRecommended = Boolean(matchItem);
              const isDisabled = isMatchingActive && !isRecommended;
              const isJustifOpen = showJustification === mission.id;

              return (
                <article
                  key={mission.id}
                  className={`relative flex min-h-[220px] flex-col rounded-2xl border transition ${
                    isDisabled
                      ? "border-[#111118]/10 bg-gray-50/80 opacity-40 grayscale pointer-events-none select-none"
                      : isMatchingActive && isRecommended
                        ? "border-[#E7B84B] bg-white shadow-md hover:-translate-y-0.5 ring-1 ring-[#E7B84B]/40"
                        : "border-[#111118]/8 bg-white hover:-translate-y-0.5 hover:border-[#111118]/20 hover:shadow-md"
                  } p-4`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    {isMatchingActive ? (
                      isRecommended && matchItem ? (
                        <MatchScoreBadge score={matchItem.score} />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#111118]/10 px-2.5 py-1 text-[10px] font-semibold text-[#111118]/40">
                          Moins pertinent
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-[#F3EBDD] px-2 py-1 text-[9px] font-semibold text-[#111118]/70">
                        Disponible
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-[#111118]/35">
                      #{mission.id}
                    </span>
                  </div>

                  <h2 className="mb-2 line-clamp-2 font-heading text-[13px] font-semibold leading-snug text-[#111118]">
                    {mission.title}
                  </h2>
                  <p className="line-clamp-3 text-[11px] leading-relaxed text-[#111118]/55">
                    {mission.description}
                  </p>

                  {/* Justification ou détails IA pour les cartes recommandées */}
                  {isMatchingActive && isRecommended && matchItem && (
                    <div className="my-2 rounded-xl border border-[#E7B84B]/30 bg-[#F3EBDD]/40 p-2 text-[9.5px]">
                      <div className="flex justify-between text-[#111118]/60 mb-0.5">
                        <span>Technologies (50%) :</span>
                        <span className="font-semibold text-[#111118]">
                          {Math.round(matchItem.score_technologies * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-[#111118]/60">
                        <span>Service (50%) :</span>
                        <span className="font-semibold text-[#111118]">
                          {Math.round(matchItem.score_service * 100)}%
                        </span>
                      </div>
                      {matchItem.justification_ia && (
                        <div className="mt-1.5 border-t border-[#111118]/6 pt-1 text-[9.5px] text-[#111118]/75">
                          <p className="font-semibold text-[#111118]">Avis IA :</p>
                          <p className="line-clamp-2">{matchItem.justification_ia}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-[#111118]/6">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F3EBDD]/60 px-2 py-1 text-[9px] text-[#111118]/55">
                        <Clock3 className="h-2.5 w-2.5" />{" "}
                        {formatDate(mission.date_deadline)}
                      </span>
                      {mission.technologies_detail?.map((tech) => (
                        <span
                          key={tech.id}
                          className="inline-flex items-center gap-1 rounded-full bg-[#F3EBDD] px-2 py-0.5 text-[9px] font-semibold text-[#111118]/70"
                        >
                          {tech.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[8px] text-[#111118]/35">
                          Budget estimé
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-[#111118]">
                          {formatBudget(mission.budget)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => navigate(`/espace/missions/${mission.id}`)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition ${
                          isDisabled
                            ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                            : "bg-[#111118] text-white hover:bg-[#111118]/85 cursor-pointer"
                        }`}
                      >
                        {isDisabled ? (
                          "Moins pertinent"
                        ) : (
                          <>
                            Voir la mission <ArrowRight className="h-3 w-3" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}

      {/* ── Bouton flottant matching ── */}
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
            {matchingMutation.isPending
              ? "Recherche des meilleures missions…"
              : "Lancer le matching"}
          </span>
        </button>
      </div>
    </div>
  );
};

export default FreelanceMissionsPage;
