import React, { useDeferredValue, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  ArrowRight,
  Clock3,
  Search,
  SlidersHorizontal,
  Brain,
  AlertCircle,
  RefreshCw,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getMissions } from "../../api/missionsApi";
import {
  getMissionsRecommandees,
  getMissionsCompatibilite,
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
  <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-2.5 py-1 text-[10px] font-bold text-white">
    <span className="h-1.5 w-1.5 rounded-full bg-brand-peach" />
    {Math.round(score * 100)}% pertinence
  </span>
);

const MissionCardSkeleton = () => (
  <div className="animate-pulse rounded-2xl border border-brand-ink/8 bg-white p-4">
    <div className="mb-4 flex items-center justify-between">
      <div className="h-4 w-20 rounded bg-brand-sand" />
      <div className="h-3 w-12 rounded bg-brand-sand/60" />
    </div>
    <div className="mb-2 h-4 w-4/5 rounded bg-brand-sand" />
    <div className="mb-5 h-9 w-full rounded bg-brand-sand/60" />
    <div className="mb-4 flex gap-2">
      <div className="h-5 w-14 rounded-full bg-brand-sand/60" />
      <div className="h-5 w-16 rounded-full bg-brand-sand/60" />
    </div>
    <div className="flex justify-between border-t border-brand-ink/6 pt-3">
      <div className="h-3 w-20 rounded bg-brand-sand" />
      <div className="h-3 w-14 rounded bg-brand-sand" />
    </div>
  </div>
);

const FreelanceMissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);

  const missionsQuery = useQuery({
    queryKey: ["available-missions"],
    queryFn: getMissions,
  });

  const matchingMutation = useMutation({
    mutationFn: getMissionsRecommandees,
  });

  const compatibilityQuery = useQuery({
    queryKey: ["missions-compatibilite"],
    queryFn: getMissionsCompatibilite,
    refetchOnMount: "always",
    gcTime: 0,
  });
  const isLoading = missionsQuery.isLoading || compatibilityQuery.isLoading || compatibilityQuery.isFetching;
  const canMatch = !isLoading && !compatibilityQuery.isError && !missionsQuery.isError;
  const compatibilityMap = new Map(
    (compatibilityQuery.data?.resultats || []).map((r) => [r.mission_id, r])
  );

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

  // La compatibilité est indépendante de la sélection limitée du LLM.
  const displayedMissions = [...regularMissions].sort((a, b) => {
    const scoreA = compatibilityMap.get(a.id);
    const scoreB = compatibilityMap.get(b.id);
    return Number(Boolean(scoreB?.compatible)) - Number(Boolean(scoreA?.compatible))
      || (scoreB?.score || 0) - (scoreA?.score || 0);
  });

  return (
    <div className="relative mx-auto max-w-[1080px] pb-24">
      {/* ── En-tête ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-1 text-[10px] font-semibold text-brand-violet">
            Opportunités
          </p>
          <h1 className="font-heading text-xl font-semibold tracking-tight text-brand-ink">
            Rechercher une mission
          </h1>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Trouvez les projets qui correspondent à votre expertise.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isMatchingActive && (
            <button
              onClick={() => matchingMutation.reset()}
              className="inline-flex items-center gap-1 rounded-full bg-brand-sand px-3 py-1 text-[10px] font-semibold text-muted-foreground hover:bg-brand-sand/70 transition cursor-pointer"
            >
              <RefreshCw className="h-3 w-3" /> Réinitialiser le matching
            </button>
          )}
          <span className="text-[10px] text-muted-foreground">
            {isMatchingActive
              ? `${matchingResultsMap.size} recommandation${matchingResultsMap.size > 1 ? "s" : ""}`
              : missionsQuery.data
                ? `${regularMissions.length} mission${regularMissions.length > 1 ? "s" : ""} disponible${regularMissions.length > 1 ? "s" : ""}`
                : "Missions disponibles"}
          </span>
        </div>
      </div>

      {/* ── Bandeau matching actif ── */}
      {isMatchingActive && (
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-brand-ink/8 bg-brand-sand/50 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-ink text-brand-green">
              <Brain className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="font-heading text-xs font-bold text-brand-ink">
                  {matchingData?.etage_2_reussi ? "Analyse IA disponible" : "Classement par compatibilité"}
                </p>
                <span className="rounded-full bg-brand-ink px-2 py-0.5 text-[9px] font-semibold text-brand-green">
                  Top {matchingResultsMap.size} Pertinents
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Les recommandations détaillées complètent les scores de compatibilité.
              </p>
            </div>
          </div>
          <button
            onClick={() => matchingMutation.mutate()}
            disabled={matchingMutation.isPending || !canMatch}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-3 py-1.5 text-[10px] font-semibold text-white hover:bg-brand-ink/85 transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw
              className={`h-3 w-3 ${matchingMutation.isPending ? "animate-spin" : ""}`}
            />
            Actualiser
          </button>
        </div>
      )}

      <p className="mb-4 text-[11px] text-muted-foreground">
        Pour accéder à une mission, vous devez maîtriser au moins 50 % des technologies demandées.
        Le score combine les technologies (50 %) et le service (50 %).
      </p>
      {compatibilityQuery.isError && (
        <div role="alert" className="mb-4 rounded-2xl bg-brand-green/10 p-4 text-xs">
          Impossible de vérifier la compatibilité. L’accès aux missions reste désactivé pendant cette indisponibilité.
          <button onClick={() => compatibilityQuery.refetch()} className="ml-2 underline">Réessayer</button>
        </div>
      )}
      {matchingMutation.isSuccess && matchingData?.resultats.length === 0 && (
        <p role="status" className="mb-4 text-xs text-muted-foreground">
          Aucune mission ne répond actuellement au minimum de compatibilité requis.
        </p>
      )}

      {/* ── Erreur matching ── */}
      {matchingMutation.isError && (
        <div className="mb-5 flex items-center gap-2 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-4 text-[11px] text-brand-violet">
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
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher par titre ou compétence..."
            className="w-full rounded-2xl border border-brand-ink/12 bg-white py-2.5 pl-9 pr-3 text-[11px] outline-none focus:border-brand-green"
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-ink/12 bg-white px-4 py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-brand-ink/25"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" /> Filtres
        </button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-brand-ink px-3 py-1.5 text-[10px] font-medium text-white">
          Toutes les missions
        </span>
        <span className="rounded-full border border-brand-ink/12 bg-white px-3 py-1.5 text-[10px] text-muted-foreground">
          Développement
        </span>
        <span className="rounded-full border border-brand-ink/12 bg-white px-3 py-1.5 text-[10px] text-muted-foreground">
          Design
        </span>
        <span className="rounded-full border border-brand-ink/12 bg-white px-3 py-1.5 text-[10px] text-muted-foreground">
          Marketing
        </span>
      </div>

      {/* ── Squelettes de chargement ── */}
      {isLoading && (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <MissionCardSkeleton key={index} />
          ))}
        </div>
      )}

      {/* ── Erreur de requête ── */}
      {missionsQuery.isError && (
        <div className="rounded-2xl border border-brand-green/20 bg-brand-green/5 p-8 text-center text-[11px] text-brand-violet">
          Impossible de charger les missions pour le moment.
        </div>
      )}

      {/* ── État vide ── */}
      {!isLoading &&
        !missionsQuery.isError &&
        displayedMissions.length === 0 && (
          <div className="rounded-2xl border border-dashed border-brand-ink/15 bg-white p-12 text-center">
            <p className="font-heading text-sm font-semibold text-brand-ink">
              Aucune mission trouvée
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Essayez un autre terme de recherche.
            </p>
          </div>
        )}

      {/* ── Liste globale des missions avec filtres disabled ── */}
      {!isLoading &&
        !missionsQuery.isError &&
        displayedMissions.length > 0 && (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {displayedMissions.map((mission) => {
              const matchItem = compatibilityQuery.isError ? undefined : compatibilityMap.get(mission.id);
              const recommendation = matchingResultsMap.get(mission.id);
              const isRecommended = Boolean(recommendation && matchItem?.compatible);
              const isDisabled = !matchItem?.compatible;

              return (
                <article
                  key={mission.id}
                  className={`relative flex min-h-[220px] flex-col rounded-2xl border transition ${
                    isDisabled
                      ? "border-brand-ink/10 bg-brand-canvas/80 opacity-60 grayscale"
                      : isMatchingActive && isRecommended
                        ? "border-brand-peach bg-white shadow-md hover:-translate-y-0.5 ring-1 ring-brand-peach/40"
                        : "border-brand-ink/8 bg-white hover:-translate-y-0.5 hover:border-brand-ink/20 hover:shadow-md"
                  } p-4`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    {matchItem ? (
                      matchItem.compatible ? (
                        <MatchScoreBadge score={matchItem.score} />
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink/10 px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                          Moins pertinent
                        </span>
                      )
                    ) : (
                      <span className="rounded-full bg-brand-sand px-2 py-1 text-[9px] font-semibold text-muted-foreground">
                        Compatibilité indisponible
                      </span>
                    )}
                    <span className="text-[10px] font-medium text-muted-foreground">
                      #{mission.id}
                    </span>
                  </div>

                  <h2 className="mb-2 line-clamp-2 font-heading text-[13px] font-semibold leading-snug text-brand-ink">
                    {mission.title}
                  </h2>
                  <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
                    {mission.description}
                  </p>

                  {/* Justification ou détails IA pour les cartes recommandées */}
                  {matchItem && (
                    <div className="my-2 rounded-xl border border-brand-peach/30 bg-brand-sand/40 p-2 text-[9.5px]">
                      <div className="flex justify-between text-muted-foreground mb-0.5">
                        <span>Technologies (50%) :</span>
                        <span className="font-semibold text-brand-ink">
                          {Math.round(matchItem.score_technologies * 100)}%
                        </span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Service (50%) :</span>
                        <span className="font-semibold text-brand-ink">
                          {Math.round(matchItem.score_service * 100)}%
                        </span>
                      </div>
                      {isRecommended && recommendation?.justification_ia && (
                        <div className="mt-1.5 border-t border-brand-ink/6 pt-1 text-[9.5px] text-brand-ink/75">
                          <p className="font-semibold text-brand-ink">Avis IA :</p>
                          <p className="line-clamp-2">{recommendation.justification_ia}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="mt-auto pt-3 border-t border-brand-ink/6">
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      <span className="inline-flex items-center gap-1 rounded-full bg-brand-sand/60 px-2 py-1 text-[9px] text-muted-foreground">
                        <Clock3 className="h-2.5 w-2.5" />{" "}
                        {formatDate(mission.date_deadline)}
                      </span>
                      {mission.technologies_detail?.map((tech) => (
                        <span
                          key={tech.id}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-sand px-2 py-0.5 text-[9px] font-semibold text-muted-foreground"
                        >
                          {tech.name}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-end justify-between">
                      <div>
                        <p className="text-[8px] text-muted-foreground">
                          Budget estimé
                        </p>
                        <p className="mt-0.5 text-[11px] font-semibold text-brand-ink">
                          {formatBudget(mission.budget)}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={isDisabled}
                        onClick={() => navigate(`/espace/missions/${mission.id}`)}
                        className={`inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-[10px] font-semibold transition ${
                          isDisabled
                            ? "bg-gray-200 text-muted-foreground cursor-not-allowed"
                            : "bg-brand-ink text-white hover:bg-brand-ink/85 cursor-pointer"
                        }`}
                      >
                        {isDisabled ? (
                          matchItem ? "Moins pertinent" : "Indisponible"
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
          disabled={matchingMutation.isPending || !canMatch}
          className="group relative flex items-center gap-2.5 rounded-2xl bg-brand-ink px-5 py-3.5 text-xs font-semibold text-white shadow-lg shadow-brand-ink/20 transition-colors hover:bg-brand-ink/90 disabled:opacity-70 cursor-pointer"
        >
          {!matchingMutation.isPending && (
            <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-brand-green">
              <span className="absolute inset-0 rounded-full bg-brand-green animate-ping opacity-60" />
            </span>
          )}

          {matchingMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-brand-green" />
          ) : (
            <Brain className="h-4 w-4 text-brand-green" />
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
