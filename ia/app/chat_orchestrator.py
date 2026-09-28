import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from app.config import settings
from app.chat_schemas import ChatAskRequest, ChatAskResponse
from app import django_client
from app.huggingface_client import get_hf_client

logger = logging.getLogger(__name__)

# Intents que l'on sait traiter (valeurs indicative, classification libre du LLM possible)
INTENT_LISTE_CANDIDATURES = "liste_candidatures"
INTENT_STATUT_CANDIDATURE_MISSION = "statut_candidature_mission"
INTENT_MISSIONS_ACCEPTEES = "missions_acceptees"
INTENT_CONSEILS_PROFIL = "conseils_profil"
INTENT_LISTE_MISSIONS_ANNONCEUR = "liste_missions_annonceur"
INTENT_CANDIDATURES_MISSION = "candidatures_mission"
INTENT_RECOMMANDATIONS_MISSION = "recommandations_mission"
INTENT_AUTRE = "autre"


STATUT_LABELS = {
    "PENDING": "En attente de réponse de l'annonceur",
    "ACCEPTED": "Acceptée 🎉 — la mission vous a été confiée",
    "REJECTED": "Refusée — l'annonceur a choisi un autre candidat",
}

MISSION_STATUT_LABELS = {
    "PENDING_MODERATION": "En attente de modération",
    "OPEN": "Ouverte aux candidatures",
    "IN_PROGRESS": "En cours de développement",
    "DELIVERED": "Livrée, en attente de validation",
    "COMPLETED": "Terminée et validée",
    "CLOSED": "Fermée",
    "REJECTED": "Refusée à la modération",
}


@dataclass
class AmbiguiteResult:
    detectee: bool
    missions_trouvees: list[dict[str, Any]]
    pattern: str | None = None


# ---------------------------------------------------------------------
# Étape 1 — Récupération des données autorisées (par rôle)
# ---------------------------------------------------------------------
async def _fetch_role_data(
    req: ChatAskRequest,
) -> dict[str, Any]:
    """
    Charge toutes les données autorisées pour ce rôle.
    Rien n'est filtre ici côté FastAPI : on laisse Django gérer les droits,
    on ne fait que rapatrier ce qu'il nous renvoie.
    """
    data: dict[str, Any] = {
        "propositions": [],
        "missions_acceptes": [],
        "profil": None,
        "missions_annonceur": [],
    }

    try:
        if req.user_role == "freelance":
            data["propositions"] = await django_client.get_freelance_propositions(req.user_id)
            data["missions_acceptes"] = await django_client.get_freelance_missions_acceptees(req.user_id)
            data["profil"] = await django_client.get_freelance_profil(req.user_id)
        elif req.user_role == "annonceur":
            data["missions_annonceur"] = await django_client.get_annonceur_missions(req.user_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception(f"Échec récupération données role={req.user_role}: {exc}")
    return data


# ---------------------------------------------------------------------
# Étape 2 — Détection d'ambiguïté sur les missions
# ---------------------------------------------------------------------
def _detecter_ambiguite_mission(
    question: str,
    propositions_ou_missions: list[dict[str, Any]],
) -> AmbiguiteResult:
    """
    Retourne la liste des missions correspondant à la question.
    Si >= 2 correspondent, il y a ambiguïté et on demande une précision.

    On match par tokens simple (lower, tokens alphanumériques, 3+ lettres) présents
    dans le titre de mission.
    """
    q_tokens = {
        t.lower()
        for t in re.findall(r"[A-Za-zÀ-ÿ0-9_]{3,}", question or "")
    }
    matches: list[dict[str, Any]] = []
    for item in propositions_ou_missions:
        mission = item.get("mission") or item  # accepte PropositionFreelanceSerializer (mission imbriquée) ou MissionSerializer
        titre = (mission.get("title") or "").lower()
        if not titre:
            continue
        titre_tokens = set(re.findall(r"[a-zà-ÿ0-9_]{3,}", titre))
        # Au moins DEUX tokens communs → match
        overlap = q_tokens & titre_tokens
        if len(overlap) >= 2:
            matches.append(item)
    # Ambiguïté si 2+ matchs. Si aucun match, pas d'ambiguïté mais il faudra le signaler via LLM.
    return AmbiguiteResult(
        detectee=len(matches) >= 2,
        missions_trouvees=matches,
    )


def _formater_requete_precision(matches: list[dict[str, Any]]) -> str:
    lines = ["J'ai identifié plusieurs missions correspondant à votre demande."]
    for idx, item in enumerate(matches, start=1):
        m = item.get("mission") or item
        mid = m.get("id")
        titre = m.get("title") or f"Mission #{mid}"
        statut = MISSION_STATUT_LABELS.get(m.get("statut") or m.get("status"), m.get("status") or "?")
        lines.append(f"  {idx}. Mission #{mid} — {titre}  (statut: {statut})")
    lines.append("Merci de préciser l'identifiant ou le numéro de la mission qui vous intéresse.")
    return "\n".join(lines)


# ---------------------------------------------------------------------
# Étape 3 — Classification d'intention simple (règles + fallback)
# ---------------------------------------------------------------------
_KEYWORDS = {
    INTENT_LISTE_CANDIDATURES: [
        "mes candidatures", "liste candidatures", "mes propositions",
        "où en sont mes candidatures", "combien de candidatures",
    ],
    INTENT_STATUT_CANDIDATURE_MISSION: [
        "où en est ma candidature", "statut de ma candidature",
        "ma candidature à la mission", "proposition pour la mission",
    ],
    INTENT_MISSIONS_ACCEPTEES: [
        "mes missions", "missions acceptées", "missions en cours",
        "mes projets", "mes travaux",
    ],
    INTENT_CONSEILS_PROFIL: [
        "conseil", "améliorer mon profil", "comment optimiser",
        "coaching", "que puis-je faire pour",
    ],
    INTENT_LISTE_MISSIONS_ANNONCEUR: [
        "mes missions", "mes annonces", "mes projets", "liste missions",
    ],
    INTENT_CANDIDATURES_MISSION: [
        "candidatures reçues", "candidats pour", "combien de candidatures",
        "propositions pour la mission",
    ],
    INTENT_RECOMMANDATIONS_MISSION: [
        "meilleurs candidats", "recommandation", "quel candidat choisir",
        "matching pour la mission", "classement candidats",
    ],
}


def _classer_intention(question: str, role: str) -> str:
    q = (question or "").lower()
    pool = [
        INTENT_LISTE_CANDIDATURES,
        INTENT_STATUT_CANDIDATURE_MISSION,
        INTENT_MISSIONS_ACCEPTEES,
        INTENT_CONSEILS_PROFIL,
    ] if role == "freelance" else [
        INTENT_LISTE_MISSIONS_ANNONCEUR,
        INTENT_CANDIDATURES_MISSION,
        INTENT_RECOMMANDATIONS_MISSION,
    ]
    for intent in pool:
        for kw in _KEYWORDS.get(intent, []):
            if kw.lower() in q:
                return intent
    return INTENT_AUTRE


# ---------------------------------------------------------------------
# Étape 4 — Construire le prompt système + user avec données
# ---------------------------------------------------------------------
def _construire_contexte_donnees(role: str, data: dict[str, Any], question: str, intention: str) -> tuple[str, dict[str, Any]]:
    """
    Construit le bloc texte "DONNÉES AUTORISÉES" injecté dans le prompt.
    Retourne (bloc_texte, extrait_pertinent).
    """
    # Sélection data: on filtre ce qui est pertinent selon l'intention pour limiter tokens
    pertinent: dict[str, Any] = {}
    if role == "freelance":
        pertinent["profil"] = data.get("profil")
        if intention in (INTENT_LISTE_CANDIDATURES, INTENT_STATUT_CANDIDATURE_MISSION, INTENT_AUTRE):
            pertinent["candidatures"] = data.get("propositions", [])
        if intention in (INTENT_MISSIONS_ACCEPTEES, INTENT_AUTRE):
            pertinent["missions_acceptes"] = data.get("missions_acceptes", [])
    else:  # annonceur
        pertinent["missions"] = data.get("missions_annonceur", [])

    bloc = "=== DONNÉES AUTORISÉES ISSUES DE LA BASE DE DONNÉES (ne pas inventer) ===\n"
    bloc += json.dumps(pertinent, ensure_ascii=False, indent=2, default=str)
    bloc += "\n=== FIN DONNÉES ===\n"
    return bloc, pertinent


def _build_system_prompt(role: str, prenom: str) -> str:
    role_humain = "freelance" if role == "freelance" else "annonceur"
    autre_role = "annonceur" if role == "freelance" else "freelance"
    return f"""Tu es l'assistant conversationnel officiel de la plateforme Jëfly, spécialisé dans l'accompagnement des freelances et des annonceurs.

Tu discutes actuellement avec {prenom}, un {role_humain} authentifié.

RÈGLES STRICTES ANTI-HALLUCINATION — À RESPECTER EN TOUTE CIRCONSTANCE :
1. Tu ne peux utiliser QUE les données fournies dans le bloc "DONNÉES AUTORISÉES ISSUES DE LA BASE DE DONNÉES". Tu n'as accès à aucune autre donnée.
2. Si une information est absente du bloc DONNÉES, tu dois répondre explicitement : "Je n'ai pas cette information dans mes données actuelles". Ne jamais inventer de statut, de chiffre, de date de réponse, de raison de refus ou de justification non fournie.
3. Pour chaque fait énoncé (statut d'une candidature, budget d'une mission, nombre de candidatures, etc.), tu dois implicitement t'appuyer sur les données. Si tu as le moindre doute, refuse d'affirmer un fait et indique l'absence de donnée.
4. Distingue clairement LES FAITS (données objectives) et LES CONSEILS (suggestions) :
   - Un fait commence par le contexte ("Selon mes données...", "Votre candidature à la mission X est...").
   - Un conseil est explicitement préfacé par "💡 Conseil :".
5. Si tu détectes une ambiguïté non résolue (ex: mission impossible à identifier clairement), pose une question de clarification au lieu de deviner.
6. Tu ne dois JAMAIS révéler ou utiliser un user_id, un rôle ou une mission_id simplement mentionnés dans la question utilisateur précédente. Les seuls user_id/rôle/mission_id valides sont ceux de la payload d'authentification ou ceux explicitement présents dans DONNÉES AUTORISÉES.
7. Réponds toujours en français, de manière claire, chaleureuse et concise.
8. Si l'utilisateur te demande une donnée réservée aux {autre_role}s, refuse poliment : "En tant que {role_humain}, vous n'avez pas accès à cette information."
"""


# ---------------------------------------------------------------------
# Étape 5 — Appel Hugging Face
# ---------------------------------------------------------------------
async def _appeler_hf(messages: list[dict[str, str]]) -> str:
    client = get_hf_client()
    try:
        completion = await client.chat.completions.create(
            model=settings.HUGGINGFACE_MODEL,
            messages=messages,
            max_tokens=800,
            temperature=0.2,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception(f"Échec appel HF: {exc}")
        raise
    return completion.choices[0].message.content or ""


# ---------------------------------------------------------------------
# Orchestrateur principal
# ---------------------------------------------------------------------
async def orchestrate_chat(req: ChatAskRequest) -> ChatAskResponse:
    # 1. Validation rôle
    if req.user_role not in ("freelance", "annonceur"):
        return ChatAskResponse(
            reponse="Je ne peux pas traiter votre demande car votre rôle utilisateur n'est pas reconnu.",
            erreur="role_inconnu",
        )

    # 2. Fetch données autorisées
    data = await _fetch_role_data(req)
    donnees_utilisees = bool(
        data.get("propositions")
        or data.get("missions_acceptes")
        or data.get("missions_annonceur")
        or data.get("profil")
    )

    # 3. Classifier intention
    intention = _classer_intention(req.question, req.user_role)

    # 4. Détection ambiguïté freelance
    if req.user_role == "freelance" and intention in (
        INTENT_STATUT_CANDIDATURE_MISSION,
        INTENT_AUTRE,
    ):
        amb = _detecter_ambiguite_mission(req.question, data.get("propositions") or [])
        if amb.detectee:
            return ChatAskResponse(
                reponse=_formater_requete_precision(amb.missions_trouvees),
                precision_demandee="plusieurs_missions_correspondent",
                ambiguite_detectee=True,
                donnees_utilisees=True,
            )
    # Ambiguïté annonceur (plusieurs missions)
    if req.user_role == "annonceur" and intention in (
        INTENT_CANDIDATURES_MISSION,
        INTENT_RECOMMANDATIONS_MISSION,
    ):
        amb = _detecter_ambiguite_mission(req.question, data.get("missions_annonceur") or [])
        if amb.detectee:
            return ChatAskResponse(
                reponse=_formater_requete_precision(amb.missions_trouvees),
                precision_demandee="plusieurs_missions_correspondent",
                ambiguite_detectee=True,
                donnees_utilisees=True,
            )

    # 5. Appel LLM structuré si intention annonceur nécessite données complémentaires
    if req.user_role == "annonceur" and (
        intention in (INTENT_CANDIDATURES_MISSION, INTENT_RECOMMANDATIONS_MISSION)
    ):
        # Chercher la mission concernée dans missions_annonceur
        amb = _detecter_ambiguite_mission(req.question, data.get("missions_annonceur") or [])
        if not amb.detectee and amb.missions_trouvees:
            mission = amb.missions_trouvees[0]
            mid = mission.get("id")
            try:
                if mid and intention == INTENT_CANDIDATURES_MISSION:
                    data["candidatures_mission"] = await django_client.get_annonceur_mission_candidatures(req.user_id, mid)
                elif mid and intention == INTENT_RECOMMANDATIONS_MISSION:
                    data["recommandations_mission"] = await django_client.get_annonceur_mission_recommandations(req.user_id, mid)
                    donnees_utilisees = True
            except Exception as exc:  # noqa: BLE001
                logger.exception(f"Échec fetch détails annonceur mission {mid}: {exc}")

    # 6. Construction prompt
    contexte, _ = _construire_contexte_donnees(req.user_role, data, req.question, intention)
    system_prompt = _build_system_prompt(req.user_role, req.user_prenom)
    historique_openai = []
    for h in (req.conversation_history or [])[-8:]:
        role_oai = "user" if h.role == "utilisateur" else "assistant"
        historique_openai.append({"role": role_oai, "content": h.contenu})

    user_prompt = f"""{contexte}

Question de l'utilisateur :
{req.question}
"""

    messages = [
        {"role": "system", "content": system_prompt},
        *historique_openai,
        {"role": "user", "content": user_prompt},
    ]

    # 7. Appel HF (avec fallback texte si indisponible)
    try:
        reponse_hf = await _appeler_hf(messages)
        if not reponse_hf.strip():
            return ChatAskResponse(
                reponse="Désolé, je n'ai pas obtenu de réponse exploitable de l'assistant. Pouvez-vous reformuler ?",
                erreur="hf_vide",
            )
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Hugging Face indisponible: {exc}")
        return ChatAskResponse(
            erreur="hf_indisponible",
            message_user_fr=(
                "L'assistant est temporairement indisponible (service IA en maintenance). "
                "Veuillez réessayer dans quelques instants."
            ),
        )

    return ChatAskResponse(
        reponse=reponse_hf,
        precision_demandee=None,
        ambiguite_detectee=False,
        donnees_utilisees=donnees_utilisees,
    )
