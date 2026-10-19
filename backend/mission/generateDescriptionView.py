import logging
import requests

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework import status

from User.models import UserRole

logger = logging.getLogger(__name__)


class IsAnnonceur(BasePermission):

    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == UserRole.ANNONCEUR
        )


class GenerateDescriptionView(APIView):

    permission_classes = [IsAnnonceur]

    def post(self, request):

        title = request.data.get("title")

        if not title:
            return Response(
                {"detail": "Le titre de la mission est requis"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        webhook_url = getattr(settings, "N8N_DESCRIPTION_WEBHOOK_URL", "")
        if not webhook_url:
            logger.warning("N8N_DESCRIPTION_WEBHOOK_URL non configurée.")
            return Response(
                {"detail": "La génération automatique est indisponible pour le moment."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        try:
            response = requests.post(webhook_url, json={"title": title}, timeout=60)
        except requests.RequestException as exc:
            logger.error("Webhook n8n de génération injoignable : %s", exc)
            return Response(
                {"detail": "La génération de la description a échoué."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        if not response.ok:
            return Response(
                {"detail": "La génération de la description a échoué."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        try:
            data = response.json()
            if isinstance(data, list):  # n8n renvoie parfois [ {...} ]
                data = data[0] if data else {}
            description = (data or {}).get("description")
        except ValueError:
            description = None
        if not description:
            logger.error("Réponse n8n sans description exploitable (HTTP %s).", response.status_code)
            return Response(
                {"detail": "La génération de la description a échoué."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        return Response(
            {
                "detail": "La description a été générée avec succès.",
                "description": description,
            },
            status=status.HTTP_200_OK,
        )