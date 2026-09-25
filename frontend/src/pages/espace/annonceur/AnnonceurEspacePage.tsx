import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getMediaUrl } from "../../../utils/getMediaUrl";
import {
  Briefcase,
  CalendarDays,
  Clock,
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
      <div className="relative overflow-hidden rounded-[28px] bg-[#111118] text-white p-6 sm:p-7 mb-6">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="text-[10px] font-semibold text-[#E7B84B]">
              Suivi de projets & paiements
            </span>
            <h1 className="font-heading text-xl font-bold tracking-tight text-white mt-1">
              Espace projets & paiements
            </h1>
            <p className="mt-1 text-[11px] text-white/50 max-w-md">
              Suivez la réalisation de vos missions, validez les livraisons et
              réglez vos freelances via PayDunya.
            </p>
          </div>

          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/40" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par titre ou freelance..."
              className="w-56 sm:w-64 rounded-2xl border border-white/15 bg-white/10 py-2 pl-8 pr-3 text-[11px] text-white placeholder:text-white/40 outline-none focus:border-[#E7B84B]"
            />
          </div>
        </div>
      </div>

      {/* ── Encart explicatif du workflow ── */}
      <div className="mb-6 rounded-2xl border border-[#111118]/8 bg-[#F3EBDD]/50 p-4 text-[11px] text-[#111118]/70">
        <div className="flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 shrink-0 text-[#D95C38] mt-0.5" />
          <div>
            <p className="font-bold text-[#111118]">
              Comment fonctionne le déclenchement du paiement PayDunya ?
            </p>
            <ol className="mt-1.5 list-inside list-decimal space-y-1 text-[10.5px] text-[#111118]/60">
              <li>
                Le freelance termine le projet et clique sur{" "}
                <span className="font-semibold text-[#111118]">
                  « Marquer comme livrée »
                </span>{" "}
                depuis son espace.
              </li>
              <li>
                Le bouton{" "}
                <span className="font-semibold text-[#D95C38]">
                  « Valider la livraison »
                </span>{" "}
                apparaît ci-dessous pour l'annonceur.
              </li>
              <li>
                Une fois validée, le bouton{" "}
                <span className="font-semibold text-[#111118]">
                  « Payer le freelance (PayDunya) »
                </span>{" "}
                s'active pour régler la prestation.
              </li>
            </ol>
          </div>
        </div>
      </div>

      {validationError && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-[#D95C38]/25 bg-[#D95C38]/10 p-3 text-[11px] text-[#c14f2f]">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ── Chargement ── */}
      {isLoading && (
        <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-[24px] border border-[#111118]/8 bg-white p-8">
          <Loader2 className="h-6 w-6 animate-spin text-[#D95C38]" />
          <p className="text-[11px] font-medium text-[#111118]/50">
            Chargement de vos projets...
          </p>
        </div>
      )}

      {/* ── État vide ── */}
      {!isLoading && acceptedProjects.length === 0 && (
        <div className="rounded-[28px] border border-dashed border-[#111118]/15 bg-white p-12 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F3EBDD] text-[#D95C38]">
            <Briefcase className="h-6 w-6" />
          </div>
          <h3 className="font-heading text-sm font-semibold text-[#111118]">
            Aucun projet en développement
          </h3>
          <p className="mx-auto mt-1 max-w-sm text-[11px] text-[#111118]/45 leading-relaxed">
            Lorsque vous acceptez la candidature d'un freelance depuis la page{" "}
            <span className="font-medium text-[#111118]/65">
              « Candidatures reçues »
            </span>
            , la mission bascule automatiquement ici.
          </p>
          <button
            onClick={() => navigate("/espace/candidatures-recues")}
            className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-[#D95C38] hover:bg-[#c14f2f] px-4 py-2 text-[11px] font-semibold text-white transition-colors cursor-pointer"
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
                className="flex flex-col rounded-[24px] border border-[#111118]/8 bg-white p-5 transition-all hover:shadow-md"
              >
                {/* En-tête mission */}
                <div className="mb-3 flex items-start justify-between gap-2 border-b border-[#111118]/6 pb-3">
                  <div>
                    {missionStatus === "IN_PROGRESS" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#F3EBDD] px-2.5 py-0.5 text-[9.5px] font-semibold text-[#111118]/70">
                        <Clock className="h-3 w-3 text-[#D95C38]" /> En cours de
                        réalisation par le freelance
                      </span>
                    )}
                    {missionStatus === "DELIVERED" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#E7B84B]/25 px-2.5 py-0.5 text-[9.5px] font-bold text-[#a87921] border border-[#E7B84B]/40">
                        <Truck className="h-3 w-3" /> Travail livré — à valider
                        ci-dessous
                      </span>
                    )}
                    {missionStatus === "COMPLETED" && (
                      <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-[#111118] px-2.5 py-0.5 text-[9.5px] font-bold text-white">
                        <ShieldCheck className="h-3 w-3 text-[#E7B84B]" />{" "}
                        Livraison validée — prête au paiement
                      </span>
                    )}

                    <h2 className="font-heading text-sm font-bold text-[#111118] leading-tight">
                      {prop.mission_title}
                    </h2>
                  </div>
                  <span className="text-[11px] font-bold text-[#111118] shrink-0">
                    {formatBudget(prop.mission_budget || 0)}
                  </span>
                </div>

                {/* Freelance assigné */}
                <div className="mb-4 flex items-center gap-3 rounded-2xl border border-[#111118]/8 bg-[#F3EBDD]/50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#111118]/10 bg-white">
                    {freelance?.profile_picture ? (
                      <img
                        src={getMediaUrl(freelance.profile_picture)}
                        alt={fullName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="text-xs font-bold text-[#D95C38]">
                        {fullName.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-[#111118]">
                      {fullName}
                    </p>
                    <p className="truncate text-[10px] text-[#111118]/50">
                      {freelance?.title || "Développeur fullstack"}
                    </p>
                  </div>
                </div>

                {/* Détails */}
                <div className="mb-4 space-y-2 text-[11px] text-[#111118]/60">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[#111118]/40">
                      <CalendarDays className="h-3.5 w-3.5" /> Date de livraison
                      prévue :
                    </span>
                    <span className="font-semibold text-[#111118]">
                      {formatDate(prop.date_livraison)}
                    </span>
                  </div>
                </div>

                {/* Actions validation & paiement */}
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {missionStatus === "IN_PROGRESS" && (
                    <span className="text-[10px] font-medium italic text-[#111118]/40">
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
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#D95C38] hover:bg-[#c14f2f] px-4 py-2 text-[11px] font-bold text-white transition-all disabled:opacity-50 cursor-pointer"
                    >
                      {validateDeliveryMutation.isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}
                      Valider la livraison
                    </button>
                  )}

                  {missionStatus === "COMPLETED" && (
                    <button
                      onClick={() =>
                        setPayTarget({
                          missionId: prop.mission,
                          title: prop.mission_title || "Mission",
                          budget: prop.mission_budget || 0,
                        })
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#111118] hover:bg-[#111118]/85 px-4 py-2 text-[11px] font-bold text-white transition-all cursor-pointer"
                    >
                      <CreditCard className="h-4 w-4 text-[#E7B84B]" /> Payer le
                      freelance (PayDunya)
                    </button>
                  )}

                  <button
                    onClick={() =>
                      setHistoriqueTarget({
                        missionId: prop.mission,
                        title: prop.mission_title || "Mission",
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#111118]/12 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-[#111118]/70 hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer"
                  >
                    <Receipt className="h-3.5 w-3.5 text-[#111118]/40" />{" "}
                    Historique paiement
                  </button>
                </div>

                {/* Actions bas de carte */}
                <div className="mt-auto flex items-center justify-between gap-2 border-t border-[#111118]/6 pt-3">
                  <button
                    onClick={() => navigate("/espace/messages")}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#111118]/15 bg-white px-3 py-1.5 text-[10.5px] font-semibold text-[#111118] hover:bg-[#F3EBDD]/60 transition-colors cursor-pointer"
                  >
                    <MessageSquare className="h-3.5 w-3.5" /> Contacter le
                    freelance
                  </button>

                  <button
                    onClick={() => navigate(`/espace/missions/${prop.mission}`)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#111118]/45 hover:text-[#111118] cursor-pointer"
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
