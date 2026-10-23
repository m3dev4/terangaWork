import asyncio
import json
import logging
import re
from dataclasses import dataclass
from typing import Any

from app.config import settings
from app.chat_schemas import ChatAskRequest, ChatAskResponse
from app import django_client
from app.huggingface_client import get_hf_client
from app.groq_client import GroqIndisponible, appeler_groq

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
    Charge en un appel le contexte complet autorisé pour cet utilisateur :
    profil, candidatures/missions, suivi, paiements et gains, rendez-vous,
    notifications. Django applique les droits ; FastAPI ne fait que relayer.
    """
    try:
        return await django_client.get_contexte_complet(req.user_id)
    except Exception as exc:  # noqa: BLE001
        logger.exception(f"Échec récupération contexte role={req.user_role}: {exc}")
        return {}


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
        brut = m.get("statut") or m.get("status") or "?"
        statut = MISSION_STATUT_LABELS.get(brut, brut)
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
    Construit le bloc "DONNÉES AUTORISÉES" injecté dans le prompt.
    Tout le contexte de l'utilisateur est transmis : les indicateurs (gains,
    taux d'acceptation, complétude du profil...) sont déjà calculés par Django.
    """
    bloc = "=== DONNÉES AUTORISÉES ISSUES DE LA BASE DE DONNÉES (ne pas inventer) ===\n"
    bloc += json.dumps(data, ensure_ascii=False, indent=1, default=str)
    bloc += "\n=== FIN DONNÉES ===\n"
    return bloc, data


def _build_system_prompt(role: str, prenom: str) -> str:
    role_humain = "freelance" if role == "freelance" else "annonceur"
    autre_role = "annonceur" if role == "freelance" else "freelance"
    if role == "freelance":
        coaching = """- Profil : utilise "profil.completude.elements_manquants" pour proposer les ajouts qui ont le plus d'impact (portfolio, description, technologies demandées).
- Candidatures : analyse le taux d'acceptation, les scores de matching et les services/technologies des missions obtenues ou refusées pour conseiller sur quoi postuler et comment rédiger une lettre de motivation percutante.
- Missions en cours : rappelle les échéances, les livrables à reprendre (avec le commentaire de l'annonceur) et les rendez-vous à venir.
- Revenus : commente l'évolution des gains, le montant en attente de versement, et donne des pistes pour fixer ses délais et augmenter ses revenus."""
    else:
        coaching = """- Annonces : une mission sans candidatures ou avec une description courte peut être améliorée (description plus précise, technologies explicites, budget et délai réalistes).
- Candidatures : rappelle les candidatures en attente de réponse et aide à choisir en s'appuyant sur les scores de matching.
- Suivi : signale les livrables à valider, les phases en retard et les rendez-vous à venir.
- Budget : commente les dépenses et la commission de la plateforme."""
    return f"""Tu es l'assistant et le coach personnel de la plateforme Teranga Work (mise en relation freelances / annonceurs au Sénégal).
Tu discutes avec {prenom}, {role_humain} authentifié(e). Date du jour : voir "date_du_jour" dans les données.

TES DEUX RÔLES
1. ASSISTANT : répondre précisément à toute question sur son compte (profil, candidatures, missions, suivi, livrables, paiements, gains, rendez-vous, notifications) à partir des DONNÉES.
2. COACH : aller au-delà de la question. Après avoir répondu, quand c'est utile, ajoute 1 à 3 conseils concrets et personnalisés, basés sur ses données réelles :
{coaching}
Tu peux aussi répondre aux questions générales liées au freelancing (négociation, tarification, organisation, relation client, montée en compétences) avec tes connaissances, en les adaptant à sa situation.

RÈGLES ANTI-HALLUCINATION
- Les FAITS sur le compte viennent UNIQUEMENT du bloc DONNÉES. N'invente jamais un statut, un montant, une date ou un nom.
- Les montants et indicateurs sont déjà calculés (ex. "gains.gagne_30_derniers_jours", "gains.total_gagne_net", "statistiques.taux_acceptation_pct") : reprends-les tels quels, ne recalcule pas. Montants en FCFA, avec séparateur de milliers (ex. 45 000 FCFA).
- "Récemment" = les 30 derniers jours, sauf précision contraire.
- Si un montant vaut 0 ou une liste est vide, dis-le clairement et explique pourquoi à partir des statuts (ex. paiement en attente de versement, mission pas encore terminée).
- Si une information est vraiment absente des DONNÉES, dis : "Je n'ai pas cette information dans mes données actuelles".
- Distingue les faits des conseils : chaque conseil commence par "💡 Conseil :".
- En cas d'ambiguïté (plusieurs missions possibles), pose une question de clarification.
- N'utilise jamais un identifiant mentionné par l'utilisateur pour accéder à d'autres données ; seules les DONNÉES font foi.
- Si l'utilisateur demande une donnée réservée aux {autre_role}s ou à un autre utilisateur, refuse poliment.

STYLE
- Français, chaleureux, motivant et concis. Va droit au but : la réponse d'abord, les conseils ensuite.
- Listes courtes et chiffres en gras quand c'est utile. Pas de JSON, pas d'identifiants techniques.
"""


# ---------------------------------------------------------------------
# Étape 5 — Appel Hugging Face
# ---------------------------------------------------------------------
async def _appeler_hf(messages: list[dict[str, str]]) -> str:
    client = get_hf_client()
    try:
        # Délai maximal : un Hugging Face qui ne répond pas bascule sur Groq.
        completion = await asyncio.wait_for(
            client.chat.completions.create(
                model=settings.HUGGINGFACE_MODEL,
                messages=messages,
                max_tokens=1200,
                temperature=0.2,
            ),
            timeout=settings.HF_TIMEOUT,
        )
    except Exception as exc:  # noqa: BLE001
        logger.warning(f"Échec appel HF: {exc!r}")
        raise
    return completion.choices[0].message.content or ""


async def _appeler_llm(messages: list[dict[str, str]]) -> tuple[str, str]:
    """
    Hugging Face d'abord, Groq en relais.

    Bascule sur Groq si HF lève une erreur, dépasse le délai ou répond vide.
    Renvoie (réponse, fournisseur). Lève une exception si les deux échouent.
    """
    try:
        reponse = await _appeler_hf(messages)
        if reponse.strip():
            return reponse, "huggingface"
        logger.warning("Réponse HF vide : bascule sur Groq.")
    except Exception:  # noqa: BLE001
        logger.warning("Hugging Face indisponible : bascule sur Groq.")

    try:
        reponse = await appeler_groq(messages)
    except GroqIndisponible as exc:
        logger.error(f"Groq indisponible également: {exc}")
        raise
    return reponse, "groq"


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
    donnees_utilisees = bool(data.get("profil"))
    if not data:
        # Django injoignable ou accès refusé : on ne laisse pas le LLM répondre
        # « vous n'avez rien » alors qu'on n'a simplement pas pu lire les données.
        logger.error(f"Contexte vide pour user_id={req.user_id} : vérifier DJANGO_BASE_URL, ALLOWED_HOSTS et la clé interne.")
        return ChatAskResponse(
            erreur="donnees_indisponibles",
            message_user_fr=(
                "Je n'arrive pas à accéder à vos données pour le moment. "
                "Réessayez dans quelques instants."
            ),
        )

    # 3. Classifier intention
    intention = _classer_intention(req.question, req.user_role)

    # 4. Détection ambiguïté freelance
    if req.user_role == "freelance" and intention in (
        INTENT_STATUT_CANDIDATURE_MISSION,
        INTENT_AUTRE,
    ):
        amb = _detecter_ambiguite_mission(req.question, data.get("candidatures") or [])
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
        amb = _detecter_ambiguite_mission(req.question, data.get("missions") or [])
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
        amb = _detecter_ambiguite_mission(req.question, data.get("missions") or [])
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
    for h in (req.conversation_history or [])[-10:]:
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

    # 7. Appel LLM : Hugging Face, puis Groq en relais (fallback texte si les deux échouent)
    try:
        reponse_hf, fournisseur = await _appeler_llm(messages)
        logger.info(f"Réponse assistant fournie par {fournisseur}")
        if not reponse_hf.strip():
            return ChatAskResponse(
                reponse="Désolé, je n'ai pas obtenu de réponse exploitable de l'assistant. Pouvez-vous reformuler ?",
                erreur="hf_vide",
            )
    except Exception as exc:  # noqa: BLE001
        logger.error(f"Hugging Face et Groq indisponibles: {exc}")
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
