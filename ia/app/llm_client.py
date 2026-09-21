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


def build_llm_prompt(contexte: str, candidatos: list[CandidatSchema]) -> str:
    """
    Construit le prompt système / utilisateur pour l'API OpenRouter.
    """
    candidats_text = ""
    for c in candidatos:
        candidats_text += (
            f"\n--- CANDIDAT ID: {c.id} ---\n"
            f"Service: {c.service}\n"
            f"Technologies: {', '.join(c.technologies)}\n"
            f"Années d'expérience: {c.annees_experience if c.annees_experience is not None else 'Non renseigné'}\n"
            f"Texte libre / Motivation: {c.texte_libre}\n"
        )

    prompt = f"""Tu es un expert en recrutement et en matching d'opportunités professionnelles pour la plateforme Jëfly.

CONTEXTE DE LA DEMANDE (Mission ou Profil Freelance) :
{contexte}

LISTE DES CANDIDATS SÉLECTIONNÉS :
{candidats_text}

CONSIGNE STRICTE ANTI-HALLUCINATION :
1. Tu dois reclasser TOUS les candidats fournis ci-dessus du plus pertinent au moins pertinent.
2. Tu dois retourner UNIQUEMENT et STRICTEMENT les candidats de la liste (ID exacts). Ne crée AUCUN nouvel ID et n'omets aucun ID.
3. Fournis une courte justification explicative pour chaque candidat en français.
4. Réponds UNIQUEMENT sous forme d'un objet JSON valide au format exact suivant, sans texte avant ou après :

{{
  "classement": [
    {{
      "candidat_id": <ID_INTEGER>,
      "justification": "<Courte justification textuelle>"
    }}
  ]
}}
"""
    return prompt


async def run_stage_2_llm(
    contexte: str,
    top_candidates_input: list[CandidatSchema],
    stage_1_results: list[ResultatCandidatSchema],
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
    prompt = build_llm_prompt(contexte, top_candidates_input)

    headers = {
        "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
        "Content-Type": "application/json",
        "HTTP-Referer": "https://jefly.com",
        "X-Title": "Jefly Matching Intelligent",
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
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=settings.OPENROUTER_TIMEOUT) as client:
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
        raw_content = data["choices"][0]["message"]["content"]
        
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
