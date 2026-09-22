import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  Video,
  Plus,
  CheckCircle2,
  FileText,
  MessageSquare,
  AlertCircle,
  Briefcase,
  User,
  Loader2,
  X,
  PieChart as PieIcon,
  TrendingUp,
  ShieldCheck,
} from 'lucide-react';
import { getPropositions, type Proposition } from '../../../api/propositionsApi';
import {
  getProjectMeetings,
  createProjectMeeting,
  getMeetingToken,
  type ProjectMeeting,
  type LiveKitTokenResponse,
} from '../../../api/meetingsApi';
import getCurrentUser from '../../../utils/getUser';

// ── Helpers ────────────────────────────────────────────────────────────────
const formatBudget = (value: number) =>
  `${new Intl.NumberFormat('fr-FR').format(value)} FCFA`;

const MONTHS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

const DAYS_FR = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

const ProjectWorkspacePage: React.FC = () => {
  const queryClient = useQueryClient();

  // Active LiveKit Call Modal State
  const [activeCall, setActiveCall] = useState<LiveKitTokenResponse | null>(null);
  const [isJoiningCall, setIsJoiningCall] = useState(false);

  const handleJoinCall = async (meetingId: number) => {
    try {
      setIsJoiningCall(true);
      const res = await getMeetingToken(meetingId);
      setActiveCall(res);
    } catch (err) {
      console.error('Erreur de génération du jeton LiveKit:', err);
    } finally {
      setIsJoiningCall(false);
    }
  };

  // Current logged in user
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: getCurrentUser,
  });

  // Fetch accepted propositions
  const { data: propositions = [], isLoading: isPropositionsLoading } = useQuery({
    queryKey: ['propositions-workspace'],
    queryFn: () => getPropositions(),
  });

  // Filter accepted propositions
  const acceptedProjects = useMemo(() => {
    return propositions.filter((p: Proposition) => p.proposition_status === 'ACCEPTED');
  }, [propositions]);

  // Selected project ID state
  const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);

  // Active project
  const activeProject = useMemo(() => {
    if (acceptedProjects.length === 0) return null;
    if (selectedProjectId) {
      return acceptedProjects.find((p) => p.id === selectedProjectId) || acceptedProjects[0];
    }
    return acceptedProjects[0];
  }, [acceptedProjects, selectedProjectId]);

  // REAL-TIME PERSISTENT MEETINGS POLLING (every 4s auto-refetch)
  const { data: meetings = [], isLoading: isMeetingsLoading } = useQuery({
    queryKey: ['project-meetings', activeProject?.mission],
    queryFn: () => getProjectMeetings(activeProject?.mission),
    enabled: !!activeProject?.mission,
    refetchInterval: 4000, // AUTO-ADAPTS IN REAL TIME WITHOUT MANUAL REFRESH!
  });

  // Create Meeting Mutation
  const createMeetingMutation = useMutation({
    mutationFn: createProjectMeeting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-meetings'] });
      setNewMeetTitle('');
      setIsMeetModalOpen(false);
    },
  });

  // Calendar State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState<'month' | 'week'>('month');

  // Modal State
  const [isMeetModalOpen, setIsMeetModalOpen] = useState(false);
  const [newMeetTitle, setNewMeetTitle] = useState('');
  const [newMeetDate, setNewMeetDate] = useState(new Date().toISOString().split('T')[0]);
  const [newMeetTime, setNewMeetTime] = useState('14:00');

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

  // Calendar grid calculations
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday start

  const calendarDays = useMemo(() => {
    const days: Array<{ dayNumber: number; dateStr: string; isCurrentMonth: boolean }> = [];
    
    // Padding from prev month
    const prevMonthDays = new Date(year, month, 0).getDate();
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      days.push({
        dayNumber: prevMonthDays - i,
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(prevMonthDays - i).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    // Days of current month
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Remaining slots to complete 35 or 42 grid
    const totalSlots = days.length > 35 ? 42 : 35;
    const remaining = totalSlots - days.length;
    for (let r = 1; r <= remaining; r++) {
      days.push({
        dayNumber: r,
        dateStr: `${year}-${String(month + 2).padStart(2, '0')}-${String(r).padStart(2, '0')}`,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [year, month, firstDayIndex, daysInMonth]);

  // Project Dates & Progress Calculation
  const startDateStr = activeProject?.created_at
    ? new Date(activeProject.created_at).toISOString().split('T')[0]
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

  if (isPropositionsLoading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-[#1b4b6b]" />
        <p className="text-xs text-neutral-500">Chargement de votre Espace Projet...</p>
      </div>
    );
  }

  if (!activeProject) {
    return (
      <div className="mx-auto max-w-[1080px] py-12 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50 text-[#1b4b6b]">
          <Briefcase className="h-7 w-7" />
        </div>
        <h2 className="font-heading text-base font-bold text-neutral-900">
          Aucun projet en cours de développement
        </h2>
        <p className="mx-auto mt-1.5 max-w-md text-[11.5px] text-neutral-500 leading-relaxed">
          L'Espace Projet s'active automatiquement dès qu'une candidature est acceptée par l'annonceur.
        </p>
      </div>
    );
  }

  const freelance = activeProject.freelance_info;
  const freelanceName = freelance
    ? `${freelance.first_name} ${freelance.last_name}`
    : 'Freelance';

  return (
    <div className="mx-auto max-w-[1140px] pb-12 space-y-5">
      {/* ── TOP HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 bg-white p-5 rounded-xl border border-[#ebe8e2] shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Project Title & Selector */}
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {/* Badge statut dynamique */}
            {(!activeProject.mission_status || activeProject.mission_status === 'IN_PROGRESS') && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eaf7ef] px-2.5 py-0.5 text-[9.5px] font-semibold text-[#29935a]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#29935a] animate-pulse" /> En cours de développement
              </span>
            )}
            {activeProject.mission_status === 'DELIVERED' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-0.5 text-[9.5px] font-semibold text-blue-700 border border-blue-200">
                <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" /> Livrée — En attente de validation
              </span>
            )}
            {activeProject.mission_status === 'COMPLETED' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[9.5px] font-bold text-emerald-800 border border-emerald-300">
                <CheckCircle2 className="h-3 w-3" /> Mission Terminée
              </span>
            )}
            {activeProject.mission_status === 'CLOSED' && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-2.5 py-0.5 text-[9.5px] font-semibold text-neutral-500">
                Mission Clôturée
              </span>
            )}
            {acceptedProjects.length > 1 && (
              <select
                value={activeProject.id}
                onChange={(e) => setSelectedProjectId(Number(e.target.value))}
                className="text-[11px] font-medium border border-neutral-200 rounded px-2 py-0.5 bg-neutral-50 outline-none"
              >
                {acceptedProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.mission_title}
                  </option>
                ))}
              </select>
            )}
          </div>
          <h1 className="font-heading text-lg font-bold text-neutral-900">
            {activeProject.mission_title}
          </h1>
        </div>

        {/* Action: Go to Payment & Delivery Validation — Annonceur only */}
        {user?.role === 'annonceur' && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => window.location.href = '/espace/paiements-effectues'}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#1b4b6b] px-3.5 py-1.5 text-[11px] font-bold text-white hover:bg-[#143952] transition-colors cursor-pointer shadow-xs"
            >
              <ShieldCheck className="h-4 w-4 text-[#f2994a]" /> Validation Livraison & Paiement
            </button>
          </div>
        )}

        {/* Participants avatars (Annonceur & Freelance) */}
        <div className="flex items-center gap-4 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-100">
          {/* Annonceur badge */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#1b4b6b]/10 text-[#1b4b6b] flex items-center justify-center font-bold text-xs border border-[#1b4b6b]/20">
              A
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-400 font-medium leading-none">Annonceur</p>
              <p className="text-[11px] font-semibold text-neutral-800 leading-tight">Client</p>
            </div>
          </div>

          <div className="h-6 w-px bg-neutral-200" />

          {/* Freelance badge */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full overflow-hidden bg-neutral-100 border border-neutral-200 flex items-center justify-center shrink-0">
              {freelance?.profile_picture ? (
                <img src={freelance.profile_picture} alt={freelanceName} className="h-full w-full object-cover" />
              ) : (
                <User className="h-4 w-4 text-neutral-500" />
              )}
            </div>
            <div className="text-left">
              <p className="text-[10px] text-neutral-400 font-medium leading-none">Freelance</p>
              <p className="text-[11px] font-semibold text-neutral-800 leading-tight truncate max-w-[120px]">
                {freelanceName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT GRID ────────────────────────────────────────────────── */}
      <div className="grid gap-5 lg:grid-cols-3">
        
        {/* LEFT COLUMN: Calendar & Milestones (2 Cols) */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* Calendar Card */}
          <div className="rounded-xl border border-[#ebe8e2] bg-white p-5 shadow-xs">
            {/* Calendar Header Controls */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h3 className="font-heading text-sm font-bold text-neutral-900">
                  {MONTHS_FR[month]} {year}
                </h3>
                <div className="flex items-center gap-1 rounded-md border border-neutral-200 p-0.5 bg-neutral-50">
                  <button
                    onClick={() => setCurrentDate(new Date(year, month - 1, 1))}
                    className="p-1 rounded hover:bg-white text-neutral-600 transition-colors"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentDate(new Date(year, month + 1, 1))}
                    className="p-1 rounded hover:bg-white text-neutral-600 transition-colors"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-1 rounded-lg bg-neutral-100 p-1 text-[10px] font-semibold text-neutral-600">
                <button
                  onClick={() => setCalendarView('month')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    calendarView === 'month' ? 'bg-white text-neutral-900 shadow-2xs' : 'hover:text-neutral-900'
                  }`}
                >
                  Mois
                </button>
                <button
                  onClick={() => setCalendarView('week')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    calendarView === 'week' ? 'bg-white text-neutral-900 shadow-2xs' : 'hover:text-neutral-900'
                  }`}
                >
                  Semaine
                </button>
              </div>
            </div>

            {/* Days Header */}
            <div className="grid grid-cols-7 gap-1 mb-2 text-center text-[10px] font-semibold text-neutral-400 uppercase tracking-wider">
              {DAYS_FR.map((day) => (
                <div key={day} className="py-1">
                  {day}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((cell, idx) => {
                const isStart = startDateStr === cell.dateStr;
                const isEnd = endDateStr === cell.dateStr;
                const dayMeets = meetings.filter((m) => m.date === cell.dateStr);

                return (
                  <div
                    key={idx}
                    className={`min-h-[64px] rounded-lg border p-1.5 transition-all flex flex-col justify-between ${
                      cell.isCurrentMonth
                        ? 'border-[#f2efeb] bg-white text-neutral-800'
                        : 'border-transparent bg-neutral-50/50 text-neutral-300'
                    } ${isStart ? 'ring-2 ring-[#1b4b6b]' : ''} ${isEnd ? 'ring-2 ring-[#f2994a]' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] font-bold ${cell.isCurrentMonth ? 'text-neutral-700' : 'text-neutral-300'}`}>
                        {cell.dayNumber}
                      </span>
                    </div>

                    <div className="space-y-1">
                      {isStart && (
                        <div className="rounded bg-[#1b4b6b] px-1 py-0.5 text-[8px] font-bold text-white truncate" title="Début de la collaboration">
                          🚀 Début
                        </div>
                      )}
                      {isEnd && (
                        <div className="rounded bg-[#f2994a] px-1 py-0.5 text-[8px] font-bold text-white truncate" title="Livraison prévue">
                          🏁 Livraison
                        </div>
                      )}
                      {dayMeets.map((m) => (
                        <a
                          key={m.id}
                          href={m.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded bg-blue-50 border border-blue-200 px-1 py-0.5 text-[8px] font-semibold text-blue-700 truncate flex items-center gap-0.5 hover:bg-blue-100 transition-colors"
                          title={`LiveKit Meet: ${m.title} à ${m.time}`}
                        >
                          <Video className="h-2 w-2 shrink-0 text-blue-600" /> {m.time.substring(0, 5)}
                        </a>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bottom Grid: Milestones & Time/Budget Allocation */}
          <div className="grid gap-4 md:grid-cols-2">
            {/* Milestone Progress Card */}
            <div className="rounded-xl border border-[#ebe8e2] bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b border-[#f3f0eb] pb-2">
                <h4 className="font-heading text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#1b4b6b]" /> Progression des Étapes
                </h4>
                <span className="text-[9px] font-semibold text-neutral-400">4 phases</span>
              </div>

              {(() => {
                const s = activeProject.mission_status || 'IN_PROGRESS';
                const isCompleted = s === 'COMPLETED' || s === 'CLOSED';
                const isDelivered = s === 'DELIVERED';
                const steps = [
                  {
                    label: 'Cadrage & Spécifications',
                    done: true,
                  },
                  {
                    label: 'Développement & Intégration',
                    done: isCompleted || isDelivered,
                    active: s === 'IN_PROGRESS',
                  },
                  {
                    label: 'Recette & Tests utilisateurs',
                    done: isCompleted,
                    active: isDelivered,
                  },
                  {
                    label: 'Livraison finale & Déploiement',
                    done: isCompleted,
                    active: false,
                  },
                ];
                return (
                  <div className="space-y-2.5">
                    {steps.map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-[11px]">
                        <span className="font-medium text-neutral-700">{m.label}</span>
                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            m.done
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : m.active
                              ? 'bg-blue-50 text-blue-700 border border-blue-200 animate-pulse'
                              : 'bg-neutral-100 text-neutral-400'
                          }`}
                        >
                          {m.done ? 'Terminé' : m.active ? 'En cours' : 'À venir'}
                        </span>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>

            {/* Time / Task Allocation */}
            <div className="rounded-xl border border-[#ebe8e2] bg-white p-4 shadow-xs">
              <div className="mb-3 flex items-center justify-between border-b border-[#f3f0eb] pb-2">
                <h4 className="font-heading text-xs font-bold text-neutral-900 flex items-center gap-1.5">
                  <PieIcon className="h-3.5 w-3.5 text-[#f2994a]" /> Répartition des tâches
                </h4>
              </div>

              {(() => {
                const s = activeProject.mission_status || 'IN_PROGRESS';
                const isCompleted = s === 'COMPLETED' || s === 'CLOSED';
                const ringClass = isCompleted
                  ? 'border-emerald-500'
                  : 'border-[#1b4b6b] border-t-[#f2994a] border-r-emerald-500';
                return (
                  <div className="flex items-center gap-4">
                    <div className={`relative h-16 w-16 shrink-0 rounded-full border-4 ${ringClass} flex items-center justify-center`}>
                      <span className="text-[9px] font-bold text-neutral-700">
                        {isCompleted ? '✓' : '100%'}
                      </span>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-neutral-600 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#1b4b6b]" /> Dev Backend / Frontend</span>
                        <span className={`font-bold ${isCompleted ? 'text-emerald-600' : ''}`}>{isCompleted ? '✓ Terminé' : '50%'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-[#f2994a]" /> Design & UI</span>
                        <span className={`font-bold ${isCompleted ? 'text-emerald-600' : ''}`}>{isCompleted ? '✓ Terminé' : '30%'}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Tests & Recette</span>
                        <span className={`font-bold ${isCompleted ? 'text-emerald-600' : ''}`}>{isCompleted ? '✓ Terminé' : '20%'}</span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

          </div>

        </div>

        {/* RIGHT COLUMN: Project Health, Plan Meet, Activity Stream (1 Col) */}
        <div className="space-y-5">
          
          {/* Project Health Card */}
          <div className="rounded-xl border border-[#ebe8e2] bg-white p-5 shadow-xs">
            <h3 className="font-heading text-xs font-bold text-neutral-900 mb-3 uppercase tracking-wider text-neutral-400">
              Santé du Projet
            </h3>

            <div className="mb-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] text-neutral-500">Budget prévu</span>
                <span className="text-sm font-bold text-[#1b4b6b]">
                  {formatBudget(activeProject.mission_budget || 0)}
                </span>
              </div>
            </div>

            {/* Timeline Progress */}
            <div>
              <div className="flex items-center justify-between mb-1 text-[11px]">
                <span className="text-neutral-500">Avancement du temps</span>
                <span className="font-semibold text-neutral-800">{timelinePercent}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-100 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#1b4b6b] to-[#f2994a] transition-all duration-500 rounded-full"
                  style={{ width: `${timelinePercent}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[9px] text-neutral-400">
                <span>Début: {startDateStr || 'Récemment'}</span>
                <span>Fin: {endDateStr || 'À venir'}</span>
              </div>
            </div>
          </div>

          {/* Plan Meet Highlight Card (LiveKit) */}
          <div className="rounded-xl bg-gradient-to-br from-[#1b4b6b] to-[#143952] p-5 text-white shadow-md">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 backdrop-blur-md">
                <Video className="h-5 w-5 text-white" />
              </div>
              <span className="rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-[9px] font-bold text-emerald-300 border border-emerald-400/30">
                LiveKit Video
              </span>
            </div>

            <h4 className="mt-3 font-heading text-sm font-bold">Session LiveKit / Meet</h4>
            <p className="mt-1 text-[11px] text-blue-100 leading-relaxed">
              Organisez une visioconférence LiveKit directe et synchronisée en temps réel entre l'annonceur et le freelance.
            </p>

            <button
              onClick={() => setIsMeetModalOpen(true)}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-[#f2994a] py-2 text-[11px] font-bold text-white shadow-xs hover:bg-[#d8792b] transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" /> Planifier un meet LiveKit
            </button>
          </div>

          {/* Persistent Real-time Activity Stream */}
          <div className="rounded-xl border border-[#ebe8e2] bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-[#f3f0eb] pb-2 mb-3">
              <h3 className="font-heading text-xs font-bold text-neutral-900">
                Activités & Reunions ({meetings.length})
              </h3>
              <span className="flex items-center gap-1 text-[9px] text-emerald-600 font-bold">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" /> Temps réel
              </span>
            </div>

            {meetings.length === 0 ? (
              <p className="text-[10.5px] text-neutral-400 italic text-center py-4">
                Aucune réunion planifiée pour le moment.
              </p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div key={m.id} className="flex items-start gap-2.5 text-[11px] border-b border-neutral-100 pb-2.5 last:border-0 last:pb-0">
                    <div className="mt-0.5 h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-neutral-800 leading-tight">{m.title}</p>
                      <p className="text-[10px] text-neutral-400">
                        {m.date} à {m.time.substring(0, 5)} {m.created_by_name ? `• par ${m.created_by_name}` : ''}
                      </p>
                      {m.link && (
                        <button
                          type="button"
                          onClick={() => handleJoinCall(m.id)}
                          disabled={isJoiningCall}
                          className="mt-1.5 inline-flex items-center gap-1.5 rounded bg-[#1b4b6b] px-2.5 py-1 text-[9.5px] font-bold text-white hover:bg-[#143952] transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {isJoiningCall ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Video className="h-3 w-3 text-emerald-400" />
                          )}
                          Rejoindre le Meet LiveKit
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

      {/* ── MODAL: PLANIFIER UN MEET LIVEKIT ─────────────────────────────────── */}
      {isMeetModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setIsMeetModalOpen(false)}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsMeetModalOpen(false)}
              className="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:bg-neutral-100"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-4">
              <h3 className="font-heading text-base font-bold text-neutral-900">
                Planifier un Meet LiveKit
              </h3>
              <p className="text-[11px] text-neutral-500">
                Le salon LiveKit sera généré automatiquement et visible pour l'annonceur et le freelance.
              </p>
            </div>

            <form onSubmit={handleAddMeet} className="space-y-4 text-[11px]">
              <div>
                <label className="mb-1 block font-semibold text-neutral-700">Titre de la visioconférence</label>
                <input
                  type="text"
                  required
                  value={newMeetTitle}
                  onChange={(e) => setNewMeetTitle(e.target.value)}
                  placeholder="ex: Point d'avancement LiveKit & Recette"
                  className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-[#1b4b6b]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block font-semibold text-neutral-700">Date</label>
                  <input
                    type="date"
                    required
                    value={newMeetDate}
                    onChange={(e) => setNewMeetDate(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-[#1b4b6b]"
                  />
                </div>
                <div>
                  <label className="mb-1 block font-semibold text-neutral-700">Heure</label>
                  <input
                    type="time"
                    required
                    value={newMeetTime}
                    onChange={(e) => setNewMeetTime(e.target.value)}
                    className="w-full rounded-md border border-neutral-300 px-3 py-2 outline-none focus:border-[#1b4b6b]"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsMeetModalOpen(false)}
                  className="flex-1 rounded-md border border-neutral-300 py-2 font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMeetingMutation.isPending}
                  className="flex-1 rounded-md bg-[#1b4b6b] py-2 font-semibold text-white hover:bg-[#143952] disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {createMeetingMutation.isPending ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Video className="h-3.5 w-3.5" />
                  )}
                  Planifier LiveKit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: LIVEKIT ROOM ACTIVE CALL ─────────────────────────────────── */}
      {activeCall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md"
          onClick={() => setActiveCall(null)}
        >
          <div
            className="relative w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setActiveCall(null)}
              className="absolute right-4 top-4 rounded-md p-1 text-neutral-400 hover:bg-neutral-100"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                <Video className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-heading text-base font-bold text-neutral-900">
                  Salon Visioconférence LiveKit
                </h3>
                <p className="text-[11px] font-semibold text-[#1b4b6b]">
                  {activeCall.title} • Room: <span className="font-mono text-neutral-600">{activeCall.room_name}</span>
                </p>
              </div>
            </div>

            {/* LiveKit Cloud Connection Details */}
            <div className="mb-5 space-y-3 rounded-xl bg-gradient-to-br from-[#1b4b6b] to-[#0f2d42] p-5 text-white">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1 text-[10px] font-bold text-emerald-300 border border-emerald-500/30">
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" /> LiveKit Cloud Authentifié
                </span>
                <span className="text-[10px] text-neutral-300">WSS Protocol Active</span>
              </div>

              <div className="rounded-lg bg-black/30 p-3 text-[10.5px] font-mono space-y-1 text-neutral-200 border border-white/10">
                <p><span className="text-neutral-400">URL Serveur LiveKit:</span> {activeCall.url}</p>
                <p className="truncate"><span className="text-neutral-400">Jeton JWT :</span> {activeCall.token.substring(0, 35)}...</p>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2">
                <a
                  href={`https://meet.livekit.io/custom?liveKitUrl=${encodeURIComponent(activeCall.url)}&token=${encodeURIComponent(activeCall.token)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-[#f2994a] px-4 py-2.5 text-[11px] font-bold text-white shadow-md hover:bg-[#d8792b] transition-colors"
                >
                  <Video className="h-4 w-4" /> Rejoindre la visioconférence LiveKit Cloud
                </a>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => setActiveCall(null)}
                className="rounded-md border border-neutral-300 px-4 py-1.5 text-[11px] font-semibold text-neutral-600 hover:bg-neutral-50 cursor-pointer"
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
