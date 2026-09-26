from fastapi import APIRouter, Depends, status
from app.schemas import MatchingRequestSchema, MatchingResponseSchema
from app.security import verify_api_key
from app.service import process_matching_request

router = APIRouter(prefix="/matching", tags=["Matching"])


@router.post(
    "/score",
    response_model=MatchingResponseSchema,
    status_code=status.HTTP_200_OK,
    summary="Calcul du score et classement de matching intelligent à 2 étages",
)
async def score_matching(
    request: MatchingRequestSchema,
    api_key: str = Depends(verify_api_key),
) -> MatchingResponseSchema:
    """
    Endpoint interne de matching :
    - Étage 1 : Scoring déterministe (Tech 45%, Service 45%, Expérience 10%)
    - Étage 2 : Reclassement LLM + Justifications avec fallback automatique.
    """
    return await process_matching_request(request)
