import logging
from app.schemas import MatchingRequestSchema, MatchingResponseSchema
from app.scoring import compute_stage_1
from app.llm_client import run_stage_2_llm

logger = logging.getLogger(__name__)


async def process_matching_request(
    request: MatchingRequestSchema,
) -> MatchingResponseSchema:
    """
    Orchestre les deux étages du pipeline de matching intelligent :
    1. Étage 1 : Scoring déterministe & sélection Top N.
    2. Étage 2 : Raisonnement LLM via OpenRouter pour reclasser le Top N avec justification (avec fallback).
    """
    if not request.candidats:
        return MatchingResponseSchema(resultats=[], etage_2_reussi=True)

    # Étage 1
    stage_1_results = compute_stage_1(request)
    if request.scoring_only or not stage_1_results:
        return MatchingResponseSchema(resultats=stage_1_results, etage_2_reussi=False)

    # Filtrer les candidats originaux correspondant au Top N retenu par l'Étage 1
    top_ids = {r.candidat_id for r in stage_1_results}
    top_candidates_input = [c for c in request.candidats if c.id in top_ids]

    # Étage 2
    target_techs = ", ".join(request.technologies) if request.technologies else "Non spécifié"
    target_service = request.service or "Non spécifié"

    if request.type_matching == "missions":
        contexte_llm = (
            f"{request.contexte}\n"
            f"Service cible : {target_service}\n"
            f"Technologies du freelance : {target_techs}\n"
            "N'attribue aucune compétence non déclarée au freelance. "
            "Les technologies d'une mission sont des exigences, pas des compétences du freelance."
        )
    elif request.type_matching == "proactif":
        contexte_llm = (
            f"{request.contexte}\n"
            f"Service de la mission : {target_service}\n"
            f"Technologies requises par la mission : {target_techs}\n"
            "N'attribue aucune compétence non déclarée au freelance. "
            "Les technologies de la mission sont des exigences pour le projet."
        )
    else:  # "candidatures"
        contexte_llm = (
            f"{request.contexte}\n"
            f"Service cible : {target_service}\n"
            f"Technologies requises par la mission : {target_techs}\n"
            "N'attribue aucune compétence non déclarée au freelance. "
            "Les technologies d'une mission sont des exigences, pas des compétences du freelance."
        )

    final_results, etage_2_reussi = await run_stage_2_llm(
        contexte=contexte_llm,
        top_candidates_input=top_candidates_input,
        stage_1_results=stage_1_results,
        type_matching=request.type_matching,
    )

    return MatchingResponseSchema(
        resultats=final_results,
        etage_2_reussi=etage_2_reussi,
    )
