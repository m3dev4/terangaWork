from typing import Literal, Optional
from pydantic import BaseModel, Field


class ChatHistoryItem(BaseModel):
    role: Literal["utilisateur", "assistant"]
    contenu: str


class ChatAskRequest(BaseModel):
    """Payload envoyé par Django au microservice FastAPI pour générer une réponse."""

    user_id: int
    user_role: Literal["freelance", "annonceur"]
    user_prenom: str = Field(default="Utilisateur", max_length=50)
    conversation_history: list[ChatHistoryItem] = Field(
        default_factory=list,
        description="Historique récent (10 derniers messages max).",
    )
    question: str = Field(..., min_length=1, max_length=2000)


class ChatAskResponse(BaseModel):
    """Réponse renvoyée par FastAPI au backend Django."""

    reponse: str = ""
    precision_demandee: Optional[str] = None
    donnees_utilisees: bool = False
    ambiguite_detectee: bool = False
    erreur: Optional[str] = None
    message_user_fr: Optional[str] = None
