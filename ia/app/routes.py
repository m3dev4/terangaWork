from fastapi import APIRouter, Depends, status
from app.schemas import MatchingRequestSchema, MatchingResponseSchema
from app.chat_schemas import ChatAskRequest, ChatAskResponse
from app.security import verify_api_key
from app.service import process_matching_request
from app.chat_orchestrator import orchestrate_chat

router = APIRouter()

# ============ MATCHING INTELLIGENT ============
_matching_router = APIRouter(prefix="/matching", tags=["Matching"])


@_matching_router.post(
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


# ============ ASSISTANT CONVERSATIONNEL ============
_chat_router = APIRouter(prefix="/chat", tags=["Assistant"])


@_chat_router.post(
    "/ask",
    response_model=ChatAskResponse,
    status_code=status.HTTP_200_OK,
    summary="Orchestre la génération d'une réponse de l'assistant conversationnel",
)
async def chat_ask(
    request: ChatAskRequest,
    api_key: str = Depends(verify_api_key),
) -> ChatAskResponse:
    """
    Endpoint interne appelé par Django :
    - Récupère les données métier autorisées via les endpoints internes Django
    - Détecte les ambiguïtés (ex: plusieurs missions à titre similaire)
    - Construit un prompt anti-hallucination strict
    - Appelle le modèle Hugging Face déjà configuré et retourne sa réponse
    """
    return await orchestrate_chat(request)


router.include_router(_matching_router)
router.include_router(_chat_router)
