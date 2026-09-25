import requests

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.permissions import BasePermission
from rest_framework.response import Response
from rest_framework import status

from User.models import UserRole


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

        response = requests.post(
            settings.N8N_DESCRIPTION_WEBHOOK_URL,
            json={
                "title": title,
            },
            timeout=60,
        )

        if not response.ok:
            return Response(
                {"detail": "La génération de la description a échoué."},
                status=status.HTTP_502_BAD_GATEWAY,
            )

        data = response.json()

        return Response(
            {
                "detail": "La description a été générée avec succès.",
                "description": data.get("description"),
            },
            status=status.HTTP_200_OK,
        )