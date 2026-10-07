import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Edit3,
  Loader2,
  MoreVertical,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  deleteMission,
  getMissions,
  type Mission,
} from "../../api/missionsApi";
import { getErrorMessage } from "../../utils/errorMessage";

const formatBudget = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : "Sans échéance";

const MissionsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);
  const [error, setError] = useState("");
  const missionsQuery = useQuery({
    queryKey: ["missions"],
    queryFn: getMissions,
  });
  const deleteMutation = useMutation({
    mutationFn: deleteMission,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missions"] }),
    onError: (mutationError) =>
      setError(getErrorMessage(mutationError, "Suppression impossible.")),
  });

  const missions = (missionsQuery.data || []).filter((mission) =>
    `${mission.title} ${mission.description}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );
  const remove = (mission: Mission) => {
    if (window.confirm(`Supprimer « ${mission.title} » ?`)) {
      setOpenMenu(null);
      deleteMutation.mutate(mission.id);
    }
  };

  return (
    <div className="mx-auto max-w-[940px] pb-12">
      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 sm:p-7 mb-5">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-semibold text-brand-green">
              Espace annonceur
            </p>
            <h1 className="font-heading text-xl font-semibold tracking-tight text-white">
              Mes annonces
            </h1>
            <p className="mt-1 text-[11px] text-white/75">
              Gérez la visibilité et les détails de vos missions publiées.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/espace/publier-mission")}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-green px-4 py-2.5 text-[11px] font-semibold text-brand-ink dark:text-primary-foreground transition-colors hover:bg-brand-green-hover shrink-0"
          >
            <Plus className="h-3.5 w-3.5" /> Publier une nouvelle annonce
          </button>
        </div>
      </div>

      {/* ── Recherche & filtres ── */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Rechercher une annonce..."
            className="w-full rounded-2xl border border-brand-ink/12 dark:border-border bg-white dark:bg-card py-2.5 pl-9 pr-3 text-[11px] outline-none focus:border-brand-green"
          />
        </label>
        <button
          type="button"
          className="inline-flex items-center justify-center gap-2 rounded-2xl border border-brand-ink/12 dark:border-border bg-white dark:bg-card px-4 py-2.5 text-[11px] font-semibold text-muted-foreground hover:border-brand-ink/25 dark:hover:border-border"
        >
          Filtres
        </button>
      </div>

      {error && (
        <p className="mb-3 rounded-2xl bg-brand-green/10 px-3 py-2 text-[11px] text-brand-violet dark:text-violet-300">
          {error}
        </p>
      )}
      {missionsQuery.isLoading && (
        <div className="rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-10 text-center text-[11px] text-muted-foreground">
          <Loader2 className="mx-auto mb-2 h-5 w-5 animate-spin text-brand-violet dark:text-violet-300" />
          Chargement de vos annonces...
        </div>
      )}
      {missionsQuery.isError && (
        <div className="rounded-[24px] border border-brand-green/20 bg-brand-green/5 p-8 text-center text-[11px] text-brand-violet dark:text-violet-300">
          Impossible de charger vos annonces.
        </div>
      )}
      {!missionsQuery.isLoading &&
        !missionsQuery.isError &&
        missions.length === 0 && (
          <div className="rounded-[28px] border border-dashed border-brand-ink/15 dark:border-border bg-white dark:bg-card p-12 text-center">
            <p className="font-heading text-sm font-semibold text-brand-ink dark:text-foreground">
              Aucune annonce trouvée
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Publiez votre première mission pour commencer.
            </p>
          </div>
        )}

      {/* ── Liste des annonces ── */}
      <div className="space-y-3">
        {missions.map((mission) => (
          <article
            key={mission.id}
            className="relative rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card px-4 py-4 transition hover:border-brand-ink/15 dark:hover:border-border sm:px-5"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <h2 className="truncate font-heading text-[13px] font-semibold text-brand-ink dark:text-foreground">
                    {mission.title}
                  </h2>
                  {mission.status === "PENDING_MODERATION" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach/20 dark:bg-brand-peach/10 border border-brand-peach/40 px-2 py-0.5 text-[9px] font-semibold text-brand-ink dark:text-foreground">
                      En modération
                    </span>
                  )}
                  {(!mission.status || mission.status === "OPEN") && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-sand dark:bg-muted px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      <CheckCircle2 className="h-2.5 w-2.5 text-brand-violet dark:text-violet-300" />{" "}
                      Active
                    </span>
                  )}
                  {mission.status === "IN_PROGRESS" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach/20 dark:bg-brand-peach/10 px-2 py-0.5 text-[9px] font-semibold text-brand-ink dark:text-foreground border border-brand-peach/40">
                      En cours
                    </span>
                  )}
                  {mission.status === "DELIVERED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-peach/30 dark:bg-brand-peach/10 px-2 py-0.5 text-[9px] font-semibold text-brand-ink dark:text-foreground border border-brand-peach/50">
                      Livrée
                    </span>
                  )}
                  {mission.status === "COMPLETED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink px-2 py-0.5 text-[9px] font-bold text-white">
                      Terminée
                    </span>
                  )}
                  {mission.status === "CLOSED" && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand-ink/8 dark:bg-foreground/8 px-2 py-0.5 text-[9px] font-semibold text-muted-foreground">
                      Fermée
                    </span>
                  )}
                </div>
                <p className="line-clamp-1 text-[11px] text-muted-foreground">
                  {mission.description}
                </p>
                {mission.technologies_detail &&
                  mission.technologies_detail.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {mission.technologies_detail.map((tech) => (
                        <span
                          key={tech.id}
                          className="inline-flex items-center gap-1 rounded-full bg-brand-sand dark:bg-muted border border-brand-ink/8 dark:border-border px-2 py-0.5 text-[9.5px] font-semibold text-muted-foreground"
                        >
                          {tech.name}
                        </span>
                      ))}
                    </div>
                  )}
              </div>
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() =>
                    setOpenMenu(openMenu === mission.id ? null : mission.id)
                  }
                  className="rounded-lg p-1 text-muted-foreground hover:bg-brand-sand dark:hover:bg-muted hover:text-brand-ink dark:hover:text-foreground"
                  title="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {openMenu === mission.id && (
                  <div className="absolute right-0 top-8 z-10 w-32 rounded-xl border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() =>
                        navigate(`/espace/mes-annonces/${mission.id}/modifier`)
                      }
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
                    >
                      <Edit3 className="h-3 w-3" /> Modifier
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(mission)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[10px] text-brand-violet dark:text-violet-300 hover:bg-brand-green/10"
                    >
                      <Trash2 className="h-3 w-3" /> Supprimer
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-t border-brand-ink/6 dark:border-border pt-3 text-[10px] text-muted-foreground">
              <span>
                <strong className="mr-1 text-[8px] text-muted-foreground">
                  Budget
                </strong>
                <b className="font-semibold text-brand-ink dark:text-foreground">
                  {formatBudget(mission.budget)}
                </b>
              </span>
              <span>
                <strong className="mr-1 text-[8px] text-muted-foreground">
                  Échéance
                </strong>
                <b className="font-semibold text-brand-ink dark:text-foreground">
                  {formatDate(mission.date_deadline)}
                </b>
              </span>
              <span>
                <strong className="mr-1 text-[8px] text-muted-foreground">
                  Candidatures
                </strong>
                <b className="font-semibold text-brand-ink dark:text-foreground">
                  --
                </b>
              </span>
              <button
                type="button"
                onClick={() => navigate(`/espace/mes-annonces/${mission.id}`)}
                className="ml-auto text-[10px] font-semibold text-brand-violet dark:text-violet-300 hover:underline"
              >
                Voir les détails
              </button>
            </div>
          </article>
        ))}
      </div>

      {/* ── Pagination ── */}
      {missions.length > 0 && (
        <div className="mt-5 flex items-center justify-between text-[10px] text-muted-foreground">
          <span>
            Affichage de 1 à {missions.length} annonce
            {missions.length > 1 ? "s" : ""}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              className="rounded-lg border border-brand-ink/12 dark:border-border p-1.5 hover:bg-brand-sand/60 dark:hover:bg-muted/60"
              title="Page précédente"
            >
              <ChevronLeft className="h-3 w-3" />
            </button>
            <span className="rounded-lg bg-brand-ink px-2 py-1.5 font-semibold text-white">
              1
            </span>
            <button
              type="button"
              className="rounded-lg border border-brand-ink/12 dark:border-border p-1.5 hover:bg-brand-sand/60 dark:hover:bg-muted/60"
              title="Page suivante"
            >
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MissionsPage;
