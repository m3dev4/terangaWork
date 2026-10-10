"""
Client Groq (API compatible OpenAI) — fournisseur de secours de l'assistant.

Utilisé uniquement quand l'inférence Hugging Face échoue, expire ou renvoie
une réponse vide. Aucune dépendance supplémentaire : appel HTTP via httpx.
"""

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


class GroqIndisponible(Exception):
    """Groq non configuré ou en erreur."""


async def appeler_groq(
    messages: list[dict[str, str]],
    max_tokens: int = 800,
    temperature: float = 0.2,
) -> str:
    if not settings.GROQ_API_KEY:
        raise GroqIndisponible("GROQ_API_KEY non configurée")

    try:
        async with httpx.AsyncClient(timeout=settings.GROQ_TIMEOUT) as client:
            response = await client.post(
                GROQ_URL,
                headers={
                    "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.GROQ_MODEL,
                    "messages": messages,
                    "max_tokens": max_tokens,
                    "temperature": temperature,
                },
            )
    except httpx.HTTPError as exc:
        raise GroqIndisponible(f"Erreur réseau Groq : {exc}") from exc

    if response.status_code != 200:
        raise GroqIndisponible(f"Groq HTTP {response.status_code} : {response.text[:300]}")

    try:
        return response.json()["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, ValueError) as exc:
        raise GroqIndisponible(f"Réponse Groq inattendue : {exc}") from exc
