import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMediaUrl } from "../../../utils/getMediaUrl";
import {
  Briefcase,
  CalendarDays,
  Clock,
  Clock3,
  ExternalLink,
  Loader2,
  MessageSquare,
  Search,
  UserCheck,
  ShieldCheck,
  Truck,
  Receipt,
  AlertCircle,
  CreditCard,
  HelpCircle,
  CheckCircle2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  getPropositions,
  type Proposition,
} from "../../../api/propositionsApi";
import { validerLivraisonMission } from "../../../api/paiementApi";
import {
  InitiatePaymentModal,
  HistoriquePaiementModal,
} from "../../../components/PaiementModals";

// ── Palette commune au dashboard (annonceur / freelance) ────────────────────
// Encre #111118 · Terracotta #D95C38 · Jaune #E7B84B · Crème #F3EBDD

const formatBudget = (value: number) =>
  `${new Intl.NumberFormat("fr-FR").format(value)} FCFA`;

const formatDate = (value: string | null | undefined) =>
  value
    ? new Intl.DateTimeFormat("fr-FR", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }).format(new Date(value))
    : "N/A";

const AnnonceurEspacePage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");

  const [payTarget, setPayTarget] = useState<{
    missionId: number;
    title: string;
    budget: number;
  } | null>(null);

  const [historiqueTarget, setHistoriqueTarget] = useState<{
    missionId: number;
    title: string;
  } | null>(null);

  const [validationError, setValidationError] = useState<string | null>(null);

  const { data: propositions = [], isLoading } = useQuery({
    queryKey: ["propositions-announcer-espace"],
    queryFn: () => getPropositions(),
  });

  const validateDeliveryMutation = useMutation({
    mutationFn: (missionId: number) => validerLivraisonMission(missionId),
    onSuccess: () => {
      setValidationError(null);
      queryClient.invalidateQueries({
        queryKey: ["propositions-announcer-espace"],
      });
    },
    onError: (err: any) => {
      const msg =
        err.response?.data?.error ||
        "Erreur lors de la validation de la livraison.";
      setValidationError(msg);
    },
  });

  const acceptedProjects = propositions.filter((prop: Proposition) => {
    const isAccepted = prop.proposition_status === "ACCEPTED";
    const matchesSearch =
      prop.mission_title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prop.freelance_info?.first_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      prop.freelance_info?.last_name
        ?.toLowerCase()
        .includes(searchTerm.toLowerCase());
    return isAccepted && matchesSearch;
  });

  return (
    <div className="mx-auto max-w-[1080px] pb-12">
      {payTarget && (
        <InitiatePaymentModal
          missionId={payTarget.missionId}
          missionTitle={payTarget.title}
          budget={payTarget.budget}
          onClose={() => setPayTarget(null)}
          onSuccess={() =>
            queryClient.invalidateQueries({
              queryKey: ["propositions-announcer-espace"],
            })
          }
        />
      )}

      {historiqueTarget && (
        <HistoriquePaiementModal
          missionId={historiqueTarget.missionId}
          missionTitle={historiqueTarget.title}
          onClose={() => setHistoriqueTarget(null)}
        />
      )}

      {/* ── En-tête ── */}
      <div className="relative overflow-hidden rounded-[28px] bg-brand-ink text-white p-6 sm:p-7 mb-6">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-semibold text-brand-green">
              Suivi de projets & paiements
            </span>
            <h1 className="font-heading text-xl font-bold tracking-tight text-white mt-1">
              Espace projets & paiements
            </h1>
            <p className="mt-1 text-[11px] text-white/75 max-w-md">
              Suivez la réalisation de vos missions, validez les livraisons et
              réglez vos freelances via PayDunya.
            </p>
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/75" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par titre ou freelance..."
              className="w-full sm:w-64 rounded-2xl border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-[11px] text-white placeholder:text-white/75 outline-none focus:border-brand-peach"
            />
          </div>
        </div>
      </div>

      {/* ── Encart explicatif du workflow ── */}
      <div className="mb-6 rounded-2xl border border-brand-ink/8 dark:border-border bg-brand-sand/50 dark:bg-muted/50 p-4 text-[11px] text-muted-foreground">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 shrink-0 text-brand-violet dark:text-violet-300 mt-0.5" />
          <div>
            <p className="font-bold text-brand-ink dark:text-foreground">
              Comment fonctionne le déclenchement du paiement PayDunya ?
            </p>
            <ol className="mt-1.5 list-inside list-decimal space-y-1 text-[10.5px] text-muted-foreground">
              <li>
                Le freelance termine le projet et clique sur{" "}
                <span className="font-semibold text-brand-ink dark:text-foreground">
                  « Marquer comme livrée »
                </span>{" "}
                depuis son espace.
              </li>
              <li>
                Le bouton{" "}
                <span className="font-semibold text-brand-violet dark:text-violet-300">
                  « Valider la livraison »
                </span>{" "}
                apparaît ci-dessous pour l'annonceur.
              </li>
              <li>
                Une fois validée, le bouton{" "}
                <span className="font-semibold text-brand-ink dark:text-foreground">
                  « Payer le freelance (PayDunya) »
                </span>{" "}
                s'active pour régler la prestation.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-brand-green/25 bg-brand-green/10 p-3 text-[11px] text-brand-violet dark:text-violet-300">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Chargement ── */}
      {isLoading && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-8">
          <Loader2 className="h-6 w-6 animate-spin text-brand-violet dark:text-violet-300" />
          <p className="text-[11px] font-medium text-muted-foreground">
            Chargement de vos projets...
          </p>
        </div>
      )}

      {/* ── État vide ── */}
      {!isLoading && acceptedProjects.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-brand-ink/15 dark:border-border bg-white dark:bg-card p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-sand dark:bg-muted text-brand-violet dark:text-violet-300">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-brand-ink dark:text-foreground">
            Aucun projet en développement
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[11px] text-muted-foreground leading-relaxed">
            Lorsque vous acceptez la candidature d'un freelance depuis la page{" "}
            <span className="font-medium text-muted-foreground">
              « Candidatures reçues »
            </span>
            , la mission bascule automatiquement ici.
          </p>
          <button
            onClick={() => navigate("/espace/candidatures-recues")}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-brand-green hover:bg-brand-green-hover px-4 py-2 text-[11px] font-semibold text-brand-ink dark:text-primary-foreground transition-colors cursor-pointer"
          >
            <UserCheck className="h-3.5 w-3.5" /> Voir les candidatures reçues
          </button>
        </div>
      )}

      {/* ── Liste des projets ── */}
      {!isLoading && acceptedProjects.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {acceptedProjects.map((prop: Proposition) => {
            const freelance = prop.freelance_info;
            const fullName = freelance
              ? `${freelance.first_name} ${freelance.last_name}`.trim()
              : `Freelance #${prop.freelance}`;
            const missionStatus = prop.mission_status || "IN_PROGRESS";

            return (
              <div
                key={prop.id}
                className="flex flex-col rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-5 transition-all hover:shadow-md"
              >
                {/* En-tête mission */}
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-brand-ink/6 dark:border-border pb-3">
                  <div>
                    {missionStatus === "IN_PROGRESS" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-sand dark:bg-muted px-2.5 py-0.5 text-[9.5px] font-semibold text-muted-foreground">
                        <Clock className="h-3 w-3 text-brand-violet dark:text-violet-300" />{" "}
                        En cours de réalisation par le freelance
                      </span>
                    )}
                    {missionStatus === "DELIVERED" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-peach/25 dark:bg-brand-peach/10 px-2.5 py-0.5 text-[9.5px] font-bold text-brand-ink dark:text-foreground border border-brand-peach/40">
                        <Truck className="h-3 w-3" /> Travail livré — à valider
                        ci-dessous
                      </span>
                    )}
                    {missionStatus === "COMPLETED" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-brand-ink px-2.5 py-0.5 text-[9.5px] font-bold text-white">
                        <ShieldCheck className="h-3 w-3 text-brand-green" />{" "}
                        Livraison validée — prête au paiement
                      </span>
                    )}

                    <h2 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground leading-tight">
                      {prop.mission_title}
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-brand-ink dark:text-foreground shrink-0">
                    {formatBudget(prop.mission_budget || 0)}
                  </span>
                </div>

                {/* Freelance assigné */}
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-brand-ink/8 dark:border-border bg-brand-sand/50 dark:bg-muted/50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-brand-ink/10 dark:border-border bg-white dark:bg-card">
                    {freelance?.profile_picture ? (
                      <img
                        src={getMediaUrl(freelance.profile_picture)}
                        alt={fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-xs font-bold text-brand-violet dark:text-violet-300">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-brand-ink dark:text-foreground">
                      {fullName}
                    </p>
                    <p className="truncate text-[10px] text-muted-foreground">
                      {freelance?.title || "Développeur fullstack"}
                    </p>
                  </div>
                </div>

                {/* Détails */}
                <div className="mb-4 space-y-2 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" /> Date de livraison
                      prévue :
                    </span>
                    <span className="font-semibold text-brand-ink dark:text-foreground">
                      {formatDate(prop.date_livraison)}
                    </span>
                  </div>
                </div>

                {/* Actions validation & paiement */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {missionStatus === "IN_PROGRESS" && (
                    <span className="text-[10px] font-medium italic text-muted-foreground">
                      En attente que le freelance marque son travail comme
                      livré.
                    </span>
                  )}

                  {missionStatus === "DELIVERED" && (
                    <button
                      onClick={() =>
                        validateDeliveryMutation.mutate(prop.mission)
                      }
                      disabled={validateDeliveryMutation.isPending}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green hover:bg-brand-green-hover px-4 py-2 text-[11px] font-bold text-brand-ink dark:text-primary-foreground transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {validateDeliveryMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Valider la livraison
                    </button>
                  )}

                  {missionStatus === "COMPLETED" &&
                    (prop.paiement_statut_collecte === "REUSSI" ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-900/80 px-4 py-2 text-[11px] font-bold text-white opacity-90 cursor-not-allowed"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                        Paiement effectué ✓
                      </button>
                    ) : prop.paiement_statut_collecte === "EN_ATTENTE" ? (
                      <button
                        disabled
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink/70 dark:bg-black/65 px-4 py-2 text-[11px] font-bold text-white opacity-80 cursor-not-allowed"
                      >
                        <Clock3 className="h-4 w-4 text-brand-green animate-pulse" />
                        Paiement en cours...
                      </button>
                    ) : (
                      <button
                        onClick={() =>
                          setPayTarget({
                            missionId: prop.mission,
                            title: prop.mission_title || "Mission",
                            budget: prop.mission_budget || 0,
                          })
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink hover:bg-brand-ink/85 dark:hover:bg-black/65 px-4 py-2 text-[11px] font-bold text-white transition-all cursor-pointer"
                      >
                        <CreditCard className="h-4 w-4 text-brand-green" />{" "}
                        Payer le freelance (PayDunya)
                      </button>
                    ))}

                  <button
                    onClick={() =>
                      setHistoriqueTarget({
                        missionId: prop.mission,
                        title: prop.mission_title || "Mission",
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/12 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 transition-colors cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5 text-muted-foreground" />{" "}
                    Historique paiement
                  </button>
                </div>

                {/* Actions bas de carte */}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-brand-ink/6 dark:border-border pt-3">
                  <button
                    onClick={() => navigate("/espace/messages")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-brand-ink/15 dark:border-border bg-white dark:bg-card px-3 py-1.5 text-[10.5px] font-semibold text-brand-ink dark:text-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Contacter le
                    freelance
                  </button>

                  <button
                    onClick={() => navigate(`/espace/missions/${prop.mission}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-muted-foreground hover:text-brand-ink dark:hover:text-foreground cursor-pointer"
                  >
                    Détails mission <ExternalLink className="h-3 w-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AnnonceurEspacePage;
