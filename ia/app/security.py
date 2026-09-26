from fastapi import Header, HTTPException, status
from app.config import settings


async def verify_api_key(
    x_internal_api_key: str | None = Header(None, alias="X-Internal-API-Key")
) -> str:
    """
    Dépendance FastAPI pour valider la clé API interne partagée.
    """
    if not x_internal_api_key or x_internal_api_key != settings.INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Clé API interne invalide ou manquante.",
        )
    return x_internal_api_key
