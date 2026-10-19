import hmac
from django.conf import settings
from rest_framework.permissions import BasePermission


class IsInternalService(BasePermission):
    """
    Permission réservée aux appels internes (FastAPI).

    Valide que le header X-Internal-API-Key correspond à
    FASTAPI_INTERNAL_API_KEY (la même clé partagée utilisée pour le matching).
    """

    message = "Accès réservé aux services internes."

    def has_permission(self, request, view) -> bool:
        incoming = request.headers.get("X-Internal-API-Key")
        expected = getattr(settings, "FASTAPI_INTERNAL_API_KEY", "")
        interdites = getattr(settings, "CLES_INTERNES_INTERDITES", set())
        if not expected or not incoming or expected in interdites:
            return False
        # Comparaison à temps constant (pas de fuite par mesure du temps de réponse)
        return hmac.compare_digest(incoming.encode(), expected.encode())
