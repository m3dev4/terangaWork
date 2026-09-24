import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock3,
  Code2,
  MapPin,
  Send,
  WalletCards,
  PartyPopper,
  Loader2,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { getMission, getMissionServices } from "../../api/missionsApi";
import {
  checkUserHasApplied,
  createProposition,
} from "../../api/propositionsApi";
import { Modal } from "../../components/modal";

// ── Palette commune au produit (annonceur / freelance / admin / onboarding) ─
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

const formatBudget = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;
const formatDate = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(new Date(`${value}T00:00:00`))
    : "Date flexible";

const DetailSkeleton = () => (
  <div className="animate-pulse space-y-4">
    <div className="h-5 w-24 rounded bg-[#F3EBDD]" />
    <div className="h-8 w-3/4 rounded bg-[#F3EBDD]" />
    <div className="h-24 rounded bg-[#F3EBDD]/60" />
    <div className="h-48 rounded-2xl bg-[#F3EBDD]/60" />
  </div>
);

// ── Formulaire de candidature ────────────────────────────────────────────
interface ApplyFormProps {
  missionId: number;
  deadlineDate?: string | null;
  onSuccess?: () => void;
}

function ApplyForm({ missionId, deadlineDate, onSuccess }: ApplyFormProps) {
  const queryClient = useQueryClient();
  const [lettre, setLettre] = useState("");
  const [dateLivraison, setDateLivraison] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: createProposition,
    onSuccess: () => {
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["has-applied", missionId] });
      onSuccess?.();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError(null);

    if (deadlineDate && dateLivraison > deadlineDate) {
      setFieldError(
        `La date de livraison ne peut pas dépasser le ${formatDate(deadlineDate)}.`
      );
      return;
    }
    if (lettre.trim().length < 50) {
      setFieldError(
        "La lettre de motivation doit contenir au moins 50 caractères."
      );
      return;
    }

    mutation.mutate({
      mission: missionId,
      lettre_motivation: lettre,
      date_livraison: dateLivraison,
    });
  };

  if (submitted) {
    return (
      <div className="flex flex-col items-center gap-4 py-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EBDD]">
          <PartyPopper className="h-7 w-7 text-[#D95C38]" />
        </div>
        <h3 className="font-heading text-base font-semibold text-[#111118]">
          Candidature envoyée !
        </h3>
        <p className="max-w-xs text-[11px] leading-relaxed text-[#111118]/50">
          Votre proposition a bien été transmise à l'annonceur. Vous serez
          notifié dès qu'il aura donné suite.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5 px-1 pb-2">
      {(fieldError || mutation.isError) && (
        <div className="rounded-xl border border-[#D95C38]/25 bg-[#D95C38]/10 px-4 py-3 text-[11px] text-[#c14f2f]">
          {fieldError ||
            (mutation.error instanceof Error
              ? mutation.error.message
              : "Une erreur est survenue. Veuillez réessayer.")}
        </div>
      )}

      {/* Lettre de motivation */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="lettre"
          className="text-[10px] font-semibold text-[#111118]/50"
        >
          Lettre de motivation
        </label>
        <textarea
          id="lettre"
          required
          minLength={50}
          rows={5}
          placeholder="Présentez votre expérience, pourquoi cette mission vous correspond, et comment vous comptez la réaliser…"
          value={lettre}
          onChange={(e) => setLettre(e.target.value)}
          className="w-full resize-none rounded-xl border border-[#111118]/12 bg-[#F3EBDD]/30 px-3 py-2.5 text-[12px] leading-relaxed text-[#111118] placeholder:text-[#111118]/30 focus:border-[#D95C38] focus:outline-none focus:ring-2 focus:ring-[#D95C38]/12"
        />
        <span
          className={`self-end text-[10px] ${lettre.length < 50 ? "text-[#111118]/35" : "text-[#D95C38]"}`}
        >
          {lettre.length} / 50 min
        </span>
      </div>

      {/* Date de livraison */}
      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="date_livraison"
          className="text-[10px] font-semibold text-[#111118]/50"
        >
          Date de livraison proposée
        </label>
        <input
          id="date_livraison"
          type="date"
          required
          min={new Date().toISOString().split("T")[0]}
          max={deadlineDate ?? undefined}
          value={dateLivraison}
          onChange={(e) => setDateLivraison(e.target.value)}
          className="w-full rounded-xl border border-[#111118]/12 bg-[#F3EBDD]/30 px-3 py-2.5 text-[12px] text-[#111118] focus:border-[#D95C38] focus:outline-none focus:ring-2 focus:ring-[#D95C38]/12"
        />
        {deadlineDate && (
          <span className="text-[10px] text-[#111118]/40">
            Date limite de la mission : {formatDate(deadlineDate)}
          </span>
        )}
      </div>

      <button
        type="submit"
        disabled={mutation.isPending}
        className="mt-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#D95C38] px-5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-[#c14f2f] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Envoi en cours…
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" /> Envoyer ma candidature
          </>
        )}
      </button>
    </form>
  );
}

// ── Page ───────────────────────────────────────────────────────────────────
const MissionDetailPage: React.FC = () => {
  const [applyOpen, setApplyOpen] = useState(false);
  const navigate = useNavigate();
  const { missionId } = useParams();
  const missionQuery = useQuery({
    queryKey: ["mission", missionId],
    queryFn: () => getMission(Number(missionId)),
    enabled: Boolean(missionId),
  });
  const servicesQuery = useQuery({
    queryKey: ["mission-services"],
    queryFn: getMissionServices,
  });
  const hasAppliedQuery = useQuery({
    queryKey: ["has-applied", missionId],
    queryFn: () => checkUserHasApplied(Number(missionId)),
    enabled: Boolean(missionId),
  });
  const hasApplied = hasAppliedQuery.data ?? false;
  const mission = missionQuery.data;
  const serviceName =
    servicesQuery.data?.find((service) => service.id === mission?.service)
      ?.name || "Service requis";

  return (
    <div className="mx-auto max-w-250 pb-12">
      <button
        type="button"
        onClick={() => navigate("/espace/missions")}
        className="mb-4 inline-flex items-center gap-2 text-[11px] font-medium text-[#111118]/50 hover:text-[#D95C38]"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Retour aux missions
      </button>
      {missionQuery.isLoading && <DetailSkeleton />}
      {missionQuery.isError && (
        <div className="rounded-2xl border border-[#D95C38]/20 bg-[#D95C38]/5 p-8 text-center text-[11px] text-[#c14f2f]">
          Cette mission est introuvable ou n'est plus disponible.
        </div>
      )}
      {mission && (
        <>
          <div className="mb-4 rounded-[28px] border border-[#111118]/8 bg-white p-5 sm:p-7">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-[#F3EBDD] px-2.5 py-1 text-[9px] font-semibold text-[#111118]/70">
                Mission disponible
              </span>
              <span className="text-[10px] text-[#111118]/35">
                Publié récemment
              </span>
            </div>
            <h1 className="max-w-3xl font-heading text-2xl font-semibold leading-tight tracking-tight text-[#111118] sm:text-3xl">
              {mission.title}
            </h1>
            <div className="mt-5 grid gap-4 border-t border-[#111118]/6 pt-4 sm:grid-cols-3">
              <div className="flex items-center gap-2.5">
                <WalletCards className="h-4 w-4 text-[#D95C38]" />
                <div>
                  <p className="text-[9px] text-[#111118]/35">Budget estimé</p>
                  <p className="text-[12px] font-semibold text-[#111118]">
                    {formatBudget(mission.budget)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 text-[#D95C38]" />
                <div>
                  <p className="text-[9px] text-[#111118]/35">Date limite</p>
                  <p className="text-[12px] font-semibold text-[#111118]">
                    {formatDate(mission.date_deadline)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <Clock3 className="h-4 w-4 text-[#D95C38]" />
                <div>
                  <p className="text-[9px] text-[#111118]/35">Paiement</p>
                  <p className="text-[12px] font-semibold text-[#111118]">
                    {mission.operateurMobileMoney}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <section className="rounded-[28px] border border-[#111118]/8 bg-white p-5 sm:p-7">
              <h2 className="mb-3 font-heading text-sm font-semibold text-[#111118]">
                Description de la mission
              </h2>
              <p className="whitespace-pre-line text-[12px] leading-7 text-[#111118]/65">
                {mission.description}
              </p>
              <div className="mt-7 border-t border-[#111118]/6 pt-5">
                <h2 className="mb-3 font-heading text-sm font-semibold text-[#111118]">
                  Service recherché
                </h2>
                <span className="inline-flex items-center gap-2 rounded-full bg-[#F3EBDD]/60 px-3 py-2 text-[10px] font-medium text-[#111118]/70">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#D95C38]" />{" "}
                  {serviceName}
                </span>
              </div>

              {mission.technologies_detail &&
                mission.technologies_detail.length > 0 && (
                  <div className="mt-5 border-t border-[#111118]/6 pt-5">
                    <h2 className="mb-3 font-heading text-sm font-semibold text-[#111118]">
                      Technologies requises
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {mission.technologies_detail.map((tech) => (
                        <span
                          key={tech.id}
                          className="inline-flex items-center gap-1.5 rounded-full bg-[#F3EBDD] px-3 py-1 text-[10.5px] font-semibold text-[#111118]/70"
                        >
                          {tech.imgUrl ? (
                            <img
                              src={tech.imgUrl}
                              alt={tech.name}
                              className="h-3.5 w-3.5 object-contain"
                            />
                          ) : (
                            <Code2 className="h-3.5 w-3.5 text-[#D95C38]" />
                          )}
                          {tech.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
            </section>
            <aside className="h-fit rounded-[24px] border border-[#111118]/8 bg-white p-5">
              <p className="mb-3 text-[10px] font-semibold text-[#111118]/40">
                Votre candidature
              </p>
              <p className="mb-5 text-[11px] leading-relaxed text-[#111118]/50">
                Cette mission correspond à votre profil ? Envoyez votre
                proposition à l'annonceur.
              </p>
              <Modal
                title="Postuler à la mission"
                open={applyOpen}
                setOpen={setApplyOpen}
                trigger={
                  <button
                    type="button"
                    disabled={hasApplied}
                    onClick={() => !hasApplied && setApplyOpen(true)}
                    className="mb-2 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#D95C38] px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#c14f2f] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {hasApplied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Déjà postulé
                      </>
                    ) : (
                      <>
                        <Send className="h-3.5 w-3.5" /> Postuler à la mission
                      </>
                    )}
                  </button>
                }
              >
                <ApplyForm
                  missionId={Number(missionId)}
                  deadlineDate={mission.date_deadline}
                  onSuccess={() => setApplyOpen(false)}
                />
              </Modal>
              {hasApplied && (
                <p className="mb-2 flex items-center justify-center gap-1.5 text-[10px] font-medium text-[#D95C38]">
                  <CheckCircle2 className="h-3 w-3" /> Votre candidature est en
                  cours d'examen
                </p>
              )}
              <button
                type="button"
                onClick={() => navigate("/espace/missions")}
                className="w-full rounded-xl border border-[#111118]/12 px-4 py-2.5 text-[11px] font-medium text-[#111118]/60 hover:border-[#111118]/25"
              >
                Retour à la recherche
              </button>
              <div className="mt-5 border-t border-[#111118]/6 pt-4 text-[10px] text-[#111118]/40">
                <p className="mb-2 flex items-center gap-2">
                  <MapPin className="h-3 w-3" /> Travail à distance
                </p>
                <p>Annonce publiée par un annonceur vérifié.</p>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default MissionDetailPage;
