import logging
from typing import Any

import httpx
from app.config import settings

logger = logging.getLogger(__name__)

_DJANGO_BASE = settings.DJANGO_BASE_URL.rstrip("/")
_HEADERS = {
    "X-Internal-API-Key": settings.DJANGO_INTERNAL_API_KEY,
    "Content-Type": "application/json",
}
_TIMEOUT = 15.0


async def _get(path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
    """Appel GET interne vers Django. Retourne {} ou [] vide en cas d'erreur."""
    url = f"{_DJANGO_BASE}{path}"
    try:
        async with httpx.AsyncClient(timeout=_TIMEOUT) as client:
            resp = await client.get(url, headers=_HEADERS, params=params or {})
        if resp.status_code == 403:
            logger.warning(f"Django a refusé l'accès sur {path}: {resp.text[:200]}")
            return {"access_denied_role": True, **resp.json()}
        if resp.status_code != 200:
            logger.error(f"Appel Django {path} HTTP {resp.status_code}: {resp.text[:300]}")
            return {}
        return resp.json()
    except (httpx.RequestError, httpx.TimeoutException) as exc:
        logger.error(f"Impossible de joindre Django sur {path}: {exc}")
        return {}


async def get_freelance_propositions(user_id: int) -> list[dict[str, Any]]:
    data = await _get("/chat/data/freelance/propositions/", params={"user_id": user_id})
    return data.get("propositions", [])


async def get_freelance_missions_acceptees(user_id: int) -> list[dict[str, Any]]:
    data = await _get("/chat/data/freelance/missions-acceptees/", params={"user_id": user_id})
    return data.get("missions", [])


async def get_freelance_profil(user_id: int) -> dict[str, Any] | None:
    data = await _get("/chat/data/freelance/profil/", params={"user_id": user_id})
    return data.get("profil")


async def get_annonceur_missions(user_id: int) -> list[dict[str, Any]]:
    data = await _get("/chat/data/annonceur/missions/", params={"user_id": user_id})
    return data.get("missions", [])


async def get_annonceur_mission_candidatures(
    user_id: int, mission_id: int
) -> list[dict[str, Any]]:
    data = await _get(
        f"/chat/data/annonceur/mission/{mission_id}/candidatures/",
        params={"user_id": user_id},
    )
    return data.get("propositions", [])


async def get_annonceur_mission_recommandations(
    user_id: int, mission_id: int
) -> dict[str, Any]:
    data = await _get(
        f"/chat/data/annonceur/mission/{mission_id}/recommandations/",
        params={"user_id": user_id},
    )
    return data or {"resultats": [], "etage_2_reussi": False}
