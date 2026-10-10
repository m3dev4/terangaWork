import json
import logging
import httpx
from pydantic import BaseModel, Field
from app.config import settings
from app.schemas import CandidatSchema, ResultatCandidatSchema

logger = logging.getLogger(__name__)


class LLMJustificationItem(BaseModel):
    candidat_id: int
    justification: str


class LLMResponseSchema(BaseModel):
    classement: list[LLMJustificationItem]


def build_llm_prompt(
    contexte: str,
    candidatos: list[CandidatSchema],
    type_matching: str = "candidatures",
) -> str:
    """
    Construit le prompt système / utilisateur pour l'API OpenRouter selon le type de matching et la perspective du destinataire.
    """
    if type_matching == "missions":
        items_text = ""
        for c in candidatos:
            c_techs = ", ".join(c.technologies) if c.technologies else "Non spécifié"
            items_text += (
                f"\n--- MISSION ID: {c.id} ---\n"
                f"Service requis: {', '.join(c.services) or c.service or 'Non spécifié'}\n"
                f"Technologies requises: {c_techs}\n"
                f"Détails de la mission: {c.texte_libre or ''}\n"
            )

        prompt = f"""Tu es un conseiller carrière et expert en matching professionnel pour la plateforme Teranga Work.

PROFIL DU FREELANCE :
{contexte}

LISTE DES MISSIONS DISPONIBLES :
{items_text}

CONSIGNE STRICTE ANTI-HALLUCINATION ET FORMAT :
1. Tu dois reclasser TOUTES les missions fournies ci-dessus de la plus pertinente à la moins pertinente pour ce freelance.
2. Tu dois retourner UNIQUEMENT et STRICTEMENT les missions de la liste (ID exacts). Ne crée AUCUN nouvel ID et n'omets aucun ID.
3. Rédige pour chaque mission une courte justification en français (1 à 2 phrases) formulée pour le freelance, expliquant pourquoi cette mission lui correspond au vu de ses compétences.
4. Réponds UNIQUEMENT sous forme d'un objet JSON valide au format exact suivant, sans texte avant ou après :

{{
  "classement": [
    {{
      "candidat_id": <ID_INTEGER>,
      "justification": "<Courte justification expliquant au freelance pourquoi la mission lui correspond>"
    }}
  ]
}}
"""
        return prompt

    elif type_matching == "proactif":
        items_text = ""
        for c in candidatos:
            c_techs = ", ".join(c.technologies) if c.technologies else "Non spécifié"
            items_text += (
                f"\n--- FREELANCE ID: {c.id} ---\n"
                f"Services: {', '.join(c.services) or c.service or 'Non spécifié'}\n"
                f"Technologies maîtrisées: {c_techs}\n"
                f"Années d'expérience: {c.annees_experience if c.annees_experience is not None else 'Non renseigné'}\n"
                f"Profil Freelance: {c.texte_libre or ''}\n"
            )

        prompt = f"""Tu es un assistant intelligent pour la plateforme Teranga Work, chargé de générer des notifications de recommandation personnalisées pour des freelances suite à la publication d'une nouvelle mission.

DÉTAILS DE LA MISSION PUBLIÉE :
{contexte}

LISTE DES FREELANCES SÉLECTIONNÉS :
{items_text}

CONSIGNE STRICTE ANTI-HALLUCINATION ET PERSPECTIVE :
1. Tu dois reclasser TOUS les freelances fournis ci-dessus du plus pertinent au moins pertinent pour cette mission.
2. Tu dois retourner UNIQUEMENT et STRICTEMENT les freelances de la liste (ID exacts). Ne crée AUCUN nouvel ID et n'omets aucun ID.
3. Rédige pour chaque freelance une courte justification en français (1 à 2 phrases) pour le message de la notification qui lui sera envoyée.
4. IMPORTANT - PERSPECTIVE : La justification est envoyée DIRECTEMENT AU FREELANCE dans sa notification. Elle doit lui expliquer pourquoi CETTE MISSION lui est recommandée au vu de ses compétences et de son profil (ex: "Cette mission vous est recommandée car vos compétences en [Technologies] et votre profil correspondent exactement aux exigences de ce projet."). Ne parle JAMAIS à la 3ème personne ("Le candidat maîtrise...") car le destinataire est le freelance lui-même.
5. Réponds UNIQUEMENT sous forme d'un objet JSON valide au format exact suivant, sans texte avant ou après :

{{
  "classement": [
    {{
      "candidat_id": <ID_INTEGER>,
      "justification": "<Courte justification expliquant au freelance pourquoi cette mission lui est recommandée>"
    }}
  ]
}}
"""
        return prompt

    else:  # "candidatures" (recruteur / annonceur qui évalue des candidats pour sa mission)
        items_text = ""
        for c in candidatos:
            c_techs = ", ".join(c.technologies) if c.technologies else "Non spécifié"
            items_text += (
                f"\n--- CANDIDAT ID: {c.id} ---\n"
                f"Services: {', '.join(c.services) or c.service or 'Non spécifié'}\n"
                f"Technologies: {c_techs}\n"
                f"Années d'expérience: {c.annees_experience if c.annees_experience is not None else 'Non renseigné'}\n"
                f"Texte libre / Motivation: {c.texte_libre or ''}\n"
            )

        prompt = f"""Tu es un expert en recrutement pour la plateforme Teranga Work, chargé d'aider l'annonceur à évaluer les candidats pour sa mission.

CONTEXTE DE LA MISSION :
{contexte}

LISTE DES CANDIDATS SÉLECTIONNÉS :
{items_text}

CONSIGNE STRICTE ANTI-HALLUCINATION ET FORMAT :
1. Tu dois reclasser TOUS les candidats fournis ci-dessus du plus pertinent au moins pertinent pour cette mission.
2. Tu dois retourner UNIQUEMENT et STRICTEMENT les candidats de la liste (ID exacts). Ne crée AUCUN nouvel ID et n'omets aucun ID.
3. Fournis une courte justification explicative en français pour l'annonceur évaluant l'adéquation de chaque candidat (ex: "Le candidat possède une solide maîtrise de...").
4. Réponds UNIQUEMENT sous forme d'un objet JSON valide au format exact suivant, sans texte avant ou après :

{{
  "classement": [
    {{
      "candidat_id": <ID_INTEGER>,
      "justification": "<Courte justification textuelle pour l'annonceur>"
    }}
  ]
}}
"""
        return prompt


async def run_stage_2_llm(
    contexte: str,
    top_candidates_input: list[CandidatSchema],
    stage_1_results: list[ResultatCandidatSchema],
    type_matching: str = "candidatures",
) -> tuple[list[ResultatCandidatSchema], bool]:
    """
    Étage 2 — Appel LLM OpenRouter avec fallback.
    Retourne (liste_resultats_reclassés_ou_stage1, etage_2_reussi).
    """
    if not settings.OPENROUTER_API_KEY:
        logger.warning("Clé API OpenRouter manquante. Utilisation du fallback Étage 1.")
        return stage_1_results, False

    expected_ids = {c.id for c in top_candidates_input}
    candidate_map = {r.candidat_id: r for r in stage_1_results}
    prompt = build_llm_prompt(contexte, top_candidates_input, type_matching=type_matching)

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jefly.com",
        "X-Title": "Teranga Work Matching Intelligent",
    }

    payload = {
        "model": settings.OPENROUTER_MODEL,
        "messages": [
            {
                "role": "user",
                "content": prompt,
            }
        ],
        "temperature": 0.2,
    }

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                settings.OPENROUTER_BASE_URL,
                headers=headers,
                json=payload,
            )

        if response.status_code != 200:
            logger.error(
                f"Erreur API OpenRouter (HTTP {response.status_code}): {response.text}"
            )
            return stage_1_results, False

        data = response.json()
        print(data)
        raw_content = data["choices"][0]["message"]["content"]
        print(raw_content)
        # Nettoyage d'éventuelles balises markdown ```json ... ```
        cleaned_content = raw_content.strip()
        if cleaned_content.startswith("```"):
            lines = cleaned_content.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines and lines[-1].startswith("```"):
                lines = lines[:-1]
            cleaned_content = "\n".join(lines).strip()

        parsed_json = json.loads(cleaned_content)
        validated_llm = LLMResponseSchema.model_validate(parsed_json)

        # Validation Anti-Hallucination
        returned_ids = {item.candidat_id for item in validated_llm.classement}

        if returned_ids != expected_ids:
            logger.error(
                f"Contrainte anti-hallucination violée par le LLM. IDs attendus: {expected_ids}, reçus: {returned_ids}"
            )
            return stage_1_results, False

        # Reclassement réussi !
        final_results: list[ResultatCandidatSchema] = []
        for item in validated_llm.classement:
            original_result = candidate_map[item.candidat_id]
            final_results.append(
                ResultatCandidatSchema(
                    candidat_id=original_result.candidat_id,
                    score=original_result.score,
                    score_technologies=original_result.score_technologies,
                    score_service=original_result.score_service,
                    score_experience=original_result.score_experience,
                    justification_ia=item.justification,
                )
            )

        return final_results, True

    except Exception as e:
        logger.error(f"Échec de l'étage 2 LLM (Fallback activé): {e}", exc_info=True)
        return stage_1_results, False
