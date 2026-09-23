import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
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
  Sparkles,
  Brain,
  Info,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { getMissions } from "../../../api/missionsApi";
import { getPropositions, type Proposition } from "../../../api/propositionsApi";
import { instance } from "../../../api/axios";
import { getCandidatsRecommandes, type MatchingCandidatResult } from "../../../api/matchingApi";

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
    bg: "bg-amber-50",
    text: "text-amber-700",
    border: "border-amber-200",
  },
  ACCEPTED: {
    label: "Acceptée",
    bg: "bg-[#eaf7ef]",
    text: "text-[#29935a]",
    border: "border-[#c3e9d4]",
  },
  REJECTED: {
    label: "Refusée",
    bg: "bg-red-50",
    text: "text-red-600",
    border: "border-red-200",
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
        >
          <X className="h-4 w-4" />
        </button>

        {/* header */}
        <div className="border-b border-[#f0ede8] px-6 py-5">
          <div className="flex items-start gap-4">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full bg-neutral-100 ring-2 ring-white">
              {fi?.profile_picture ? (
                <img
                  src={fi.profile_picture}
                  alt={fi.first_name}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[#eaf0f5]">
                  <User className="h-6 w-6 text-[#1b4b6b]" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-heading text-base font-semibold text-[#20252a]">
                  {fi?.first_name} {fi?.last_name}
                </h2>
                <span
                  className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                >
                  {statusMeta.label}
                </span>
                {matchingResult && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                    <Sparkles className="h-3 w-3" /> {Math.round(matchingResult.score * 100)}% Pertinence
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11px] text-neutral-500">{fi?.title}</p>
              {fi?.ville && (
                <p className="mt-1 flex items-center gap-1 text-[10px] text-neutral-400">
                  <MapPin className="h-3 w-3" /> {fi.ville}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* scrollable body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {/* AI Matching Analysis Block if available */}
          {matchingResult && (
            <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/70 to-purple-50/70 p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5 font-heading text-xs font-bold text-indigo-950">
                  <Brain className="h-4 w-4 text-indigo-600" />
                  Score de Matching Intelligent: {Math.round(matchingResult.score * 100)}%
                </div>
              </div>

              {/* Breakdown Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="rounded-lg bg-white/80 p-2 shadow-2xs border border-indigo-100/50">
                  <p className="text-[9px] text-neutral-500">Tech (45%)</p>
                  <p className="text-[11px] font-bold text-indigo-700">
                    {Math.round(matchingResult.score_technologies * 100)}%
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-2 shadow-2xs border border-indigo-100/50">
                  <p className="text-[9px] text-neutral-500">Service (45%)</p>
                  <p className="text-[11px] font-bold text-indigo-700">
                    {Math.round(matchingResult.score_service * 100)}%
                  </p>
                </div>
                <div className="rounded-lg bg-white/80 p-2 shadow-2xs border border-indigo-100/50">
                  <p className="text-[9px] text-neutral-500">Expérience (10%)</p>
                  <p className="text-[11px] font-bold text-indigo-700">
                    {matchingResult.score_experience !== null
                      ? `${Math.round(matchingResult.score_experience * 100)}%`
                      : "N/A"}
                  </p>
                </div>
              </div>

              {matchingResult.justification_ia && (
                <div className="rounded-lg bg-white/90 p-3 text-[11px] leading-relaxed text-indigo-950 border border-indigo-100 shadow-2xs">
                  <p className="font-semibold text-indigo-900 mb-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-amber-500" /> Remarque IA :
                  </p>
                  {matchingResult.justification_ia}
                </div>
              )}
            </div>
          )}

          {/* mission context */}
          <div className="flex items-center gap-2 rounded-lg bg-[#f7f5f1] px-3 py-2.5">
            <Briefcase className="h-3.5 w-3.5 text-[#1b4b6b]" />
            <span className="text-[10px] font-medium text-neutral-500">Mission :</span>
            <span className="truncate text-[10px] font-semibold text-[#20252a]">
              {missionTitle}
            </span>
          </div>

          {/* date livraison */}
          <div className="flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5 text-[#f2994a]" />
            <div>
              <p className="text-[9px] uppercase tracking-wide text-neutral-400">
                Livraison proposée
              </p>
              <p className="text-[11px] font-semibold text-neutral-800">
                {formatDate(proposition.date_livraison)}
              </p>
            </div>
          </div>

          {/* lettre */}
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
              Message de motivation
            </p>
            <div className="rounded-lg border border-[#ece9e2] bg-[#faf9f7] px-4 py-3">
              <p className="whitespace-pre-line text-[12px] leading-7 text-neutral-700">
                {proposition.lettre_motivation}
              </p>
            </div>
          </div>

          {/* technologies */}
          {fi?.technologies && fi.technologies.length > 0 && (
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-neutral-400">
                Services &amp; Technologies
              </p>
              <div className="flex flex-wrap gap-1.5">
                {fi.technologies.map((t) => (
                  <span
                    key={t.id}
                    className="rounded-md bg-[#f0eee8] px-2.5 py-1 text-[10px] font-medium text-neutral-600"
                  >
                    {t.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="border-t border-[#f0ede8] bg-white px-6 py-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => {
              const query = new URLSearchParams({
                mission: String(proposition.mission),
                title: missionTitle,
                user_id: String(fi?.id ?? 0),
                first_name: fi?.first_name ?? '',
                last_name: fi?.last_name ?? '',
                profile_picture: fi?.profile_picture ?? '',
              }).toString();
              navigate(`/espace/messages?${query}`);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[#1b4b6b] bg-white px-3 py-2 text-[11px] font-semibold text-[#1b4b6b] hover:bg-[#f0f4f8] transition-colors cursor-pointer"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Envoyer un message
          </button>

          {proposition.proposition_status === "PENDING" ? (
            <div className="flex gap-2 flex-1 justify-end">
              <button
                disabled={mutation.isPending}
                onClick={() => mutation.mutate({ id: proposition.id, status: "REJECTED" })}
                className="flex items-center justify-center gap-2 rounded-lg border border-[#e7e3dc] px-3 py-2 text-[11px] font-semibold text-neutral-600 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
                onClick={() => mutation.mutate({ id: proposition.id, status: "ACCEPTED" })}
                className="flex items-center justify-center gap-2 rounded-lg bg-[#1b4b6b] px-4 py-2 text-[11px] font-semibold text-white transition-colors hover:bg-[#143b55] disabled:opacity-50"
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
            <span className="text-neutral-500 text-[11px]">
              Candidature <span className={`font-semibold ${statusMeta.text}`}>{statusMeta.label.toLowerCase()}</span>
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
      <div className={`flex items-center gap-4 rounded-xl border ${matchingResult ? 'border-indigo-100 bg-indigo-50/30' : 'border-[#ece9e2] bg-white'} p-4 shadow-[0_2px_8px_rgba(31,42,48,0.04)] transition-all hover:border-[#c5d8e5] hover:shadow-[0_4px_16px_rgba(27,75,107,0.08)]`}>
        {/* avatar */}
        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[#eaf0f5] ring-1 ring-white">
          {fi?.profile_picture ? (
            <img src={fi.profile_picture} alt={fi.first_name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">
              <User className="h-5 w-5 text-[#1b4b6b]" />
            </div>
          )}
        </div>

        {/* info */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-heading text-[12px] font-semibold text-[#20252a]">
              {fi?.first_name} {fi?.last_name}
            </span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[9px] font-semibold ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
            >
              {statusMeta.label}
            </span>
            {matchingResult && (
              <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 px-2 py-0.5 text-[9px] font-bold text-white shadow-xs">
                <Sparkles className="h-2.5 w-2.5" /> {Math.round(matchingResult.score * 100)}% Pertinence
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate text-[10px] text-neutral-500">{fi?.title}</p>

          {fi?.technologies && fi.technologies.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {fi.technologies.slice(0, 4).map((t) => (
                <span key={t.id} className="rounded bg-[#f3f0eb] px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">
                  {t.name}
                </span>
              ))}
              {fi.technologies.length > 4 && (
                <span className="rounded bg-[#f3f0eb] px-1.5 py-0.5 text-[9px] font-medium text-neutral-400">
                  +{fi.technologies.length - 4}
                </span>
              )}
            </div>
          )}
        </div>

        {/* date + cta */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span className="text-[9px] text-neutral-400">{formatDate(proposition.date_livraison)}</span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                const query = new URLSearchParams({
                  mission: String(proposition.mission),
                  title: missionTitle,
                  user_id: String(fi?.id ?? 0),
                  first_name: fi?.first_name ?? '',
                  last_name: fi?.last_name ?? '',
                  profile_picture: fi?.profile_picture ?? '',
                }).toString();
                navigate(`/espace/messages?${query}`);
              }}
              className="inline-flex items-center gap-1 rounded-md border border-[#1b4b6b] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#1b4b6b] hover:bg-[#f0f4f8] transition-colors cursor-pointer"
              title="Envoyer un message"
            >
              <MessageSquare className="h-3 w-3" /> Contacter
            </button>
            <button
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-[#1b4b6b] px-3 py-1.5 text-[10px] font-semibold text-white transition-colors hover:bg-[#143b55] cursor-pointer"
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
  const [matchingResults, setMatchingResults] = useState<MatchingCandidatResult[] | null>(null);

  const matchingMutation = useMutation({
    mutationFn: () => getCandidatsRecommandes(missionId),
    onSuccess: (data) => {
      setMatchingResults(data.resultats);
    },
  });

  const pending = propositions.filter((p) => p.proposition_status === "PENDING").length;

  // Order propositions by matching score if available
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
    <div className="overflow-hidden rounded-xl border border-[#ebe8e2] bg-[#faf9f7]">
      <div className="flex w-full items-center justify-between gap-3 px-5 py-4 border-b border-[#ece9e2]">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex flex-1 min-w-0 items-center gap-3 text-left hover:opacity-80 transition"
        >
          <Briefcase className="h-4 w-4 shrink-0 text-[#1b4b6b]" />
          <span className="truncate font-heading text-[13px] font-semibold text-[#20252a]">
            {missionTitle}
          </span>
          <span className="shrink-0 rounded-full bg-[#1b4b6b]/10 px-2 py-0.5 text-[10px] font-semibold text-[#1b4b6b]">
            {propositions.length} candidature{propositions.length > 1 ? "s" : ""}
          </span>
          {pending > 0 && (
            <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
              {pending} en attente
            </span>
          )}
        </button>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => matchingMutation.mutate()}
            disabled={matchingMutation.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-[10px] font-bold text-white shadow-sm hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 cursor-pointer"
          >
            {matchingMutation.isPending ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Brain className="h-3 w-3" />
            )}
            {matchingResults ? "Re-calculer Matching IA" : "Matching Intelligent"}
          </button>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-neutral-400 hover:text-neutral-600"
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
        <div className="bg-red-50 px-4 py-2 text-[10px] text-red-600 border-b border-red-100 flex items-center gap-1.5">
          <AlertCircle className="h-3.5 w-3.5" />
          <span>Le service de matching est indisponible pour le moment.</span>
        </div>
      )}

      {expanded && (
        <div className="space-y-2.5 bg-white p-4">
          {orderedPropositions.map((p) => {
            const matchRes = matchingResults?.find((r) => r.proposition_id === p.id);
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
  const missionsQuery = useQuery({ queryKey: ["missions"], queryFn: getMissions });
  const propositionsQuery = useQuery({ queryKey: ["propositions"], queryFn: () => getPropositions() });

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
  const totalPending = propositions.filter((p) => p.proposition_status === "PENDING").length;

  return (
    <div className="relative mx-auto max-w-3xl pb-20">
      {/* page header */}
      <div className="mb-6">
        <h1 className="font-heading text-xl font-semibold text-[#20252a]">Candidatures reçues</h1>
        <p className="mt-1 text-[11px] text-neutral-500">
          Consultez et évaluez les profils des freelances ayant postulé à vos annonces avec le Matching Intelligent.
        </p>
        {totalPending > 0 && (
          <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span>
              <strong>{totalPending}</strong> candidature{totalPending > 1 ? "s" : ""} en attente de votre décision
            </span>
          </div>
        )}
      </div>

      {/* loading */}
      {isLoading && (
        <div className="flex items-center justify-center gap-2 py-16 text-[11px] text-neutral-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Chargement des candidatures…
        </div>
      )}

      {/* empty */}
      {!isLoading && propositions.length === 0 && (
        <div className="rounded-xl border border-dashed border-[#ddd9d1] bg-white p-12 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3f0eb]">
            <Briefcase className="h-5 w-5 text-neutral-400" />
          </div>
          <p className="text-[12px] font-medium text-neutral-500">
            Aucune candidature reçue pour le moment.
          </p>
          <p className="mt-1 text-[11px] text-neutral-400">
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

