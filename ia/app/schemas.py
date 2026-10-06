from typing import Literal

from pydantic import BaseModel, Field


class CandidatSchema(BaseModel):
    id: int  # id de la Proposition, du Freelance ou de la Mission côté Django
    technologies: list[str] = Field(default_factory=list)
    service: str | None = ""
    annees_experience: int | float | None = None
    texte_libre: str | None = ""


class MatchingRequestSchema(BaseModel):
    type_matching: str = "candidatures"
    scoring_only: bool = False
    min_technology_score: float = Field(default=0.0, ge=0.0, le=1.0)
    contexte: str = ""  # description complète de la mission ou du profil freelance
    technologies: list[str] = Field(default_factory=list)  # technologies cibles (obligatoires)
    service: str | None = ""  # service cible (obligatoire)
    candidats: list[CandidatSchema] = Field(default_factory=list)
    top_n: int = 8


class ResultatCandidatSchema(BaseModel):
    candidat_id: int
    score: float
    score_technologies: float
    score_service: float
    score_experience: float | None = None
    justification_ia: str | None = None  # null si l'étage 2 a échoué ou n'a pas tourné


class MatchingResponseSchema(BaseModel):
    resultats: list[ResultatCandidatSchema]  # triés par pertinence finale
    etage_2_reussi: bool  # indique clairement au backend si le fallback a été utilisé
