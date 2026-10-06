import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMediaUrl } from "../../../utils/getMediaUrl";
import {
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Loader2,
  MapPin,
  MessageSquare,
  ThumbsDown,
  ThumbsUp,
  User,
  X,
  Brain,
  AlertCircle,
} from "lucide-react";
import { getMissions } from "../../../api/missionsApi";
import {
  getPropositions,
  type Proposition,
} from "../../../api/propositionsApi";
import { instance } from "../../../api/axios";
import {
  getCandidatsRecommandes,
  type MatchingCandidatResult,
} from "../../../api/matchingApi";

// ── Palette commune au dashboard (annonceur / freelance) ────────────────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

// ── helpers ────────────────────────────────────────────────────────────────
const formatDate = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(`${v}T00:00:00`))
    : "—";

const STATUS_META = {
  PENDING: {
    label: "En attente",
    bg: "bg-brand-peach/20 dark:bg-brand-peach/10",
    text: "text-brand-ink dark:text-foreground",
    border: "border-brand-peach/40",
  },
  ACCEPTED: {
    label: "Acceptée",
    bg: "bg-brand-sand dark:bg-muted",
    text: "text-muted-foreground",
    border: "border-brand-ink/10 dark:border-border",
  },
  REJECTED: {
    label: "Refusée",
    bg: "bg-brand-green/10",
    text: "text-brand-violet dark:text-violet-300",
    border: "border-brand-green/25",
  },
} as const;

// ── update status ──────────────────────────────────────────────────────────
const updatePropositionStatus = async ({
  id,
  status,
}: {
  id: number;
  status: "ACCEPTED" | "REJECTED";
}) => {
  const res = await instance.patch(`propositions/${id}/`, {
    proposition_status: status,
  });
  return res.data;
};

// ── Score de matching (badge discret, cohérent avec la marque) ─────────────
function MatchScoreBadge({
  score,
  size = "sm",
}: {
  score: number;
  size?: "sm" | "md";
}) {
  const pct = Math.round(score * 100);
  const isSmall = size === "sm";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full bg-brand-ink font-bold text-white ${
        isSmall ? "px-2 py-0.5 text-[9px]" : "px-2.5 py-1 text-[10px]"
      }`}
    >
      <span
        className={`rounded-full bg-brand-peach ${isSmall ? "h-1.5 w-1.5" : "h-2 w-2"}`}
      />
      {pct}% pertinence
    </span>
  );
}

// ── Candidate Detail Modal ─────────────────────────────────────────────────
function CandidateModal({
  proposition,
  missionTitle,
  matchingResult,
  onClose,
}: {
  proposition: Proposition;
  missionTitle: string;
  matchingResult?: MatchingCandidatResult;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fi = proposition.freelance_info;
  const statusMeta = STATUS_META[proposition.proposition_status];

  const mutation = useMutation({
    mutationFn: updatePropositionStatus,
    onSuccess: () => {
      qc.invalidateQueries();
      onClose();
    },
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 dark:bg-black/65 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[28px] bg-white dark:bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-brand-sand dark:hover:bg-muted hover:text-brand-ink dark:hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* header */}
        <div className="border-b border-brand-ink/6 dark:border-border px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-2xl bg-brand-sand dark:bg-muted ring-2 ring-white dark:ring-card">
              {fi?.profile_picture ? (
                <img
                  src={getMediaUrl(fi.profile_picture)}
                  alt={fi.first_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <User className="h-6 w-6 text-brand-violet dark:text-violet-300" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-base font-semibold text-brand-ink dark:text-foreground">
                  {fi?.first_name} {fi?.last_name}
                </h2>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                >
                  {statusMeta.label}
                </span>
                {matchingResult && (
                  <MatchScoreBadge score={matchingResult.score} />
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {fi?.title}
              </p>
              {fi?.ville && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {fi.ville}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* Analyse de matching */}
          {matchingResult && (
            <div className="rounded-2xl border border-brand-ink/8 dark:border-border bg-brand-sand/50 dark:bg-muted/50 p-4">
              <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-heading text-xs font-bold text-brand-ink dark:text-foreground">
                  <Brain className="h-4 w-4 text-brand-violet dark:text-violet-300" />
                  Score de matching : {Math.round(matchingResult.score * 100)}%
                </div>
              </div>

              <div className="mb-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-white dark:bg-card p-2 border border-brand-ink/6 dark:border-border">
                  <p className="text-[9px] text-muted-foreground">Tech (45%)</p>
                  <p className="text-[11px] font-bold text-brand-ink dark:text-foreground">
                    {Math.round(matchingResult.score_technologies * 100)}%
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-card p-2 border border-brand-ink/6 dark:border-border">
                  <p className="text-[9px] text-muted-foreground">Service (45%)</p>
                  <p className="text-[11px] font-bold text-brand-ink dark:text-foreground">
                    {Math.round(matchingResult.score_service * 100)}%
                  </p>
                </div>
                <div className="rounded-xl bg-white dark:bg-card p-2 border border-brand-ink/6 dark:border-border">
                  <p className="text-[9px] text-muted-foreground">
                    Expérience (10%)
                  </p>
                  <p className="text-[11px] font-bold text-brand-ink dark:text-foreground">
                    {matchingResult.score_experience !== null
                      ? `${Math.round(matchingResult.score_experience * 100)}%`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {matchingResult.justification_ia && (
                <div className="rounded-xl bg-white dark:bg-card p-3 text-[11px] leading-relaxed text-brand-ink/75 dark:text-foreground/75 border border-brand-ink/6 dark:border-border">
                  <p className="mb-1 font-semibold text-brand-ink dark:text-foreground">
                    Remarque :
                  </p>
                  {matchingResult.justification_ia}
                </div>
              )}
            </div>
          )}

          {/* mission context */}
          <div className="flex items-center gap-2 rounded-xl bg-brand-sand/60 dark:bg-muted/60 px-3 py-2.5">
            <Briefcase className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" />
            <span className="text-[10px] font-medium text-muted-foreground">
              Mission :
            </span>
            <span className="truncate text-[10px] font-semibold text-brand-ink dark:text-foreground">
              {missionTitle}
            </span>
          </div>

          {/* date livraison */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" />
            <div>
              <p className="text-[9px] text-muted-foreground">Livraison proposée</p>
              <p className="text-[11px] font-semibold text-brand-ink dark:text-foreground">
                {formatDate(proposition.date_livraison)}
              </p>
            </div>
          </div>

          {/* lettre */}
          <div>
            <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
              Message de motivation
            </p>
            <div className="rounded-xl border border-brand-ink/8 dark:border-border bg-brand-sand/40 dark:bg-muted/40 px-4 py-3">
              <p className="whitespace-pre-line text-[12px] leading-7 text-brand-ink/75 dark:text-foreground/75">
                {proposition.lettre_motivation}
              </p>
            </div>
          </div>

          {/* technologies */}
          {fi?.technologies && fi.technologies.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold text-muted-foreground">
                Services &amp; technologies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fi.technologies.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-lg bg-brand-sand dark:bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="flex items-center justify-between gap-2 border-t border-brand-ink/6 dark:border-border bg-white dark:bg-card px-6 py-4">
          <button
            type="button"
            onClick={() => {
              const query = new URLSearchParams({
                mission: String(proposition.mission),
                title: missionTitle,
                user_id: String(fi?.id ?? 0),
                first_name: fi?.first_name ?? "",
                last_name: fi?.last_name ?? "",
                profile_picture: fi?.profile_picture ?? "",
              }).toString();
              navigate(`/espace/messages?${query}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/15 dark:border-border bg-white dark:bg-card px-3 py-2 text-[11px] font-semibold text-brand-ink dark:text-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Envoyer un message
          </button>

          {proposition.proposition_status === "PENDING" ? (
            <div className="flex flex-1 justify-end gap-2">
              <button
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ id: proposition.id, status: "REJECTED" })
                }
                className="flex items-center justify-center gap-2 rounded-xl border border-brand-ink/12 dark:border-border px-3 py-2 text-[11px] font-semibold text-muted-foreground transition-colors hover:border-brand-green/40 hover:bg-brand-green/10 hover:text-brand-violet dark:hover:text-violet-300 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ThumbsDown className="h-3.5 w-3.5" />
                )}
                Refuser
              </button>
              <button
                disabled={mutation.isPending}
                onClick={() =>
                  mutation.mutate({ id: proposition.id, status: "ACCEPTED" })
                }
                className="flex items-center justify-center gap-2 rounded-xl bg-brand-ink px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-brand-ink/85 dark:hover:bg-black/65 disabled:opacity-50"
              >
                {mutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ThumbsUp className="h-3.5 w-3.5" />
                )}
                Accepter candidature
              </button>
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground">
              Candidature{" "}
              <span className={`font-semibold ${statusMeta.text}`}>
                {statusMeta.label.toLowerCase()}
              </span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Candidate Card ──────────────────────────────────────────────────────────
function CandidateCard({
  proposition,
  missionTitle,
  matchingResult,
}: {
  proposition: Proposition;
  missionTitle: string;
  matchingResult?: MatchingCandidatResult;
}) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const fi = proposition.freelance_info;
  const statusMeta = STATUS_META[proposition.proposition_status];

  return (
    <>
      <div
        className={`flex items-center gap-4 rounded-2xl border p-4 transition-all ${
          matchingResult
            ? "border-brand-peach/40 bg-brand-sand/40 dark:bg-muted/40"
            : "border-brand-ink/8 dark:border-border bg-white dark:bg-card"
        } hover:border-brand-ink/15 dark:hover:border-border`}
      >
        {/* avatar */}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-brand-sand dark:bg-muted ring-1 ring-white dark:ring-card">
          {fi?.profile_picture ? (
            <img
              src={getMediaUrl(fi.profile_picture)}
              alt={fi.first_name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-brand-violet dark:text-violet-300" />
            </div>
          )}
        </div>

        {/* info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-[12px] font-semibold text-brand-ink dark:text-foreground">
              {fi?.first_name} {fi?.last_name}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
            >
              {statusMeta.label}
            </span>
            {matchingResult && <MatchScoreBadge score={matchingResult.score} />}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
            {fi?.title}
          </p>

          {fi?.technologies && fi.technologies.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {fi.technologies.slice(0, 4).map((t) => (
                <span
                  key={t.id}
                  className="rounded bg-brand-sand dark:bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground"
                >
                  {t.name}
                </span>
              ))}
              {fi.technologies.length > 4 && (
                <span className="rounded bg-brand-sand dark:bg-muted px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground">
                  +{fi.technologies.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* date + cta */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[9px] text-muted-foreground">
            {formatDate(proposition.date_livraison)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const query = new URLSearchParams({
                  mission: String(proposition.mission),
                  title: missionTitle,
                  user_id: String(fi?.id ?? 0),
                  first_name: fi?.first_name ?? "",
                  last_name: fi?.last_name ?? "",
                  profile_picture: fi?.profile_picture ?? "",
                }).toString();
                navigate(`/espace/messages?${query}`);
              }}
              className="inline-flex items-center gap-1 rounded-lg border border-brand-ink/15 dark:border-border bg-white dark:bg-card px-2.5 py-1.5 text-[10px] font-semibold text-brand-ink dark:text-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 transition-colors cursor-pointer"
              title="Envoyer un message"
            >
              <MessageSquare className="h-3 w-3" /> Contacter
            </button>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 rounded-lg bg-brand-ink px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-brand-ink/85 dark:hover:bg-black/65 cursor-pointer"
            >
              Candidature <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </div>

      {open && (
        <CandidateModal
          proposition={proposition}
          missionTitle={missionTitle}
          matchingResult={matchingResult}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

// ── Mission Group ───────────────────────────────────────────────────────────
function MissionGroup({
  missionId,
  missionTitle,
  propositions,
}: {
  missionId: number;
  missionTitle: string;
  propositions: Proposition[];
}) {
  const [expanded, setExpanded] = useState(true);
  const [matchingResults, setMatchingResults] = useState<
    MatchingCandidatResult[] | null
  >(null);

  const matchingMutation = useMutation({
    mutationFn: () => getCandidatsRecommandes(missionId),
    onSuccess: (data) => {
      setMatchingResults(data.resultats);
    },
  });

  const pending = propositions.filter(
    (p) => p.proposition_status === "PENDING"
  ).length;

  const orderedPropositions = React.useMemo(() => {
    if (!matchingResults) return propositions;
    const scoreMap = new Map(matchingResults.map((r) => [r.proposition_id, r]));
    return [...propositions].sort((a, b) => {
      const scoreA = scoreMap.get(a.id)?.score ?? -1;
      const scoreB = scoreMap.get(b.id)?.score ?? -1;
      return scoreB - scoreA;
    });
  }, [propositions, matchingResults]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-brand-ink/8 dark:border-border bg-brand-sand/30 dark:bg-muted/30">
      <div className="flex w-full items-center justify-between gap-3 border-b border-brand-ink/6 dark:border-border px-5 py-4">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex min-w-0 flex-1 items-center gap-3 text-left transition hover:opacity-80"
        >
          <Briefcase className="h-4 w-4 shrink-0 text-brand-violet dark:text-violet-300" />
          <span className="truncate font-heading text-[13px] font-semibold text-brand-ink dark:text-foreground">
            {missionTitle}
          </span>
          <span className="shrink-0 rounded-full bg-white dark:bg-card px-2 py-0.5 text-[10px] font-semibold text-muted-foreground border border-brand-ink/10 dark:border-border">
            {propositions.length} candidature
            {propositions.length > 1 ? "s" : ""}
          </span>
          {pending > 0 && (
            <span className="shrink-0 rounded-full bg-brand-peach/25 dark:bg-brand-peach/10 px-2 py-0.5 text-[10px] font-semibold text-brand-ink dark:text-foreground">
              {pending} en attente
            </span>
          )}
        </button>

        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => matchingMutation.mutate()}
            disabled={matchingMutation.isPending}
            className="relative inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-brand-ink/85 dark:hover:bg-black/65 disabled:opacity-60 cursor-pointer"
          >
            {!matchingMutation.isPending && !matchingResults && (
              <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-brand-green">
                <span className="absolute inset-0 rounded-full bg-brand-green animate-ping opacity-60" />
              </span>
            )}
            {matchingMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin text-brand-green" />
            ) : (
              <Brain className="h-3 w-3 text-brand-green" />
            )}
            {matchingResults ? "Recalculer le matching" : "Lancer le matching"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-muted-foreground hover:text-muted-foreground"
          >
            {expanded ? (
              <ChevronDown className="h-4 w-4 shrink-0" />
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
        </div>
      </div>

      {matchingMutation.isError && (
        <div className="flex items-center gap-1.5 border-b border-brand-green/20 bg-brand-green/10 px-4 py-2 text-[10px] text-brand-violet dark:text-violet-300">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Le service de matching est indisponible pour le moment.</span>
        </div>
      )}

      {expanded && (
        <div className="space-y-2.5 bg-white dark:bg-card p-4">
          {orderedPropositions.map((p) => {
            const matchRes = matchingResults?.find(
              (r) => r.proposition_id === p.id
            );
            return (
              <CandidateCard
                key={p.id}
                proposition={p}
                missionTitle={missionTitle}
                matchingResult={matchRes}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Page ────────────────────────────────────────────────────────────────────
const CandidaturesRecuesPage: React.FC = () => {
  const missionsQuery = useQuery({
    queryKey: ["missions"],
    queryFn: getMissions,
  });
  const propositionsQuery = useQuery({
    queryKey: ["propositions"],
    queryFn: () => getPropositions(),
  });

  const missions = missionsQuery.data ?? [];
  const propositions = propositionsQuery.data ?? [];

  const grouped = React.useMemo(() => {
    const map = new Map<number, Proposition[]>();
    for (const p of propositions) {
      if (!map.has(p.mission)) map.set(p.mission, []);
      map.get(p.mission)!.push(p);
    }
    return map;
  }, [propositions]);

  const isLoading = missionsQuery.isLoading || propositionsQuery.isLoading;
  const totalPending = propositions.filter(
    (p) => p.proposition_status === "PENDING"
  ).length;

  return (
    <div className="relative mx-auto max-w-3xl pb-20">
      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 sm:p-7 mb-6">
        <h1 className="font-heading text-xl font-semibold text-white">
          Candidatures reçues
        </h1>
        <p className="mt-1 text-[11px] text-white/75 max-w-md">
          Consultez et évaluez les profils des freelances ayant postulé à vos
          annonces, avec l'appui du matching.
        </p>
        {totalPending > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/10 px-3 py-2 text-[11px] text-white/80">
            <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />
            <span>
              <strong className="text-white">{totalPending}</strong> candidature
              {totalPending > 1 ? "s" : ""} en attente de votre décision
            </span>
          </div>
        )}
      </div>

      {/* loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-brand-violet dark:text-violet-300" /> Chargement
          des candidatures…
        </div>
      )}

      {/* empty */}
      {!isLoading && propositions.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-brand-ink/15 dark:border-border bg-white dark:bg-card p-12 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sand dark:bg-muted">
            <Briefcase className="h-5 w-5 text-brand-violet dark:text-violet-300" />
          </div>
          <p className="text-[12px] font-medium text-muted-foreground">
            Aucune candidature reçue pour le moment.
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground">
            Les freelances qui postuleront à vos missions apparaîtront ici.
          </p>
        </div>
      )}

      {/* grouped */}
      {!isLoading && propositions.length > 0 && (
        <div className="space-y-4">
          {Array.from(grouped.entries()).map(([missionId, props]) => {
            const mission = missions.find((m) => m.id === missionId);
            return (
              <MissionGroup
                key={missionId}
                missionId={missionId}
                missionTitle={mission?.title ?? `Mission #${missionId}`}
                propositions={props}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CandidaturesRecuesPage;
