import logging

from django.db.models import Count
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.generics import get_object_or_404

from User.models import User, UserRole
from freelance.models import Freelancee
from announcer.models import Announcer
from mission.models import Mission
from proposition.models import Proposition, PropositionStatus
from matching.services import (
    process_candidats_recommandes,
    MatchingServiceUnavailableError,
)

from .permissions import IsInternalService
from .data_serializers import (
    PropositionFreelanceSerializer,
    FreelanceProfilSerializer,
    AnnonceurMissionSerializer,
    PropositionCandidatSerializer,
)

logger = logging.getLogger(__name__)


def _extract_user(request):
    """
    Extrait le user_id des query params, vérifie existence ET cohérence de rôle.

    Retourne (user, error_response) : si error_response est non-None,
    c'est une Response d'erreur à retourner immédiatement.
    """
    try:
        user_id = int(request.query_params.get("user_id"))
    except (TypeError, ValueError):
        return None, Response(
            {"detail": "user_id est requis (entier)."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    user = User.objects.filter(pk=user_id).first()
    if not user:
        return None, Response(
            {"detail": "Utilisateur introuvable."},
            status=status.HTTP_404_NOT_FOUND,
        )
    return user, None


class FreelancePropositionsDataView(APIView):
    """GET /api/chat/data/freelance/propositions/?user_id=<int>"""

    authentication_classes = []  # Pas d'auth JWT, uniquement clé API interne
    permission_classes = [IsInternalService]

    def get(self, request) -> Response:
        user, err = _extract_user(request)
        if err is not None:
            return err
        if user.role != UserRole.FREELANCE:
            return Response(
                {
                    "detail": "Cet utilisateur n'a pas le rôle freelance.",
                    "access_denied_role": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        freelance = Freelancee.objects.filter(user=user).first()
        if not freelance:
            return Response({"propositions": []})

        qs = (
            Proposition.objects.filter(freelance=freelance)
            .select_related("mission")
            .prefetch_related("mission__service")
            .order_by("-created_at")
        )
        data = PropositionFreelanceSerializer(qs, many=True).data
        return Response({"propositions": data})


class FreelanceMissionsAccepteesDataView(APIView):
    """GET /api/chat/data/freelance/missions-acceptees/?user_id=<int>"""

    authentication_classes = []  # Pas d'auth JWT, uniquement clé API interne
    permission_classes = [IsInternalService]

    def get(self, request) -> Response:
        user, err = _extract_user(request)
        if err is not None:
            return err
        if user.role != UserRole.FREELANCE:
            return Response(
                {
                    "detail": "Cet utilisateur n'a pas le rôle freelance.",
                    "access_denied_role": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        freelance = Freelancee.objects.filter(user=user).first()
        if not freelance:
            return Response({"missions": []})

        qs = (
            Mission.objects.filter(
                propositions__freelance=freelance,
                propositions__proposition_status=PropositionStatus.ACCEPTED,
            )
            .prefetch_related("technologies")
            .annotate(count_candidatures=Count("propositions"))
            .order_by("-created_at")
            .distinct()
        )
        data = AnnonceurMissionSerializer(qs, many=True).data
        return Response({"missions": data})


class FreelanceProfilDataView(APIView):
    """GET /api/chat/data/freelance/profil/?user_id=<int>"""

    authentication_classes = []  # Pas d'auth JWT, uniquement clé API interne
    permission_classes = [IsInternalService]

    def get(self, request) -> Response:
        user, err = _extract_user(request)
        if err is not None:
            return err
        if user.role != UserRole.FREELANCE:
            return Response(
                {
                    "detail": "Cet utilisateur n'a pas le rôle freelance.",
                    "access_denied_role": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        freelance = (
            Freelancee.objects.filter(user=user)
            .prefetch_related("technologies", "experiences", "services")
            .first()
        )
        if not freelance:
            return Response({"profil": None})
        return Response({"profil": FreelanceProfilSerializer(freelance).data})


class AnnonceurMissionsDataView(APIView):
    """GET /api/chat/data/annonceur/missions/?user_id=<int>"""

    authentication_classes = []  # Pas d'auth JWT, uniquement clé API interne
    permission_classes = [IsInternalService]

    def get(self, request) -> Response:
        user, err = _extract_user(request)
        if err is not None:
            return err
        if user.role != UserRole.ANNONCEUR:
            return Response(
                {
                    "detail": "Cet utilisateur n'a pas le rôle annonceur.",
                    "access_denied_role": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        announcer = Announcer.objects.filter(user=user).first()
        if not announcer:
            return Response({"missions": []})

        qs = (
            Mission.objects.filter(annonceur=announcer)
            .prefetch_related("technologies")
            .annotate(count_candidatures=Count("propositions"))
            .order_by("-created_at")
        )
        data = AnnonceurMissionSerializer(qs, many=True).data
        return Response({"missions": data})


class AnnonceurMissionCandidaturesDataView(APIView):
    """GET /api/chat/data/annonceur/mission/<mission_id>/candidatures/?user_id=<int>"""

    authentication_classes = []  # Pas d'auth JWT, uniquement clé API interne
    permission_classes = [IsInternalService]

    def get(self, request, mission_id=None) -> Response:
        user, err = _extract_user(request)
        if err is not None:
            return err
        if user.role != UserRole.ANNONCEUR:
            return Response(
                {
                    "detail": "Cet utilisateur n'a pas le rôle annonceur.",
                    "access_denied_role": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        announcer = Announcer.objects.filter(user=user).first()
        mission = get_object_or_404(Mission, pk=mission_id)
        if not announcer or mission.annonceur_id != announcer.id:
            return Response(
                {"detail": "Cette mission ne vous appartient pas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        qs = (
            Proposition.objects.filter(mission=mission)
            .select_related("freelance", "freelance__user")
            .prefetch_related("freelance__technologies", "freelance__experiences", "freelance__services")
            .order_by("-created_at")
        )
        data = PropositionCandidatSerializer(qs, many=True).data
        return Response({"propositions": data})


class AnnonceurMissionRecommandationsDataView(APIView):
    """GET /api/chat/data/annonceur/mission/<mission_id>/recommandations/?user_id=<int>"""

    permission_classes = [IsInternalService]

    def get(self, request, mission_id=None) -> Response:
        user, err = _extract_user(request)
        if err is not None:
            return err
        if user.role != UserRole.ANNONCEUR:
            return Response(
                {
                    "detail": "Cet utilisateur n'a pas le rôle annonceur.",
                    "access_denied_role": True,
                },
                status=status.HTTP_403_FORBIDDEN,
            )
        announcer = Announcer.objects.filter(user=user).first()
        mission = (
            Mission.objects.filter(pk=mission_id)
            .select_related("annonceur", "annonceur__user")
            .prefetch_related("technologies", "service")
            .first()
        )
        if not mission:
            return Response(
                {"detail": "Mission introuvable."},
                status=status.HTTP_404_NOT_FOUND,
            )
        if not announcer or mission.annonceur_id != announcer.id:
            return Response(
                {"detail": "Cette mission ne vous appartient pas."},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            result = process_candidats_recommandes(mission)
        except MatchingServiceUnavailableError as e:
            logger.error(f"Recommandations indisponibles mission {mission_id}: {e}")
            return Response(
                {
                    "detail": "Le service de recommandations est temporairement indisponible.",
                    "resultats": [],
                    "etage_2_reussi": False,
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        return Response(result)
