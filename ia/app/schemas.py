from pydantic import BaseModel


class CandidatSchema(BaseModel):
    id: int  # id de la Proposition ou de la Mission côté Django
    technologies: list[str]
    service: str
    annees_experience: int | None = None
    texte_libre: str  # lettre de motivation + description, concaténés, pour l'étage 2


class MatchingRequestSchema(BaseModel):
    contexte: str  # description complète de la mission ou du profil freelance
    technologies: list[str]  # technologies cibles (obligatoires)
    service: str  # service cible (obligatoire)
    candidats: list[CandidatSchema]
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
