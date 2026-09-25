import React, { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getMediaUrl } from "../../../utils/getMediaUrl";
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Plus,
  CheckCircle2,
  MessageSquare,
  Briefcase,
  User,
  Loader2,
  X,
  Clock,
  ShieldCheck,
} from "lucide-react";
import {
  getPropositions,
  type Proposition,
} from "../../../api/propositionsApi";
import {
  getProjectMeetings,
  createProjectMeeting,
  getMeetingToken,
  type LiveKitTokenResponse,
} from "../../../api/meetingsApi";
import getCurrentUser from "../../../utils/getUser";

// ── Palette commune au dashboard (annonceur / freelance) ────────────────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

// ── Helpers ────────────────────────────────────────────────────────────────
const formatBudget = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;

const MONTHS_FR = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const DAYS_FR = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

// Les seuls états réels d'une mission — on ne représente que ça, rien de plus.
const STATUS_STEPS = [
  { key: "IN_PROGRESS", label: "En développement" },
  { key: "DELIVERED", label: "Livrée" },
  { key: "COMPLETED", label: "Validée & terminée" },
] as const;

const ProjectWorkspacePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeCall, setActiveCall] = useState<LiveKitTokenResponse | null>(
    null
  );
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  const handleJoinCall = async (meetingId: number) => {
    try {
      setIsJoiningCall(true);
      const res = await getMeetingToken(meetingId);
      setActiveCall(res);
    } catch (err) {
      console.error("Erreur de génération du jeton LiveKit:", err);
    } finally {
      setIsJoiningCall(false);
    }
  };

  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: getCurrentUser,
  });

  const { data: propositions = [], isLoading: isPropositionsLoading } =
    useQuery({
      queryKey: ["propositions-workspace"],
      queryFn: () => getPropositions(),
    });

  const acceptedProjects = useMemo(() => {
    return propositions.filter(
      (p: Proposition) => p.proposition_status === "ACCEPTED"
    );
  }, [propositions]);

  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(
    null
  );

  const activeProject = useMemo(() => {
    if (acceptedProjects.length === 0) return null;
    if (selectedProjectId) {
      return (
        acceptedProjects.find((p) => p.id === selectedProjectId) ||
        acceptedProjects[0]
      );
    }
    return acceptedProjects[0];
  }, [acceptedProjects, selectedProjectId]);

  const { data: meetings = [] } = useQuery({
    queryKey: ["project-meetings", activeProject?.mission],
    queryFn: () => getProjectMeetings(activeProject?.mission),
    enabled: !!activeProject?.mission,
    refetchInterval: 4000,
  });

  const createMeetingMutation = useMutation({
    mutationFn: createProjectMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project-meetings"] });
      setNewMeetTitle("");
      setIsMeetModalOpen(false);
    },
  });

  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<"month" | "week">("month");

  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [newMeetTitle, setNewMeetTitle] = useState("");
  const [newMeetDate, setNewMeetDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [newMeetTime, setNewMeetTime] = useState("14:00");

  const handleAddMeet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMeetTitle.trim() || !activeProject) return;

    const room = `jefly-livekit-${Math.random().toString(36).substring(2, 9)}`;
    const livekitLink = `https://meet.livekit.io/${room}`;

    createMeetingMutation.mutate({
      mission: activeProject.mission,
      title: newMeetTitle.trim(),
      date: newMeetDate,
      time: newMeetTime,
      room_name: room,
      link: livekitLink,
    });
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7;

  const calendarDays = useMemo(() => {
    const days: Array<{
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
    }> = [];

    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthDays - i,
        dateStr: `${year}-${String(month).padStart(2, "0")}-${String(prevMonthDays - i).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ dayNumber: d, dateStr, isCurrentMonth: true });
    }

    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let r = 1; r <= remaining; r++) {
      days.push({
        dayNumber: r,
        dateStr: `${year}-${String(month + 2).padStart(2, "0")}-${String(r).padStart(2, "0")}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month, firstDayIndex, daysInMonth]);

  const startDateStr = activeProject?.created_at
    ? new Date(activeProject.created_at).toISOString().split("T")[0]
    : null;
  const endDateStr = activeProject?.date_livraison || null;

  const timelinePercent = useMemo(() => {
    if (!startDateStr || !endDateStr) return 45;
    const start = new Date(startDateStr).getTime();
    const end = new Date(endDateStr).getTime();
    const now = new Date().getTime();
    if (now >= end) return 100;
    if (now <= start) return 10;
    return Math.round(((now - start) / (end - start)) * 100);
  }, [startDateStr, endDateStr]);

  // Prochaine réunion réelle (pas de donnée inventée) : la plus proche dans le futur.
  const nextMeeting = useMemo(() => {
    const now = new Date();
    return (
      meetings
        .filter((m) => new Date(`${m.date}T${m.time}`) >= now)
        .sort(
          (a, b) =>
            new Date(`${a.date}T${a.time}`).getTime() -
            new Date(`${b.date}T${b.time}`).getTime()
        )[0] || null
    );
  }, [meetings]);

  // Dernière réunion passée, pour donner un vrai signal d'activité récente.
  const lastMeeting = useMemo(() => {
    const now = new Date();
    return (
      meetings
        .filter((m) => new Date(`${m.date}T${m.time}`) < now)
        .sort(
          (a, b) =>
            new Date(`${b.date}T${b.time}`).getTime() -
            new Date(`${a.date}T${a.time}`).getTime()
        )[0] || null
    );
  }, [meetings]);

  if (isPropositionsLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#D95C38]" />
        <p className="text-xs text-[#111118]/50">
          Chargement de votre espace projet...
        </p>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="mx-auto max-w-[1080px] py-16 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[#F3EBDD] text-[#D95C38]">
          <Briefcase className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-base font-bold text-[#111118]">
          Aucun projet en cours de développement
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[11.5px] text-[#111118]/50 leading-relaxed">
          L'espace projet s'active automatiquement dès qu'une candidature est
          acceptée par l'annonceur.
        </p>
      </div>
    );
  }

  const freelance = activeProject.freelance_info;
  const freelanceName = freelance
    ? `${freelance.first_name} ${freelance.last_name}`
    : "Freelance";

  const missionStatus = activeProject.mission_status || "IN_PROGRESS";
  const isClosed = missionStatus === "CLOSED";
  // Index de l'étape atteinte dans le stepper honnête (CLOSED hérite de la position de COMPLETED)
  const currentStepIndex = STATUS_STEPS.findIndex(
    (s) => s.key === (isClosed ? "COMPLETED" : missionStatus)
  );

  return (
    <div className="mx-auto max-w-[1140px] pb-16 space-y-5">
      {/* ── En-tête projet ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-[#111118] text-white p-6 sm:p-7">
        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {(!activeProject.mission_status ||
                activeProject.mission_status === "IN_PROGRESS") && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-[#E7B84B]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#E7B84B] animate-pulse" />{" "}
                  En cours de développement
                </span>
              )}
              {activeProject.mission_status === "DELIVERED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-white/80 border border-white/15">
                  <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />{" "}
                  Livrée — en attente de validation
                </span>
              )}
              {activeProject.mission_status === "COMPLETED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E7B84B]/20 px-2.5 py-0.5 text-[9.5px] font-bold text-[#E7B84B] border border-[#E7B84B]/30">
                  <CheckCircle2 className="h-3 w-3" /> Mission terminée
                </span>
              )}
              {activeProject.mission_status === "CLOSED" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-0.5 text-[9.5px] font-semibold text-white/50">
                  Mission clôturée
                </span>
              )}
              {acceptedProjects.length > 1 && (
                <select
                  value={activeProject.id}
                  onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                  className="text-[11px] font-medium border border-white/15 rounded-lg px-2 py-0.5 bg-white/10 text-white outline-none"
                >
                  {acceptedProjects.map((p) => (
                    <option key={p.id} value={p.id} className="text-[#111118]">
                      {p.mission_title}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <h1 className="font-heading text-lg sm:text-xl font-bold text-white truncate">
              {activeProject.mission_title}
            </h1>
          </div>

          {user?.role === "annonceur" && (
            <button
              onClick={() =>
                (window.location.href = "/espace/paiements-effectues")
              }
              className="inline-flex items-center gap-1.5 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] px-4 py-2 text-[11px] font-bold text-white transition-colors shrink-0"
            >
              <ShieldCheck className="h-4 w-4 text-[#E7B84B]" /> Validation
              livraison & paiement
            </button>
          )}
        </div>

        <div className="relative z-10 mt-5 flex flex-wrap items-center gap-4 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-white/10 text-[#E7B84B] flex items-center justify-center font-bold text-xs border border-white/10">
              A
            </div>
            <div className="text-left">
              <p className="text-[10px] text-white/40 font-medium leading-none">
                Annonceur
              </p>
              <p className="text-[11px] font-semibold text-white leading-tight">
                Client
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl overflow-hidden bg-white/10 border border-white/10 flex items-center justify-center shrink-0">
              {freelance?.profile_picture ? (
                <img
                  src={getMediaUrl(freelance.profile_picture)}
                  alt={freelanceName}
                  className="h-full w-full object-cover"
                />
              ) : (
                <User className="h-4 w-4 text-white/60" />
              )}
            </div>
            <div className="text-left">
              <p className="text-[10px] text-white/40 font-medium leading-none">
                Freelance
              </p>
              <p className="text-[11px] font-semibold text-white leading-tight truncate max-w-[120px]">
                {freelanceName}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-white/10" />

          <button
            type="button"
            onClick={() => {
              const query = new URLSearchParams({
                mission: String(activeProject.mission),
                title: activeProject.mission_title || "Projet",
                user_id: String(freelance?.id ?? 0),
                first_name: freelance?.first_name ?? "",
                last_name: freelance?.last_name ?? "",
                profile_picture: freelance?.profile_picture ?? "",
              }).toString();
              navigate(`/espace/messages?${query}`);
            }}
            className="ml-auto inline-flex items-center gap-1.5 rounded-xl bg-[#E7B84B] hover:bg-[#dfae3f] px-3.5 py-2 text-[10.5px] font-bold text-[#111118] transition-colors"
            title="Ouvrir la messagerie pour ce projet"
          >
            <MessageSquare className="h-3.5 w-3.5" /> Discuter
          </button>
        </div>
      </div>

      {/* ── Contenu principal ── */}
      <div className="grid gap-5 lg:grid-cols-3">
        {/* Colonne calendrier & statut (2/3) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Calendrier */}
          <div className="rounded-[28px] border border-[#111118]/8 bg-white p-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-heading text-sm font-bold text-[#111118]">
                  {MONTHS_FR[month]} {year}
                </h3>
                <div className="flex items-center gap-1 rounded-xl border border-[#111118]/10 p-0.5 bg-[#F3EBDD]/60">
                  <button
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="p-1 rounded-lg hover:bg-white text-[#111118]/60 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="p-1 rounded-lg hover:bg-white text-[#111118]/60 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-xl bg-[#F3EBDD]/60 p-1 text-[10px] font-semibold text-[#111118]/60">
                <button
                  onClick={() => setCalendarView("month")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    calendarView === "month"
                      ? "bg-white text-[#111118] shadow-2xs"
                      : "hover:text-[#111118]"
                  }`}
                >
                  Mois
                </button>
                <button
                  onClick={() => setCalendarView("week")}
                  className={`px-2.5 py-1 rounded-lg transition-all ${
                    calendarView === "week"
                      ? "bg-white text-[#111118] shadow-2xs"
                      : "hover:text-[#111118]"
                  }`}
                >
                  Semaine
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-semibold text-[#111118]/35 uppercase tracking-wider">
              {DAYS_FR.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                const isStart = startDateStr === cell.dateStr;
                const isEnd = endDateStr === cell.dateStr;
                const dayMeets = meetings.filter(
                  (m) => m.date === cell.dateStr
                );

                return (
                  <div
                    key={idx}
                    className={`min-h-[64px] rounded-xl border p-1.5 transition-all flex flex-col justify-between ${
                      cell.isCurrentMonth
                        ? "border-[#111118]/6 bg-white text-[#111118]"
                        : "border-transparent bg-[#F3EBDD]/30 text-[#111118]/25"
                    } ${isStart ? "ring-2 ring-[#111118]" : ""} ${isEnd ? "ring-2 ring-[#D95C38]" : ""}`}
                  >
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[10px] font-bold ${cell.isCurrentMonth ? "text-[#111118]/70" : "text-[#111118]/25"}`}
                      >
                        {cell.dayNumber}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {isStart && (
                        <div
                          className="rounded bg-[#111118] px-1 py-0.5 text-[8px] font-bold text-white truncate"
                          title="Début de la collaboration"
                        >
                          Début
                        </div>
                      )}
                      {isEnd && (
                        <div
                          className="rounded bg-[#D95C38] px-1 py-0.5 text-[8px] font-bold text-white truncate"
                          title="Livraison prévue"
                        >
                          Livraison
                        </div>
                      )}
                      {dayMeets.map((m) => (
                        <a
                          key={m.id}
                          href={m.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded bg-[#F3EBDD] border border-[#E7B84B]/40 px-1 py-0.5 text-[8px] font-semibold text-[#111118]/80 truncate flex items-center gap-0.5 hover:bg-[#E7B84B]/30 transition-colors"
                          title={`Visio: ${m.title} à ${m.time}`}
                        >
                          <Video className="h-2 w-2 shrink-0 text-[#D95C38]" />{" "}
                          {m.time.substring(0, 5)}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Statut réel de la mission — un seul indicateur honnête, plus de fausses sous-étapes */}
          <div className="rounded-[24px] border border-[#111118]/8 bg-white p-6">
            <div className="mb-5 flex items-center justify-between border-b border-[#111118]/6 pb-2.5">
              <h4 className="font-heading text-xs font-bold text-[#111118] flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-[#D95C38]" /> Statut
                de la mission
              </h4>
            </div>

            {isClosed ? (
              <div className="flex items-center gap-2 text-[11px] text-[#111118]/50">
                <span className="h-2 w-2 rounded-full bg-[#111118]/30" /> Cette
                mission a été clôturée.
              </div>
            ) : (
              <div className="flex items-center">
                {STATUS_STEPS.map((step, i) => {
                  const done = i < currentStepIndex;
                  const active = i === currentStepIndex;
                  return (
                    <React.Fragment key={step.key}>
                      <div className="flex flex-col items-center gap-1.5 text-center w-24">
                        <div
                          className={`flex h-7 w-7 items-center justify-center rounded-full border-2 text-[10px] font-bold shrink-0 ${
                            done
                              ? "bg-[#111118] border-[#111118] text-white"
                              : active
                                ? "bg-[#E7B84B]/20 border-[#E7B84B] text-[#c9922e]"
                                : "bg-white border-[#111118]/15 text-[#111118]/30"
                          }`}
                        >
                          {done ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            i + 1
                          )}
                        </div>
                        <span
                          className={`text-[9.5px] font-semibold leading-tight ${
                            done || active
                              ? "text-[#111118]/75"
                              : "text-[#111118]/35"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                      {i < STATUS_STEPS.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 rounded-full ${
                            i < currentStepIndex
                              ? "bg-[#111118]"
                              : "bg-[#111118]/10"
                          }`}
                        />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Colonne vue d'ensemble, meet, activités (1/3) */}
        <div className="space-y-5">
          {/* Vue d'ensemble : statut, budget, timeline et prochaine échéance réelle */}
          <div className="rounded-[24px] border border-[#111118]/8 bg-white p-6">
            <h3 className="font-heading text-[10px] font-bold text-[#111118]/40 mb-3 uppercase tracking-wider">
              Vue d'ensemble
            </h3>

            <div className="mb-4 flex items-center justify-between">
              <span className="text-[11px] text-[#111118]/50">
                Budget prévu
              </span>
              <span className="text-sm font-bold text-[#111118]">
                {formatBudget(activeProject.mission_budget || 0)}
              </span>
            </div>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-[#111118]/50">Avancement du temps</span>
                <span className="font-semibold text-[#111118]/80">
                  {timelinePercent}%
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-[#F3EBDD] overflow-hidden">
                <div
                  className="h-full bg-[#D95C38] transition-all duration-500 rounded-full"
                  style={{ width: `${timelinePercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] text-[#111118]/35">
                <span>Début : {startDateStr || "récemment"}</span>
                <span>Fin : {endDateStr || "à venir"}</span>
              </div>
            </div>

            <div className="border-t border-[#111118]/6 pt-3 space-y-1.5 text-[10.5px]">
              <div className="flex items-center gap-1.5 text-[#111118]/60">
                <Clock className="h-3 w-3 text-[#D95C38] shrink-0" />
                {nextMeeting ? (
                  <span>
                    Prochaine réunion :{" "}
                    <span className="font-semibold text-[#111118]">
                      {nextMeeting.date} à {nextMeeting.time.substring(0, 5)}
                    </span>
                  </span>
                ) : (
                  <span className="text-[#111118]/35 italic">
                    Aucune réunion à venir
                  </span>
                )}
              </div>
              {lastMeeting && (
                <div className="flex items-center gap-1.5 text-[#111118]/40">
                  <CheckCircle2 className="h-3 w-3 shrink-0" />
                  <span>Dernier échange en visio le {lastMeeting.date}</span>
                </div>
              )}
            </div>
          </div>

          {/* Planifier un meet */}
          <div className="rounded-[24px] bg-[#111118] p-6 text-white">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                <Video className="h-5 w-5 text-[#E7B84B]" />
              </div>
              <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[9px] font-bold text-[#E7B84B] border border-white/10">
                Visio LiveKit
              </span>
            </div>

            <h4 className="mt-3 font-heading text-sm font-bold text-white">
              Session visioconférence
            </h4>
            <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
              Organisez un appel direct et synchronisé en temps réel entre
              l'annonceur et le freelance.
            </p>

            <button
              onClick={() => setIsMeetModalOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] py-2.5 text-[11px] font-bold text-white transition-colors"
            >
              <Plus className="h-4 w-4" /> Planifier un meet
            </button>
          </div>

          {/* Activités & réunions */}
          <div className="rounded-[24px] border border-[#111118]/8 bg-white p-6">
            <div className="flex items-center justify-between border-b border-[#111118]/6 pb-2.5 mb-3">
              <h3 className="font-heading text-xs font-bold text-[#111118]">
                Activités & réunions ({meetings.length})
              </h3>
              <span className="flex items-center gap-1 text-[9px] text-[#D95C38] font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-[#D95C38] animate-ping" />{" "}
                Temps réel
              </span>
            </div>

            {meetings.length === 0 ? (
              <p className="text-[10.5px] text-[#111118]/40 italic text-center py-4">
                Aucune réunion planifiée pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-start gap-2.5 text-[11px] border-b border-[#111118]/6 pb-2.5 last:border-0 last:pb-0"
                  >
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-[#D95C38] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#111118] leading-tight">
                        {m.title}
                      </p>
                      <p className="text-[10px] text-[#111118]/40">
                        {m.date} à {m.time.substring(0, 5)}{" "}
                        {m.created_by_name ? `• par ${m.created_by_name}` : ""}
                      </p>
                      {m.link && (
                        <button
                          type="button"
                          onClick={() => handleJoinCall(m.id)}
                          disabled={isJoiningCall}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg bg-[#111118] px-2.5 py-1 text-[9.5px] font-bold text-white hover:bg-[#111118]/85 transition-colors disabled:opacity-50"
                        >
                          {isJoiningCall ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Video className="h-3 w-3 text-[#E7B84B]" />
                          )}
                          Rejoindre le meet
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── MODAL : PLANIFIER UN MEET ── */}
      {isMeetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111118]/50 p-4 backdrop-blur-sm"
          onClick={() => setIsMeetModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsMeetModalOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#111118]/40 hover:bg-[#F3EBDD]"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <h3 className="font-heading text-base font-bold text-[#111118]">
                Planifier un meet
              </h3>
              <p className="text-[11px] text-[#111118]/50">
                Le salon sera généré automatiquement et visible pour l'annonceur
                et le freelance.
              </p>
            </div>

            <form onSubmit={handleAddMeet} className="space-y-4 text-[11px]">
              <div>
                <label className="mb-1 block font-semibold text-[#111118]/70">
                  Titre de la visioconférence
                </label>
                <input
                  type="text"
                  required
                  value={newMeetTitle}
                  onChange={(e) => setNewMeetTitle(e.target.value)}
                  placeholder="ex : point d'avancement & recette"
                  className="w-full rounded-xl border border-[#111118]/15 px-3 py-2 outline-none focus:border-[#D95C38]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-[#111118]/70">
                    Date
                  </label>
                  <input
                    type="date"
                    required
                    value={newMeetDate}
                    onChange={(e) => setNewMeetDate(e.target.value)}
                    className="w-full rounded-xl border border-[#111118]/15 px-3 py-2 outline-none focus:border-[#D95C38]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-[#111118]/70">
                    Heure
                  </label>
                  <input
                    type="time"
                    required
                    value={newMeetTime}
                    onChange={(e) => setNewMeetTime(e.target.value)}
                    className="w-full rounded-xl border border-[#111118]/15 px-3 py-2 outline-none focus:border-[#D95C38]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMeetModalOpen(false)}
                  className="flex-1 rounded-xl border border-[#111118]/15 py-2 font-semibold text-[#111118]/60 hover:bg-[#F3EBDD]/60"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMeetingMutation.isPending}
                  className="flex-1 rounded-xl bg-[#111118] py-2 font-semibold text-white hover:bg-[#111118]/85 disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {createMeetingMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  Planifier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL : SALLE D'APPEL ACTIVE ── */}
      {activeCall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#111118]/70 p-4 backdrop-blur-md"
          onClick={() => setActiveCall(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-[28px] bg-white p-6 shadow-2xl border border-[#111118]/8"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveCall(null)}
              className="absolute right-4 top-4 rounded-lg p-1 text-[#111118]/40 hover:bg-[#F3EBDD]"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F3EBDD] text-[#D95C38]">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-[#111118]">
                  Salon de visioconférence
                </h3>
                <p className="text-[11px] font-semibold text-[#111118]/60">
                  {activeCall.title} • Room :{" "}
                  <span className="font-mono">{activeCall.room_name}</span>
                </p>
              </div>
            </div>

            <div className="mb-5 space-y-3 rounded-[24px] bg-[#111118] p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[10px] font-bold text-[#E7B84B] border border-white/10">
                  <span className="h-2 w-2 rounded-full bg-[#E7B84B] animate-ping" />{" "}
                  Connexion authentifiée
                </span>
                <span className="text-[10px] text-white/40">
                  Protocole WSS actif
                </span>
              </div>

              <div className="rounded-xl bg-black/30 p-3 text-[10.5px] font-mono space-y-1 text-white/70 border border-white/10">
                <p>
                  <span className="text-white/40">URL serveur :</span>{" "}
                  {activeCall.url}
                </p>
                <p className="truncate">
                  <span className="text-white/40">Jeton JWT :</span>{" "}
                  {activeCall.token.substring(0, 35)}...
                </p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(activeCall.url)}&token=${encodeURIComponent(activeCall.token)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] px-4 py-2.5 text-[11px] font-bold text-white transition-colors"
                >
                  <Video className="h-4 w-4" /> Rejoindre la visioconférence
                </a>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveCall(null)}
                className="rounded-xl border border-[#111118]/15 px-4 py-1.5 text-[11px] font-semibold text-[#111118]/60 hover:bg-[#F3EBDD]/60"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectWorkspacePage;
