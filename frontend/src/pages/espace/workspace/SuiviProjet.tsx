import React, { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Ban,
  CalendarClock,
  Check,
  ExternalLink,
  FileText,
  History,
  Loader2,
  Mic,
  Plus,
  RotateCcw,
  Square,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import {
  demanderAnnulation,
  getHistoriqueMission,
  getSuiviMission,
  invaliderLivrable,
  messageErreur,
  repousserDeadline,
  soumettreLivrable,
  validerLivrable,
  type Livrable,
  type Phase,
  type StatutLivrable,
  type TypePhase,
} from "../../../api/suiviApi";
import { getMediaUrl } from "../../../utils/getMediaUrl";

type Role = "freelance" | "annonceur" | string | undefined;

// ── Helpers ────────────────────────────────────────────────────────────────

const PHASES: { type: TypePhase; label: string; sousTitre: string }[] = [
  { type: "CADRAGE", label: "Cadrage", sousTitre: "Attentes, périmètre, planning" },
  { type: "DEVELOPPEMENT", label: "Développement", sousTitre: "Livrables successifs" },
];

const STATUT_LIVRABLE: Record<StatutLivrable, { label: string; className: string }> = {
  A_VALIDER: {
    label: "À valider",
    className: "bg-brand-peach/40 text-brand-ink dark:bg-brand-peach/15 dark:text-foreground",
  },
  VALIDE: {
    label: "Validé",
    className: "bg-brand-green/15 text-brand-ink dark:text-brand-green",
  },
  INVALIDE: {
    label: "À retravailler",
    className: "bg-red-500/10 text-red-700 dark:text-red-300",
  },
};

const aujourdHui = () => new Date().toISOString().split("T")[0];

const formatDate = (iso: string | null) =>
  iso
    ? new Date(iso.length === 10 ? `${iso}T00:00:00` : iso).toLocaleDateString("fr-FR", {
        day: "numeric",
        month: "short",
      })
    : "—";

const formatDateHeure = (iso: string) =>
  new Date(iso).toLocaleString("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** Jours restants avant la date limite (négatif = retard). */
const joursRestants = (dateLimite: string | null) => {
  if (!dateLimite) return null;
  const fin = new Date(`${dateLimite}T23:59:59`).getTime();
  return Math.ceil((fin - Date.now()) / 86_400_000) - 1;
};

const cadrageEnRetard = (phase: Phase | undefined) => {
  if (!phase || phase.type !== "CADRAGE" || phase.statut !== "EN_COURS") return false;
  if (!phase.date_limite || phase.date_limite >= aujourdHui()) return false;
  return !phase.livrables.some((l) => l.statut === "A_VALIDER" || l.statut === "VALIDE");
};

// ── Enregistreur vocal ─────────────────────────────────────────────────────

const EnregistreurVocal: React.FC<{
  valeur: Blob | null;
  onChange: (blob: Blob | null) => void;
}> = ({ valeur, onChange }) => {
  const [enregistrement, setEnregistrement] = useState(false);
  const [secondes, setSecondes] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const morceaux = useRef<Blob[]>([]);
  const urlApercu = useMemo(() => (valeur ? URL.createObjectURL(valeur) : null), [valeur]);

  useEffect(() => () => { if (urlApercu) URL.revokeObjectURL(urlApercu); }, [urlApercu]);

  useEffect(() => {
    if (!enregistrement) return;
    const t = window.setInterval(() => setSecondes((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [enregistrement]);

  const demarrer = async () => {
    setErreur(null);
    try {
      const flux = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(flux);
      morceaux.current = [];
      recorder.ondataavailable = (e) => e.data.size && morceaux.current.push(e.data);
      recorder.onstop = () => {
        flux.getTracks().forEach((t) => t.stop());
        onChange(new Blob(morceaux.current, { type: recorder.mimeType || "audio/webm" }));
      };
      recorder.start();
      recorderRef.current = recorder;
      setSecondes(0);
      setEnregistrement(true);
    } catch {
      setErreur("Micro inaccessible. Autorisez-le dans votre navigateur ou écrivez votre commentaire.");
    }
  };

  const arreter = () => {
    recorderRef.current?.stop();
    setEnregistrement(false);
  };

  if (valeur && urlApercu) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-brand-ink/10 dark:border-border bg-brand-sand/40 dark:bg-muted/40 p-2">
        <audio src={urlApercu} controls className="h-8 flex-1 min-w-0" />
        <button
          type="button"
          onClick={() => onChange(null)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-white dark:hover:bg-card"
          title="Supprimer le vocal"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={enregistrement ? arreter : demarrer}
        className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10.5px] font-semibold transition-colors ${
          enregistrement
            ? "bg-red-600 text-white"
            : "border border-brand-ink/15 dark:border-border text-brand-ink dark:text-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
        }`}
      >
        {enregistrement ? (
          <>
            <Square className="h-3 w-3 fill-current" /> Arrêter ·{" "}
            {String(Math.floor(secondes / 60)).padStart(1, "0")}:
            {String(secondes % 60).padStart(2, "0")}
          </>
        ) : (
          <>
            <Mic className="h-3.5 w-3.5" /> Enregistrer un vocal
          </>
        )}
      </button>
      {erreur && <p className="mt-1 text-[10px] text-red-600">{erreur}</p>}
    </div>
  );
};

// ── Décision de l'annonceur sur un livrable ────────────────────────────────

const ExamenLivrable: React.FC<{
  livrable: Livrable;
  missionId: number;
  onFermer: () => void;
}> = ({ livrable, missionId, onFermer }) => {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"valider" | "invalider">("valider");
  const [texte, setTexte] = useState("");
  const [vocal, setVocal] = useState<Blob | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const estCadrage = livrable.phase_type === "CADRAGE";
  const commentaireVide = !texte.trim() && !vocal;

  const mutation = useMutation({
    mutationFn: () =>
      (mode === "valider" ? validerLivrable : invaliderLivrable)(livrable.id, {
        texte,
        fichierVocal: vocal,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suivi", missionId] });
      queryClient.invalidateQueries({ queryKey: ["suivi-historique", missionId] });
      onFermer();
    },
    onError: (e) => setErreur(messageErreur(e)),
  });

  const bloque = mode === "invalider" && commentaireVide;

  return (
    <div className="mt-3 rounded-2xl border border-brand-ink/10 dark:border-border bg-brand-canvas dark:bg-muted/30 p-3.5 space-y-3">
      <div className="flex items-center gap-1 rounded-xl bg-white dark:bg-card p-1 w-fit text-[10.5px] font-semibold border border-brand-ink/8 dark:border-border">
        {(["valider", "invalider"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`px-3 py-1 rounded-lg transition-colors ${
              mode === m
                ? m === "valider"
                  ? "bg-brand-green text-brand-ink"
                  : "bg-brand-ink text-white"
                : "text-muted-foreground hover:text-brand-ink dark:hover:text-foreground"
            }`}
          >
            {m === "valider" ? (estCadrage ? "Accepter" : "Valider") : estCadrage ? "Refuser" : "Invalider"}
          </button>
        ))}
      </div>

      <p className="text-[10.5px] text-muted-foreground leading-relaxed">
        {mode === "valider"
          ? estCadrage
            ? "Le cadrage sera accepté et la phase de développement s'ouvrira. Commentaire facultatif."
            : "Le livrable sera validé. Commentaire facultatif."
          : "Expliquez ce qui doit changer : le freelance réadaptera puis resoumettra. Commentaire obligatoire, écrit ou vocal."}
      </p>

      <textarea
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={3}
        maxLength={3000}
        placeholder={mode === "valider" ? "Un mot pour le freelance (facultatif)" : "Ce qui ne convient pas, ce que vous attendez…"}
        className="w-full resize-none rounded-xl border border-brand-ink/15 dark:border-border bg-white dark:bg-card px-3 py-2 text-[11px] outline-none focus:border-brand-green"
      />
      <EnregistreurVocal valeur={vocal} onChange={setVocal} />

      {erreur && <p className="text-[10.5px] text-red-600">{erreur}</p>}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={onFermer}
          className="rounded-xl px-3 py-1.5 text-[10.5px] font-semibold text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
        >
          Annuler
        </button>
        <button
          type="button"
          disabled={bloque || mutation.isPending}
          onClick={() => mutation.mutate()}
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-[10.5px] font-bold transition-colors disabled:opacity-40 ${
            mode === "valider"
              ? "bg-brand-green hover:bg-brand-green-hover text-brand-ink"
              : "bg-brand-ink text-white hover:bg-brand-ink/85"
          }`}
        >
          {mutation.isPending ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : mode === "valider" ? (
            <Check className="h-3.5 w-3.5" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5" />
          )}
          Confirmer
        </button>
      </div>
    </div>
  );
};

// ── Carte d'un livrable ────────────────────────────────────────────────────

const CarteLivrable: React.FC<{
  livrable: Livrable;
  missionId: number;
  peutExaminer: boolean;
}> = ({ livrable, missionId, peutExaminer }) => {
  const [examen, setExamen] = useState(false);
  const statut = STATUT_LIVRABLE[livrable.statut];

  return (
    <li className="rounded-2xl border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-sand dark:bg-muted text-brand-ink dark:text-foreground">
          <FileText className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[12px] font-bold text-brand-ink dark:text-foreground">{livrable.titre}</p>
            <span className={`rounded-full px-2 py-0.5 text-[9.5px] font-bold ${statut.className}`}>
              {statut.label}
            </span>
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Soumis le {formatDateHeure(livrable.date_soumission)}
          </p>
          {livrable.description && (
            <p className="mt-2 text-[11px] leading-relaxed text-brand-ink/80 dark:text-foreground/80 whitespace-pre-line">
              {livrable.description}
            </p>
          )}
          <a
            href={livrable.lien}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-2 inline-flex max-w-full items-center gap-1 text-[10.5px] font-semibold text-brand-violet dark:text-violet-300 hover:underline"
          >
            <ExternalLink className="h-3 w-3 shrink-0" />
            <span className="truncate">{livrable.lien.replace(/^https?:\/\//, "")}</span>
          </a>

          {livrable.commentaires.length > 0 && (
            <ul className="mt-3 space-y-2 border-l-2 border-brand-sand dark:border-border pl-3">
              {livrable.commentaires.map((c) => (
                <li key={c.id} className="text-[10.5px]">
                  <p className="text-muted-foreground">
                    <span className="font-semibold text-brand-ink dark:text-foreground">{c.auteur_nom}</span>{" "}
                    · {formatDateHeure(c.date_creation)}
                  </p>
                  {c.texte && (
                    <p className="mt-0.5 leading-relaxed text-brand-ink/85 dark:text-foreground/85 whitespace-pre-line">
                      {c.texte}
                    </p>
                  )}
                  {c.fichier_vocal && (
                    <audio src={getMediaUrl(c.fichier_vocal)} controls className="mt-1 h-8 w-full max-w-xs" />
                  )}
                </li>
              ))}
            </ul>
          )}

          {peutExaminer && livrable.statut === "A_VALIDER" && !examen && (
            <button
              type="button"
              onClick={() => setExamen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-brand-ink/85"
            >
              Examiner ce livrable
            </button>
          )}
          {examen && (
            <ExamenLivrable livrable={livrable} missionId={missionId} onFermer={() => setExamen(false)} />
          )}
        </div>
      </div>
    </li>
  );
};

// ── Modales ────────────────────────────────────────────────────────────────

const Modale: React.FC<{ titre: string; sousTitre?: string; onFermer: () => void; children: React.ReactNode }> = ({
  titre,
  sousTitre,
  onFermer,
  children,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/50 dark:bg-black/65 p-4 backdrop-blur-sm"
    onClick={onFermer}
  >
    <div
      role="dialog"
      aria-modal="true"
      className="relative w-full max-w-md rounded-[28px] bg-white dark:bg-card p-6 shadow-2xl"
      onClick={(e) => e.stopPropagation()}
    >
      <button
        onClick={onFermer}
        className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:bg-brand-sand dark:hover:bg-muted"
        aria-label="Fermer"
      >
        <X className="h-4 w-4" />
      </button>
      <h3 className="font-heading text-base font-bold text-brand-ink dark:text-foreground">{titre}</h3>
      {sousTitre && <p className="mt-0.5 mb-4 text-[11px] text-muted-foreground">{sousTitre}</p>}
      {children}
    </div>
  </div>
);

const champ =
  "w-full rounded-xl border border-brand-ink/15 dark:border-border bg-white dark:bg-card px-3 py-2 text-[11px] outline-none focus:border-brand-green";

const ModaleLivrable: React.FC<{ missionId: number; phase: Phase; onFermer: () => void }> = ({
  missionId,
  phase,
  onFermer,
}) => {
  const queryClient = useQueryClient();
  const estCadrage = phase.type === "CADRAGE";
  const [titre, setTitre] = useState(estCadrage ? "Cadrage du projet" : "");
  const [lien, setLien] = useState("");
  const [description, setDescription] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => soumettreLivrable(missionId, { titre: titre.trim(), lien: lien.trim(), description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suivi", missionId] });
      queryClient.invalidateQueries({ queryKey: ["suivi-historique", missionId] });
      onFermer();
    },
    onError: (e) => setErreur(messageErreur(e)),
  });

  return (
    <Modale
      titre={estCadrage ? "Livrer le cadrage" : "Soumettre un livrable"}
      sousTitre="L'annonceur sera notifié et pourra le valider ou vous demander des ajustements."
      onFermer={onFermer}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setErreur(null);
          mutation.mutate();
        }}
        className="space-y-3 text-[11px]"
      >
        <label className="block">
          <span className="mb-1 block font-semibold text-muted-foreground">Titre</span>
          <input required value={titre} onChange={(e) => setTitre(e.target.value)} maxLength={200} placeholder="ex : Maquettage" className={champ} />
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold text-muted-foreground">Lien</span>
          <input
            required
            type="url"
            value={lien}
            onChange={(e) => setLien(e.target.value)}
            placeholder="https://www.figma.com/…"
            className={champ}
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-semibold text-muted-foreground">
            Description <span className="font-normal">(facultatif)</span>
          </span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={3000}
            className={`${champ} resize-none`}
          />
        </label>
        {erreur && <p className="text-[10.5px] text-red-600">{erreur}</p>}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-ink py-2.5 font-bold text-white hover:bg-brand-ink/85 disabled:opacity-50"
        >
          {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          Soumettre
        </button>
      </form>
    </Modale>
  );
};

const ModaleDeadline: React.FC<{ missionId: number; onFermer: () => void }> = ({ missionId, onFermer }) => {
  const queryClient = useQueryClient();
  const demain = new Date(Date.now() + 86_400_000).toISOString().split("T")[0];
  const [date, setDate] = useState(demain);
  const [erreur, setErreur] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => repousserDeadline(missionId, date),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suivi", missionId] });
      queryClient.invalidateQueries({ queryKey: ["suivi-historique", missionId] });
      onFermer();
    },
    onError: (e) => setErreur(messageErreur(e)),
  });
  return (
    <Modale titre="Repousser la deadline" sousTitre="Le freelance sera notifié de la nouvelle date." onFermer={onFermer}>
      <input type="date" min={demain} value={date} onChange={(e) => setDate(e.target.value)} className={champ} />
      {erreur && <p className="mt-2 text-[10.5px] text-red-600">{erreur}</p>}
      <button
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
        className="mt-4 flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-ink py-2.5 text-[11px] font-bold text-white hover:bg-brand-ink/85 disabled:opacity-50"
      >
        {mutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
        Confirmer la nouvelle date
      </button>
    </Modale>
  );
};

const ModaleAnnulation: React.FC<{ missionId: number; onFermer: () => void }> = ({ missionId, onFermer }) => {
  const queryClient = useQueryClient();
  const [erreur, setErreur] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => demanderAnnulation(missionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suivi", missionId] });
      queryClient.invalidateQueries({ queryKey: ["suivi-historique", missionId] });
      onFermer();
    },
    onError: (e) => setErreur(messageErreur(e)),
  });
  return (
    <Modale
      titre="Demander l'annulation"
      sousTitre="Votre demande sera examinée par l'administration, qui tient compte du travail déjà fourni par le freelance. La mission continue tant qu'aucune décision n'est prise."
      onFermer={onFermer}
    >
      {erreur && <p className="mb-2 text-[10.5px] text-red-600">{erreur}</p>}
      <div className="flex gap-2">
        <button
          onClick={onFermer}
          className="flex-1 rounded-xl border border-brand-ink/15 dark:border-border py-2 text-[11px] font-semibold text-muted-foreground hover:bg-brand-sand/60 dark:hover:bg-muted/60"
        >
          Garder la mission
        </button>
        <button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending}
          className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-red-600 py-2 text-[11px] font-bold text-white hover:bg-red-700 disabled:opacity-50"
        >
          {mutation.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Envoyer la demande
        </button>
      </div>
    </Modale>
  );
};

// ── Carte principale : suivi par phases ────────────────────────────────────

export const SuiviPhasesCard: React.FC<{ missionId: number; role: Role }> = ({ missionId, role }) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["suivi", missionId],
    queryFn: () => getSuiviMission(missionId),
    refetchInterval: 10_000,
  });
  const [ongletChoisi, setOngletChoisi] = useState<TypePhase | null>(null);
  const [modale, setModale] = useState<"livrable" | "deadline" | "annulation" | null>(null);

  const phases = data?.phases ?? [];
  const parType = (t: TypePhase) => phases.find((p) => p.type === t);
  const phaseCourante = phases.find((p) => p.statut === "EN_COURS");
  const onglet = ongletChoisi ?? phaseCourante?.type ?? "CADRAGE";
  const phaseAffichee = parType(onglet);

  const estFreelance = role === "freelance";
  const estAnnonceur = role === "annonceur";
  const missionActive = data?.mission_statut === "IN_PROGRESS";
  const retard = cadrageEnRetard(parType("CADRAGE"));
  const demandeEnCours = data?.demande_annulation_en_attente;

  const cadrageBloque =
    phaseCourante?.type === "CADRAGE" &&
    phaseCourante.livrables.some((l) => l.statut === "A_VALIDER" || l.statut === "VALIDE");
  const peutSoumettre = estFreelance && missionActive && !!phaseCourante && !cadrageBloque;

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center rounded-[28px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="rounded-[28px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-6 text-[11px] text-muted-foreground">
        Le suivi de cette mission n'est pas disponible pour le moment.
      </div>
    );
  }

  return (
    <section className="rounded-[28px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-6">
      {/* En-tête */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-heading text-sm font-bold text-brand-ink dark:text-foreground">Suivi du projet</h3>
          <p className="text-[10.5px] text-muted-foreground">
            Chaque livrable est examiné par l'annonceur avant de passer à la suite.
          </p>
        </div>
        {peutSoumettre && (
          <button
            onClick={() => setModale("livrable")}
            className="inline-flex items-center gap-1.5 rounded-xl bg-brand-green hover:bg-brand-green-hover px-3.5 py-2 text-[10.5px] font-bold text-brand-ink transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            {phaseCourante?.type === "CADRAGE" ? "Livrer le cadrage" : "Soumettre un livrable"}
          </button>
        )}
      </div>

      {/* Piste des phases (sert aussi d'onglets) */}
      <div className="mt-5 grid grid-cols-2 gap-2" role="tablist">
        {PHASES.map((p, i) => {
          const phase = parType(p.type);
          const validee = phase?.statut === "VALIDEE";
          const enCours = phase?.statut === "EN_COURS";
          const jours = enCours ? joursRestants(phase?.date_limite ?? null) : null;
          const selection = onglet === p.type;
          return (
            <button
              key={p.type}
              role="tab"
              aria-selected={selection}
              disabled={!phase}
              onClick={() => setOngletChoisi(p.type)}
              className={`relative rounded-2xl border p-3.5 text-left transition-all disabled:cursor-not-allowed ${
                selection
                  ? "border-brand-ink bg-brand-ink text-white dark:border-brand-green"
                  : "border-brand-ink/10 dark:border-border bg-brand-canvas dark:bg-muted/30 text-brand-ink dark:text-foreground hover:border-brand-ink/30"
              } ${!phase ? "opacity-50" : ""}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold ${
                    validee
                      ? "bg-brand-green text-brand-ink"
                      : selection
                        ? "bg-white/15 text-white"
                        : "bg-white dark:bg-card border border-brand-ink/15 dark:border-border"
                  }`}
                >
                  {validee ? <Check className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="text-[12px] font-bold">{p.label}</span>
              </div>
              <p className={`mt-1.5 text-[10px] ${selection ? "text-white/70" : "text-muted-foreground"}`}>
                {validee
                  ? "Validée"
                  : !phase
                    ? "S'ouvre après le cadrage"
                    : jours === null
                      ? p.sousTitre
                      : jours < 0
                        ? `En retard de ${-jours} j · prévu le ${formatDate(phase.date_limite)}`
                        : jours === 0
                          ? "À livrer aujourd'hui"
                          : `${jours} j restants · le ${formatDate(phase.date_limite)}`}
              </p>
              {enCours && (
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-brand-green" aria-label="Phase en cours" />
              )}
            </button>
          );
        })}
      </div>

      {/* Alertes */}
      {demandeEnCours && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl bg-brand-sand/60 dark:bg-muted/50 p-3 text-[10.5px] text-brand-ink dark:text-foreground">
          <Ban className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <p>
            Une demande d'annulation est en cours d'examen par l'administration depuis le{" "}
            {formatDate(demandeEnCours.date_demande)}. La mission continue en attendant sa décision.
          </p>
        </div>
      )}
      {data.mission_statut === "CANCELLED" && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-red-500/10 p-3 text-[10.5px] text-red-700 dark:text-red-300">
          <Ban className="h-3.5 w-3.5 shrink-0" /> Cette mission a été annulée par l'administration.
        </div>
      )}
      {retard && missionActive && (
        <div className="mt-4 rounded-2xl border border-brand-peach bg-brand-peach/25 dark:bg-brand-peach/10 p-3.5">
          <div className="flex items-start gap-2 text-[10.5px] text-brand-ink dark:text-foreground">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              {estAnnonceur
                ? "Le cadrage n'a pas été livré dans le délai prévu. L'administration a été prévenue et va relancer le freelance. Vous pouvez lui laisser plus de temps ou demander l'annulation."
                : "Le délai du cadrage est dépassé. Livrez-le dès que possible : l'annonceur et l'administration ont été prévenus."}
            </p>
          </div>
          {estAnnonceur && (
            <div className="mt-3 flex flex-wrap gap-2 pl-5">
              <button
                onClick={() => setModale("deadline")}
                className="inline-flex items-center gap-1.5 rounded-xl bg-brand-ink px-3 py-1.5 text-[10.5px] font-bold text-white hover:bg-brand-ink/85"
              >
                <CalendarClock className="h-3.5 w-3.5" /> Repousser la deadline
              </button>
              {!demandeEnCours && (
                <button
                  onClick={() => setModale("annulation")}
                  className="rounded-xl border border-brand-ink/20 dark:border-border px-3 py-1.5 text-[10.5px] font-semibold text-brand-ink dark:text-foreground hover:bg-white/60 dark:hover:bg-muted/60"
                >
                  Demander l'annulation
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* Livrables de la phase affichée */}
      <div className="mt-5">
        {!phaseAffichee || phaseAffichee.livrables.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-brand-ink/15 dark:border-border p-6 text-center">
            <p className="text-[11px] font-semibold text-brand-ink dark:text-foreground">
              {onglet === "CADRAGE" ? "Aucun cadrage livré pour l'instant" : "Aucun livrable pour l'instant"}
            </p>
            <p className="mx-auto mt-1 max-w-sm text-[10.5px] text-muted-foreground leading-relaxed">
              {onglet === "CADRAGE"
                ? estFreelance
                  ? "Échangez avec l'annonceur dans la messagerie pour cerner ses attentes, puis livrez votre cadrage ici."
                  : "Le freelance recueille vos attentes via la messagerie avant de livrer son cadrage."
                : estFreelance
                  ? "Soumettez vos livrables au fil de l'eau : maquettes, prototypes, versions intermédiaires."
                  : "Les livrables du freelance apparaîtront ici au fur et à mesure."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {phaseAffichee.livrables.map((l) => (
              <CarteLivrable
                key={l.id}
                livrable={l}
                missionId={missionId}
                peutExaminer={estAnnonceur && missionActive}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Annulation, toujours accessible mais discrète pour l'annonceur */}
      {estAnnonceur && !retard && !demandeEnCours &&
        (data.mission_statut === "IN_PROGRESS" || data.mission_statut === "DELIVERED") && (
          <div className="mt-5 border-t border-brand-ink/6 dark:border-border pt-3 text-right">
            <button
              onClick={() => setModale("annulation")}
              className="text-[10px] font-semibold text-muted-foreground underline-offset-2 hover:underline"
            >
              Demander l'annulation de la mission
            </button>
          </div>
        )}

      {modale === "livrable" && phaseCourante && (
        <ModaleLivrable missionId={missionId} phase={phaseCourante} onFermer={() => setModale(null)} />
      )}
      {modale === "deadline" && <ModaleDeadline missionId={missionId} onFermer={() => setModale(null)} />}
      {modale === "annulation" && <ModaleAnnulation missionId={missionId} onFermer={() => setModale(null)} />}
    </section>
  );
};

// ── Historique ─────────────────────────────────────────────────────────────

export const HistoriqueCard: React.FC<{ missionId: number }> = ({ missionId }) => {
  const { data = [], isLoading } = useQuery({
    queryKey: ["suivi-historique", missionId],
    queryFn: () => getHistoriqueMission(missionId),
    refetchInterval: 15_000,
  });
  const [tout, setTout] = useState(false);
  const lignes = tout ? data : data.slice(0, 6);

  return (
    <div className="rounded-[24px] border border-brand-ink/8 dark:border-border bg-white dark:bg-card p-6">
      <div className="mb-3 flex items-center justify-between border-b border-brand-ink/6 dark:border-border pb-2.5">
        <h3 className="font-heading text-xs font-bold text-brand-ink dark:text-foreground flex items-center gap-1.5">
          <History className="h-3.5 w-3.5 text-brand-violet dark:text-violet-300" /> Historique
        </h3>
        <span className="text-[9.5px] text-muted-foreground">{data.length} événement{data.length > 1 ? "s" : ""}</span>
      </div>
      {isLoading ? (
        <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
      ) : data.length === 0 ? (
        <p className="py-3 text-center text-[10.5px] italic text-muted-foreground">Aucun événement pour le moment.</p>
      ) : (
        <>
          <ol className="relative space-y-3 border-l border-brand-ink/10 dark:border-border pl-4">
            {lignes.map((l) => (
              <li key={l.id} className="relative text-[10.5px]">
                <span
                  className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full border-2 border-white dark:border-card ${
                    l.auteur === null ? "bg-brand-peach" : "bg-brand-ink dark:bg-brand-green"
                  }`}
                />
                <p className="font-semibold text-brand-ink dark:text-foreground leading-tight">{l.action_libelle}</p>
                {l.details && <p className="text-muted-foreground leading-snug">{l.details}</p>}
                <p className="text-[9.5px] text-muted-foreground">
                  {l.auteur_nom} · {formatDateHeure(l.date_action)}
                </p>
              </li>
            ))}
          </ol>
          {data.length > 6 && (
            <button
              onClick={() => setTout((v) => !v)}
              className="mt-3 text-[10px] font-semibold text-brand-violet dark:text-violet-300 hover:underline"
            >
              {tout ? "Réduire" : `Voir les ${data.length - 6} autres`}
            </button>
          )}
        </>
      )}
    </div>
  );
};
