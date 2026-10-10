import { instance } from "./axios";

// ── Types : miroir de l'app Django `suivi` ─────────────────────────────────

export type TypePhase = "CADRAGE" | "DEVELOPPEMENT";
export type StatutPhase = "EN_COURS" | "VALIDEE";
export type StatutLivrable = "A_VALIDER" | "VALIDE" | "INVALIDE";
export type TypeCommentaire = "TEXTE" | "VOCAL";
export type StatutDemandeAnnulation = "EN_ATTENTE" | "ACCEPTEE" | "REFUSEE";

export interface CommentaireLivrable {
  id: number;
  type: TypeCommentaire;
  texte: string;
  fichier_vocal: string | null;
  auteur: number;
  auteur_nom: string;
  date_creation: string;
}

export interface Livrable {
  id: number;
  phase: number;
  phase_type: TypePhase;
  titre: string;
  lien: string;
  description: string;
  statut: StatutLivrable;
  date_soumission: string;
  date_decision: string | null;
  commentaires: CommentaireLivrable[];
}

export interface Phase {
  id: number;
  type: TypePhase;
  statut: StatutPhase;
  date_ouverture: string;
  date_limite: string | null;
  livrables: Livrable[];
}

export interface DemandeAnnulation {
  id: number;
  mission: number;
  mission_titre: string;
  statut: StatutDemandeAnnulation;
  date_demande: string;
  decide_par: number | null;
  date_decision: string | null;
}

export interface SuiviMission {
  mission: number;
  mission_statut: string;
  phases: Phase[];
  demande_annulation_en_attente: DemandeAnnulation | null;
}

export interface LigneHistorique {
  id: number;
  action: string;
  action_libelle: string;
  details: string;
  auteur: number | null;
  auteur_nom: string;
  date_action: string;
}

export interface SoumettreLivrablePayload {
  titre: string;
  lien: string;
  description?: string;
}

export interface DecisionPayload {
  texte?: string;
  fichierVocal?: Blob | null;
}

// ── Appels ─────────────────────────────────────────────────────────────────

export const getSuiviMission = async (missionId: number): Promise<SuiviMission> => {
  const { data } = await instance.get<SuiviMission>(`suivi/missions/${missionId}/`);
  return data;
};

export const getHistoriqueMission = async (
  missionId: number
): Promise<LigneHistorique[]> => {
  const { data } = await instance.get<LigneHistorique[]>(
    `suivi/missions/${missionId}/historique/`
  );
  return data;
};

export const soumettreLivrable = async (
  missionId: number,
  payload: SoumettreLivrablePayload
): Promise<Livrable> => {
  const { data } = await instance.post<Livrable>(
    `suivi/missions/${missionId}/livrables/`,
    payload
  );
  return data;
};

const decisionFormData = ({ texte, fichierVocal }: DecisionPayload) => {
  const form = new FormData();
  if (texte?.trim()) form.append("texte", texte.trim());
  if (fichierVocal) {
    const ext = fichierVocal.type.includes("ogg") ? "ogg" : "webm";
    form.append("fichier_vocal", fichierVocal, `commentaire.${ext}`);
  }
  return form;
};

const envoyerDecision = async (
  livrableId: number,
  action: "valider" | "invalider",
  payload: DecisionPayload
): Promise<Livrable> => {
  const { data } = await instance.post<Livrable>(
    `suivi/livrables/${livrableId}/${action}/`,
    decisionFormData(payload),
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const validerLivrable = (livrableId: number, payload: DecisionPayload) =>
  envoyerDecision(livrableId, "valider", payload);

export const invaliderLivrable = (livrableId: number, payload: DecisionPayload) =>
  envoyerDecision(livrableId, "invalider", payload);

export const repousserDeadline = async (missionId: number, dateLimite: string) => {
  const { data } = await instance.post<Phase>(
    `suivi/missions/${missionId}/repousser-deadline/`,
    { date_limite: dateLimite }
  );
  return data;
};

export const demanderAnnulation = async (missionId: number) => {
  const { data } = await instance.post<DemandeAnnulation>(
    `suivi/missions/${missionId}/demander-annulation/`
  );
  return data;
};

// ── Admin ──────────────────────────────────────────────────────────────────

export const getDemandesAnnulation = async (
  statut?: StatutDemandeAnnulation
): Promise<DemandeAnnulation[]> => {
  const { data } = await instance.get<DemandeAnnulation[]>("suivi/demandes-annulation/", {
    params: statut ? { statut } : undefined,
  });
  return data;
};

export const deciderAnnulation = async (
  demandeId: number,
  decision: "accepter" | "refuser"
) => {
  const { data } = await instance.post<DemandeAnnulation>(
    `suivi/demandes-annulation/${demandeId}/decider/`,
    { decision }
  );
  return data;
};

export const relancer = async (
  missionId: number,
  destinataire: "freelance" | "annonceur",
  message?: string
) => {
  const { data } = await instance.post<{ message: string }>(
    `suivi/missions/${missionId}/relancer/`,
    { destinataire, message }
  );
  return data;
};

/** Message d'erreur lisible depuis une réponse DRF. */
export const messageErreur = (err: unknown): string => {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    const d = data as Record<string, unknown>;
    if (typeof d.error === "string") return d.error;
    if (typeof d.detail === "string") return d.detail;
    const premier = Object.values(d)[0];
    if (Array.isArray(premier) && typeof premier[0] === "string") return premier[0];
  }
  return "Une erreur est survenue. Réessayez.";
};
