import hmac

from fastapi import Header, HTTPException, status
from app.config import settings

CLES_INTERDITES = {"dev-secret-internal-key", "your-secret-internal-api-key"}


async def verify_api_key(
    x_internal_api_key: str | None = Header(None, alias="X-Internal-API-Key")
) -> str:
    """
    Dépendance FastAPI pour valider la clé API interne partagée.
    """
    attendue = settings.INTERNAL_API_KEY
    # Refus si la clé n'est pas configurée ou vaut l'ancienne valeur publique
    if (
        not attendue
        or attendue in CLES_INTERDITES
        or not x_internal_api_key
        or not hmac.compare_digest(x_internal_api_key.encode(), attendue.encode())
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clé API interne invalide ou manquante.",
        )
    return x_internal_api_key
