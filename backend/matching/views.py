import logging
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from User.onboarding_views import IsOnboardingComplete
from freelance.models import Freelancee
from mission.models import Mission
from matching.permissions import IsAnnonceur, IsFreelance
from matching.services import (
    MatchingServiceUnavailableError,
    process_candidats_recommandes,
    process_missions_recommandees,
)

logger = logging.getLogger(__name__)


class CandidatsRecommandesView(APIView):
    """
    POST /api/matching/candidats-recommandes/<mission_id>/

    Réservé aux annonceurs sur leurs propres missions (onboarding completed).
    Recommande et classe les candidats (propositions) pour la mission via le microservice FastAPI.
    """

    permission_classes = [IsAuthenticated, IsOnboardingComplete, IsAnnonceur]

    def post(self, request, mission_id: int) -> Response:
        mission = (
            Mission.objects.filter(pk=mission_id)
            .select_related("annonceur", "annonceur__user", "service")
            .prefetch_related("technologies")
            .first()
        )

        if not mission:
            return Response(
                {"detail": "Mission non trouvée."},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Vérification stricte d'ownership
        if mission.annonceur.user != request.user:
            return Response(
                {"detail": "Vous n'êtes pas le propriétaire de cette mission."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            res = process_candidats_recommandes(mission)
            return Response(res, status=status.HTTP_200_OK)
        except MatchingServiceUnavailableError as e:
            logger.error(f"Service de matching indisponible (Mission #{mission_id}): {e}")
            return Response(
                {"detail": "Matching temporairement indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )


class MissionsRecommandeesView(APIView):
    """
    POST /api/matching/missions-recommandees/

    Réservé aux freelances (onboarding completed).
    Recommande et classe les missions disponibles adaptées au profil du freelance via le microservice FastAPI.
    """

    permission_classes = [IsAuthenticated, IsOnboardingComplete, IsFreelance]

    def post(self, request) -> Response:
        freelance = (
            Freelancee.objects.filter(user=request.user)
            .select_related("user", "service")
            .prefetch_related("technologies", "experiences")
            .first()
        )

        if not freelance:
            return Response(
                {"detail": "Profil freelance introuvable."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            res = process_missions_recommandees(freelance)
            return Response(res, status=status.HTTP_200_OK)
        except MatchingServiceUnavailableError as e:
            logger.error(f"Service de matching indisponible (Freelance #{freelance.id}): {e}")
            return Response(
                {"detail": "Matching temporairement indisponible."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
