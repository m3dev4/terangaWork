import logging
from typing import Any

import httpx
from django.conf import settings

logger = logging.getLogger(__name__)


class ChatbotServiceUnavailableError(Exception):
    """Levée quand le microservice FastAPI /chat/ask est injoignable ou timeout."""
    pass


def call_fastapi_chat(payload: dict[str, Any]) -> dict[str, Any]:
    """
    Appel synchrone vers le microservice FastAPI : POST /chat/ask.

    Réutilise la même clé interne que le matching : FASTAPI_INTERNAL_API_KEY.
    La base URL est FASTAPI_MATCHING_URL (même microservice dans ce projet).
    """
    base_url = getattr(settings, "FASTAPI_MATCHING_URL", "http://localhost:8000").rstrip("/")
    api_key = getattr(settings, "FASTAPI_INTERNAL_API_KEY", "dev-secret-internal-key")
    endpoint = f"{base_url}/chat/ask"

    headers = {
        "X-Internal-API-Key": api_key,
        "Content-Type": "application/json",
    }

    timeout = 45.0

    try:
        with httpx.Client(timeout=timeout) as client:
            response = client.post(endpoint, json=payload, headers=headers)

        if response.status_code != 200:
            logger.error(
                f"Microservice FastAPI /chat/ask HTTP {response.status_code}: {response.text[:500]}"
            )
            raise ChatbotServiceUnavailableError(
                f"Réponse HTTP {response.status_code} du service d'assistant."
            )

        return response.json()

    except ChatbotServiceUnavailableError:
        raise
    except (httpx.RequestError, httpx.TimeoutException) as e:
        logger.error(
            f"Échec de connexion vers le microservice FastAPI ({endpoint}): {e}"
        )
        raise ChatbotServiceUnavailableError(
            "Impossible de contacter le service d'assistant conversationnel."
        )
